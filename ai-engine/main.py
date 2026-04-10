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
from risk_logic import calibrate_confidence, infer_risk_level

from schemas import (
    GpaRoadmapRequest,
    GpaRoadmapResponse,
    PredictRequest,
    PredictResponse,
    RetakeRoadmapRequest,
    RetakeRoadmapResponse,
    RetakeSubject,
    SemesterPlanRequest,
    SemesterPlanResponse,
    SubjectPlan,
    SubjectResult,
)


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
SPECIAL_FEATURES = {"diem_hk_truoc", "so_buoi_vang", "hanh_kiem"}


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
    predicted_rank = _safe_label(predicted_class)

    weak_subjects = [
        code
        for code, score in request_data.scores.items()
        if float(score) < 5.0
    ]

    subject_feature_count = len([name for name in feature_names if name not in SPECIAL_FEATURES])
    provided_subject_count = len(
        [
            code
            for code in request_data.scores.keys()
            if code in feature_names and code not in SPECIAL_FEATURES
        ],
    )

    confidence = calibrate_confidence(
        predicted_rank=predicted_rank,
        probabilities=list(probabilities),
        provided_subject_count=provided_subject_count,
        total_subject_feature_count=subject_feature_count,
        so_buoi_vang=request_data.so_buoi_vang,
        weak_subject_count=len(weak_subjects),
    )

    risk_level = infer_risk_level(
        predicted_rank=predicted_rank,
        confidence=confidence,
        so_buoi_vang=request_data.so_buoi_vang,
        weak_subject_count=len(weak_subjects),
    )

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


def _target_label(target_gpa: float) -> str:
    if target_gpa >= 3.6:
        return "Xuat sac"
    return "Gioi"


def _next_semester_year(semester: int, year: int) -> tuple[int, int]:
    if semester >= 3:
        return 1, year + 1
    return semester + 1, year


def _subject_priority(subject: SubjectResult) -> str:
    if subject.isRequired and subject.credits >= 3:
        return "critical"
    if subject.isRequired or subject.credits >= 3:
        return "high"
    return "normal"


def _target_grade(required_remaining: float, priority: str) -> tuple[str, float]:
    if required_remaining >= 3.8:
        return "A", 4.0

    if required_remaining >= 3.2:
        if priority in {"critical", "high"}:
            return "A", 4.0
        return "B", 3.0

    if required_remaining >= 2.5:
        if priority == "critical":
            return "A", 4.0
        return "B", 3.0

    return "B", 3.0


def _build_subject_reason(subject: SubjectResult, priority: str, target_grade: str) -> str:
    if priority == "critical":
        return (
            f"Mon cot loi ({subject.credits} tin chi), can dat {target_grade} de keo GPA tich luy"
        )

    if priority == "high":
        return f"Mon quan trong, nen dat toi thieu {target_grade} de giu tien do GPA"

    return f"Mon bo tro, muc tieu {target_grade} la phu hop de can bang tai"


