import os
import pickle
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

from schemas import PredictRequest, PredictResponse


BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
BACKEND_ENV_PATH = BASE_DIR.parent / "backend" / ".env"
LOCAL_ENV_PATH = BASE_DIR / ".env"

MODEL_FILE = MODELS_DIR / "model.pkl"
FEATURE_NAMES_FILE = MODELS_DIR / "feature_names.pkl"
LABEL_ENCODER_FILE = MODELS_DIR / "label_encoder.pkl"

model: Any = None
feature_names: list[str] = []
label_encoder: dict[Any, str] = {}


def _load_env() -> None:
    load_dotenv(dotenv_path=LOCAL_ENV_PATH, override=False)
    load_dotenv(dotenv_path=BACKEND_ENV_PATH, override=False)


def _db_name_from_uri(mongo_uri: str) -> str:
    parsed = urlparse(mongo_uri)
    db_name = parsed.path.lstrip("/").split("?")[0]
    if not db_name:
        raise RuntimeError(
            "MONGO_URI chua co ten database, vi du: mongodb+srv://.../student_ai_db",
        )
    return db_name


def _load_artifacts() -> bool:
    global model
    global feature_names
    global label_encoder

    if not MODEL_FILE.exists() or not FEATURE_NAMES_FILE.exists() or not LABEL_ENCODER_FILE.exists():
        print("Model artifacts chua day du, vui long train.py truoc khi predict")
        model = None
        feature_names = []
        label_encoder = {}
        return False

    with MODEL_FILE.open("rb") as file:
        model = pickle.load(file)

    with FEATURE_NAMES_FILE.open("rb") as file:
        loaded_feature_names = pickle.load(file)

    with LABEL_ENCODER_FILE.open("rb") as file:
        loaded_label_encoder = pickle.load(file)

    if not isinstance(loaded_feature_names, list):
        raise RuntimeError("feature_names.pkl khong hop le")

    if not isinstance(loaded_label_encoder, dict):
        raise RuntimeError("label_encoder.pkl khong hop le")

    feature_names = [str(item) for item in loaded_feature_names]
    label_encoder = loaded_label_encoder

    print(f"Model loaded. Features ({len(feature_names)}): {feature_names}")
    return True


def _safe_label(predicted_id: Any) -> str:
    if predicted_id in label_encoder:
        return str(label_encoder[predicted_id])

    int_key = int(predicted_id)
    if int_key in label_encoder:
        return str(label_encoder[int_key])

    str_key = str(int_key)
    if str_key in label_encoder:
        return str(label_encoder[str_key])

    raise RuntimeError(f"Khong tim thay label cho class id: {predicted_id}")


def _build_input_vector(request_data: PredictRequest) -> np.ndarray:
    valid_scores = [
        float(score)
        for score in request_data.scores.values()
        if score is not None
    ]

    if valid_scores:
        fallback_subject_score = float(np.mean(valid_scores))
    else:
        fallback_subject_score = float(request_data.diem_hk_truoc)

    values: list[float] = []

    for feature in feature_names:
        if feature == "diem_hk_truoc":
            values.append(float(request_data.diem_hk_truoc))
        elif feature == "so_buoi_vang":
            values.append(float(request_data.so_buoi_vang))
        elif feature == "hanh_kiem":
            values.append(float(request_data.hanh_kiem))
        else:
            values.append(float(request_data.scores.get(feature, fallback_subject_score)))

    return np.array(values, dtype=np.float64).reshape(1, -1)


def _build_suggestions(weak_subjects: list[str], so_buoi_vang: int, risk_level: str) -> list[str]:
    suggestions: list[str] = []

    if weak_subjects:
        suggestions.append(
            "Can tap trung phu dao cac mon yeu: " + ", ".join(weak_subjects),
        )
        suggestions.append("De xuat lap ke hoach on tap theo tung mon moi ngay")
    else:
        suggestions.append("Nen duy tri nhip hoc on dinh va tiep tuc luyen de")

    if so_buoi_vang >= 8:
        suggestions.append("So buoi vang cao, can tang ty le chuyen can ngay")
    elif so_buoi_vang >= 4:
        suggestions.append("Can theo doi chuyen can de tranh anh huong ket qua")

    if risk_level == "high":
        suggestions.append("Can can thiep som voi GVCN va phu huynh")
    elif risk_level == "medium":
        suggestions.append("Nen tang cuong bai tap va kiem tra dinh ky")

    if not suggestions:
        suggestions.append("Tiep tuc duy tri tien do hoc tap hien tai")

    return suggestions[:5]