def _build_gpa_roadmap(request_data: GpaRoadmapRequest) -> GpaRoadmapResponse:
    remaining = request_data.remainingSubjects
    remaining_credits = sum(item.credits for item in remaining)
    total_future_credits = request_data.totalCreditsEarned + remaining_credits

    if remaining_credits <= 0:
        return GpaRoadmapResponse(
            studentCode=request_data.studentCode,
            currentGpa=round(request_data.currentGpaAccumulated, 2),
            targetGpa=round(request_data.targetGpa, 2),
            targetLabel=_target_label(request_data.targetGpa),
            isAchievable=request_data.currentGpaAccumulated >= request_data.targetGpa,
            requiredGpaRemaining=0,
            subjectPlans=[],
            summary="Ban da hoan thanh toan bo mon hoc trong chuong trinh khung.",
            semesterBreakdown=[],
        )

    numerator = (
        request_data.targetGpa * total_future_credits
        - request_data.currentGpaAccumulated * request_data.totalCreditsEarned
    )
    required_remaining = numerator / remaining_credits
    is_achievable = required_remaining <= 4.0

    priority_order = {"critical": 0, "high": 1, "normal": 2}
    sorted_remaining = sorted(
        remaining,
        key=lambda item: (priority_order[_subject_priority(item)], -item.credits, item.subjectCode),
    )

    subject_plans: list[SubjectPlan] = []
    semester_map: dict[str, dict[str, Any]] = {}

    semester = 1
    year = 1
    subjects_in_current_slot = 0
    max_subjects_per_semester = 6

    for subject in sorted_remaining:
        if subjects_in_current_slot >= max_subjects_per_semester:
            semester, year = _next_semester_year(semester, year)
            subjects_in_current_slot = 0

        priority = _subject_priority(subject)
        target_grade, target_gpa4 = _target_grade(required_remaining, priority)

        plan = SubjectPlan(
            subjectCode=subject.subjectCode,
            subjectName=subject.subjectName,
            credits=subject.credits,
            targetGrade=target_grade,
            targetGpa4=target_gpa4,
            priority=priority,
            reason=_build_subject_reason(subject, priority, target_grade),
            semester=semester,
            year=year,
        )
        subject_plans.append(plan)

        key = f"year_{year}_semester_{semester}"
        if key not in semester_map:
            semester_map[key] = {
                "year": year,
                "semester": semester,
                "subjects": [],
                "totalCredits": 0,
            }
        semester_map[key]["subjects"].append(
            {
                "subjectCode": subject.subjectCode,
                "subjectName": subject.subjectName,
                "credits": subject.credits,
                "priority": priority,
                "targetGrade": target_grade,
            },
        )
        semester_map[key]["totalCredits"] += subject.credits

        subjects_in_current_slot += 1

    focus_subjects = ", ".join(item.subjectName for item in sorted_remaining[:3])
    summary = (
        f"De dat GPA {request_data.targetGpa:.2f} ({_target_label(request_data.targetGpa)}), "
        f"ban can dat trung binh {required_remaining:.2f} GPA o {len(sorted_remaining)} mon con lai. "
        f"Can uu tien cac mon: {focus_subjects}."
    )

    return GpaRoadmapResponse(
        studentCode=request_data.studentCode,
        currentGpa=round(request_data.currentGpaAccumulated, 2),
        targetGpa=round(request_data.targetGpa, 2),
        targetLabel=_target_label(request_data.targetGpa),
        isAchievable=is_achievable,
        requiredGpaRemaining=round(required_remaining, 2),
        subjectPlans=subject_plans,
        summary=summary,
        semesterBreakdown=list(semester_map.values()),
    )


def _build_retake_item(
    subject: SubjectResult,
    urgency: str,
    suggested_semester: int,
) -> RetakeSubject:
    target_grade = "B" if urgency == "urgent" else "A"
    reason = (
        "Mon F anh huong manh den GPA, can hoc lai ngay"
        if urgency == "urgent"
        else "Mon C nen cai thien de tang GPA tich luy"
    )

    return RetakeSubject(
        subjectCode=subject.subjectCode,
        subjectName=subject.subjectName,
        credits=subject.credits,
        currentGrade=subject.letterGrade or ("F" if urgency == "urgent" else "C"),
        currentGpa4=subject.gpa4,
        targetGrade=target_grade,
        urgency=urgency,
        prerequisiteFor=[],
        suggestedSemester=suggested_semester,
        reason=reason,
    )