def _build_analysis(
    predicted_rank: str,
    confidence: float,
    weak_subjects: list[str],
    so_buoi_vang: int,
    risk_level: str,
) -> str:
    sentence_1 = (
        f"AI du doan hoc luc: {predicted_rank} voi do tin cay {confidence:.2f}%"
    )

    if weak_subjects:
        sentence_2 = (
            "Cac mon dang yeu gom " + ", ".join(weak_subjects) + ", can uu tien bo sung"
        )
    else:
        sentence_2 = "Chua ghi nhan mon yeu ro rang trong bo diem dau vao"

    sentence_3 = (
        f"So buoi vang hien tai la {so_buoi_vang}, muc rui ro tong the o nguong {risk_level}"
    )

    return ". ".join([sentence_1, sentence_2, sentence_3]) + "."


def _predict_single(request_data: PredictRequest) -> PredictResponse:
    if model is None or not feature_names:
        raise HTTPException(
            status_code=503,
            detail="Model chua duoc load. Hay train va khoi dong lai FastAPI",
        )

    input_vector = _build_input_vector(request_data)

    predicted_class = model.predict(input_vector)[0]
    probabilities = model.predict_proba(input_vector)[0]

    confidence = float(np.max(probabilities) * 100)
    predicted_rank = _safe_label(predicted_class)

    if confidence < 60:
        risk_level = "high"
    elif confidence < 75:
        risk_level = "medium"
    else:
        risk_level = "low"

    weak_subjects = [
        code
        for code, score in request_data.scores.items()
        if float(score) < 5.0
    ]

    suggestions = _build_suggestions(
        weak_subjects=weak_subjects,
        so_buoi_vang=request_data.so_buoi_vang,
        risk_level=risk_level,
    )

    analysis = _build_analysis(
        predicted_rank=predicted_rank,
        confidence=confidence,
        weak_subjects=weak_subjects,
        so_buoi_vang=request_data.so_buoi_vang,
        risk_level=risk_level,
    )

    return PredictResponse(
        predicted_rank=predicted_rank,
        confidence=round(confidence, 2),
        risk_level=risk_level,
        weak_subjects=weak_subjects,
        suggestions=suggestions,
        analysis=analysis,
    )


def _load_subject_codes_from_db() -> list[str]:
    _load_env()
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError("Khong tim thay MONGO_URI trong .env")

    db_name = _db_name_from_uri(mongo_uri)
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=8000)

    try:
        subjects = list(
            client[db_name]["subjects"]
            .find({"isActive": True}, {"_id": 0, "code": 1})
            .sort("code", 1),
        )
        return [str(item.get("code", "")).strip().lower() for item in subjects if item.get("code")]
    finally:
        client.close()


app = FastAPI(title="Student AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    _load_artifacts()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_loaded": model is not None and len(feature_names) > 0,
        "feature_count": len(feature_names),
        "features": feature_names,
    }


@app.post("/predict", response_model=PredictResponse)
def predict(request_data: PredictRequest) -> PredictResponse:
    return _predict_single(request_data)


@app.post("/predict-batch", response_model=list[PredictResponse])
def predict_batch(request_list: list[PredictRequest]) -> list[PredictResponse]:
    if len(request_list) == 0:
        return []

    return [_predict_single(item) for item in request_list]


@app.get("/retrain-required")
def retrain_required() -> dict[str, Any]:
    try:
        db_subject_codes = _load_subject_codes_from_db()

        model_subject_codes = [
            item
            for item in feature_names
            if item not in {"diem_hk_truoc", "so_buoi_vang", "hanh_kiem"}
        ]

        if not feature_names:
            return {
                "needs_retrain": True,
                "reason": "Model chua duoc load hoac chua co feature_names.pkl",
            }

        if sorted(model_subject_codes) != sorted(db_subject_codes):
            return {
                "needs_retrain": True,
                "reason": "Danh sach mon trong model khong trung voi mon active trong DB",
            }

        return {
            "needs_retrain": False,
            "reason": "Model dang dong bo voi danh sach mon hien tai",
        }
    except Exception as error:
        return {
            "needs_retrain": True,
            "reason": f"Khong the kiem tra retrain-required: {error}",
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