def _build_retake_roadmap(request_data: RetakeRoadmapRequest) -> RetakeRoadmapResponse:
    failed_sorted = sorted(request_data.failedSubjects, key=lambda item: (-item.credits, item.subjectCode))
    weak_sorted = sorted(request_data.weakSubjects, key=lambda item: (-item.credits, item.subjectCode))

    urgent_retakes: list[RetakeSubject] = []
    recommended_retakes: list[RetakeSubject] = []

    semester = request_data.currentSemester
    year = request_data.currentYear

    for subject in failed_sorted:
        semester, year = _next_semester_year(semester, year)
        urgent_retakes.append(_build_retake_item(subject, "urgent", semester))

    for subject in weak_sorted:
        semester, year = _next_semester_year(semester, year)
        recommended_retakes.append(_build_retake_item(subject, "recommended", semester))

    all_items = [
        {"item": item, "urgency": "urgent"} for item in urgent_retakes
    ] + [
        {"item": item, "urgency": "recommended"} for item in recommended_retakes
    ]

    retake_plan: list[dict[str, Any]] = []
    slot_semester, slot_year = _next_semester_year(request_data.currentSemester, request_data.currentYear)
    index = 0
    while index < len(all_items):
        chunk = all_items[index:index + 2]
        retake_plan.append(
            {
                "year": slot_year,
                "semester": slot_semester,
                "subjects": [
                    {
                        "subjectCode": part["item"].subjectCode,
                        "subjectName": part["item"].subjectName,
                        "urgency": part["urgency"],
                        "targetGrade": part["item"].targetGrade,
                    }
                    for part in chunk
                ],
            },
        )
        index += 2
        slot_semester, slot_year = _next_semester_year(slot_semester, slot_year)

    note = (
        f"Can uu tien hoc lai {len(urgent_retakes)} mon F truoc, "
        f"sau do cai thien {len(recommended_retakes)} mon C de tang GPA."
    )

    return RetakeRoadmapResponse(
        studentCode=request_data.studentCode,
        urgentRetakes=urgent_retakes,
        recommendedRetakes=recommended_retakes,
        retakePlan=retake_plan,
        note=note,
    )


def _build_semester_plan(request_data: SemesterPlanRequest) -> SemesterPlanResponse:
    subjects = sorted(
        request_data.registeredSubjects,
        key=lambda item: (0 if item.isRequired else 1, -item.credits, item.subjectCode),
    )

    gap = request_data.targetGpa - request_data.currentGpaAccumulated
    subject_targets: list[dict[str, Any]] = []

    total_weighted = 0.0
    total_credits = 0

    for subject in subjects:
        if gap >= 0.6:
            target_grade = "A" if (subject.isRequired or subject.credits >= 3) else "B"
        elif gap >= 0.2:
            target_grade = "A" if subject.isRequired and subject.credits >= 3 else "B"
        else:
            target_grade = "B"

        target_gpa4 = 4.0 if target_grade == "A" else 3.0

        reason = (
            "Mon cot loi, can diem cao de bao toan muc tieu GPA"
            if target_grade == "A"
            else "Dat B la du de giu tien do va tranh qua tai"
        )

        subject_targets.append(
            {
                "subjectCode": subject.subjectCode,
                "subjectName": subject.subjectName,
                "credits": subject.credits,
                "targetGrade": target_grade,
                "targetGpa4": target_gpa4,
                "reason": reason,
            },
        )

        total_weighted += target_gpa4 * subject.credits
        total_credits += subject.credits

    predicted_semester_gpa = total_weighted / total_credits if total_credits else 0

    warnings: list[str] = []
    weak_names = [item.subjectName for item in request_data.weakSubjects[:3]]
    if weak_names:
        warnings.append("Can theo sat cac mon yeu tu ky truoc: " + ", ".join(weak_names))

    if gap > 0.6:
        warnings.append("Muc tieu GPA cao, can uu tien nhip hoc deu va giu diem qua trinh")

    summary = (
        f"Ky nay can duy tri GPA trung binh khoang {predicted_semester_gpa:.2f}. "
        f"Tap trung mon trong diem cao de huong den muc tieu {request_data.targetGpa:.2f}."
    )

    return SemesterPlanResponse(
        studentCode=request_data.studentCode,
        currentGpa=round(request_data.currentGpaAccumulated, 2),
        targetGpa=round(request_data.targetGpa, 2),
        predictedSemesterGpa=round(predicted_semester_gpa, 2),
        requiredAverage=round(max(request_data.targetGpa, 0), 2),
        subjectTargets=subject_targets,
        warnings=warnings,
        summary=summary,
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


@app.post("/gpa-roadmap", response_model=GpaRoadmapResponse)
def gpa_roadmap(request_data: GpaRoadmapRequest) -> GpaRoadmapResponse:
    return _build_gpa_roadmap(request_data)


@app.post("/retake-roadmap", response_model=RetakeRoadmapResponse)
def retake_roadmap(request_data: RetakeRoadmapRequest) -> RetakeRoadmapResponse:
    return _build_retake_roadmap(request_data)


@app.post("/semester-plan", response_model=SemesterPlanResponse)
def semester_plan(request_data: SemesterPlanRequest) -> SemesterPlanResponse:
    return _build_semester_plan(request_data)


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
