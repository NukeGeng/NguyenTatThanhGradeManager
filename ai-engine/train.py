import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split

from risk_logic import has_risk_paradox, infer_risk_level


LABEL_TO_ID = {
    "Yếu": 0,
    "Trung Bình": 1,
    "Khá": 2,
    "Giỏi": 3,
}

ID_TO_LABEL = {value: key for key, value in LABEL_TO_ID.items()}
SPECIAL_FEATURES = ["diem_hk_truoc", "so_buoi_vang", "hanh_kiem"]


def load_feature_names(file_path: Path) -> list[str]:
    if not file_path.exists():
        raise RuntimeError(f"Khong tim thay file feature: {file_path}")

    raw_data = json.loads(file_path.read_text(encoding="utf-8"))
    if not isinstance(raw_data, list) or len(raw_data) == 0:
        raise RuntimeError("subject_codes.json phai la list feature khong rong")

    feature_names = []
    for item in raw_data:
        if not isinstance(item, str) or not item.strip():
            raise RuntimeError("subject_codes.json co feature khong hop le")
        feature_names.append(item.strip())

    if len(feature_names) != len(set(feature_names)):
        raise RuntimeError("subject_codes.json co feature bi trung")

    return feature_names


def validate_dataset(df: pd.DataFrame, feature_names: list[str]) -> None:
    missing_columns = [col for col in feature_names if col not in df.columns]
    if missing_columns:
        raise RuntimeError(f"Thieu cot feature trong students.csv: {missing_columns}")

    if "ket_qua" not in df.columns:
        raise RuntimeError("students.csv thieu cot ket_qua")


def build_features(df: pd.DataFrame, feature_names: list[str]) -> pd.DataFrame:
    X = df[feature_names].copy()

    for feature in feature_names:
        X[feature] = pd.to_numeric(X[feature], errors="coerce")

    subject_features = [feature for feature in feature_names if feature not in SPECIAL_FEATURES]

    if subject_features:
        row_means = X[subject_features].mean(axis=1)
        for feature in subject_features:
            feature_median = X[feature].median(skipna=True)
            if pd.isna(feature_median):
                feature_median = 5.0

            X[feature] = X[feature].fillna(row_means)
            X[feature] = X[feature].fillna(feature_median)
            X[feature] = X[feature].clip(lower=0, upper=10)
    else:
        row_means = pd.Series(np.full(shape=(len(X),), fill_value=5.0), index=X.index)

    if "diem_hk_truoc" in X.columns:
        X["diem_hk_truoc"] = X["diem_hk_truoc"].fillna(row_means)
        X["diem_hk_truoc"] = X["diem_hk_truoc"].fillna(5.0)
        X["diem_hk_truoc"] = X["diem_hk_truoc"].clip(lower=0, upper=10)

    if "so_buoi_vang" in X.columns:
        X["so_buoi_vang"] = X["so_buoi_vang"].fillna(0)
        X["so_buoi_vang"] = X["so_buoi_vang"].clip(lower=0, upper=20)

    if "hanh_kiem" in X.columns:
        X["hanh_kiem"] = X["hanh_kiem"].fillna(2)
        X["hanh_kiem"] = X["hanh_kiem"].clip(lower=0, upper=3)

    return X


def validate_business_consistency(
    X_eval: pd.DataFrame,
    predicted_label_ids: np.ndarray,
    probabilities: np.ndarray,
    feature_names: list[str],
) -> None:
    subject_features = [feature for feature in feature_names if feature not in SPECIAL_FEATURES]
    paradox_examples: list[str] = []

    for row_index in range(len(X_eval)):
        predicted_id = int(predicted_label_ids[row_index])
        predicted_rank = ID_TO_LABEL.get(predicted_id)
        if not predicted_rank:
            continue

        confidence = float(np.max(probabilities[row_index]) * 100)
        so_buoi_vang = int(round(float(X_eval.iloc[row_index]["so_buoi_vang"]))) if "so_buoi_vang" in X_eval.columns else 0
        weak_subject_count = 0
        if subject_features:
            weak_subject_count = int((X_eval.iloc[row_index][subject_features] < 5).sum())

        risk_level = infer_risk_level(
            predicted_rank=predicted_rank,
            confidence=confidence,
            so_buoi_vang=so_buoi_vang,
            weak_subject_count=weak_subject_count,
        )

        if has_risk_paradox(predicted_rank, risk_level):
            paradox_examples.append(
                f"idx={row_index} rank={predicted_rank} confidence={confidence:.2f} risk={risk_level}",
            )

    if paradox_examples:
        preview = "\n".join(paradox_examples[:10])
        raise RuntimeError(
            "Kiem tra business rule that bai: phat hien nghich ly rank/risk\n" + preview,
        )


def main() -> None:
    try:
        base_dir = Path(__file__).resolve().parent
        data_dir = base_dir / "data"
        models_dir = base_dir / "models"
        models_dir.mkdir(parents=True, exist_ok=True)

        data_file = data_dir / "students.csv"
        feature_file = data_dir / "subject_codes.json"

        if not data_file.exists():
            raise RuntimeError(f"Khong tim thay file du lieu: {data_file}")

        feature_names = load_feature_names(feature_file)
        df = pd.read_csv(data_file)
        validate_dataset(df, feature_names)

        y_raw = df["ket_qua"].astype(str).str.strip()
        unknown_labels = sorted(set(y_raw.unique()) - set(LABEL_TO_ID.keys()))
        if unknown_labels:
            raise RuntimeError(f"Phat hien label khong hop le: {unknown_labels}")

        X = build_features(df, feature_names)
        y = y_raw.map(LABEL_TO_ID)

        label_counts = y.value_counts().sort_index()
        print("Label distribution in training data:")
        for label_id, count in label_counts.items():
            print(f"- {ID_TO_LABEL.get(label_id, label_id)}: {count}")

        if len(label_counts) < 2:
            raise RuntimeError(
                "Du lieu train chi co 1 nhan. Can bo sung du lieu diem that de train model phan loai.",
            )

        can_stratify = bool((label_counts >= 2).all())

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            stratify=y if can_stratify else None,
            random_state=42,
        )

        model = RandomForestClassifier(
            n_estimators=400,
            max_depth=16,
            min_samples_leaf=2,
            class_weight="balanced_subsample",
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        macro_f1 = f1_score(y_test, y_pred, average="macro")

        present_labels = sorted(y.unique())
        target_names = [ID_TO_LABEL[label_id] for label_id in present_labels]

        print(f"Accuracy: {accuracy:.4f}")
        print(f"Macro F1: {macro_f1:.4f}")
        print("\nClassification Report:")
        print(
            classification_report(
                y_test,
                y_pred,
                labels=present_labels,
                target_names=target_names,
                digits=4,
                zero_division=0,
            ),
        )

        matrix = confusion_matrix(y_test, y_pred, labels=present_labels)
        matrix_df = pd.DataFrame(matrix, index=target_names, columns=target_names)
        print("Confusion Matrix:")
        print(matrix_df.to_string())

        validate_business_consistency(
            X_eval=X_test.reset_index(drop=True),
            predicted_label_ids=np.array(y_pred),
            probabilities=np.array(y_proba),
            feature_names=feature_names,
        )
        print("Business consistency check: PASS")

        print("Feature Importances:")
        importances = list(zip(feature_names, model.feature_importances_))
        importances.sort(key=lambda item: item[1], reverse=True)
        for feature, value in importances:
            print(f"- {feature}: {value:.6f}")

        model_file = models_dir / "model.pkl"
        feature_names_file = models_dir / "feature_names.pkl"
        label_encoder_file = models_dir / "label_encoder.pkl"

        with model_file.open("wb") as file:
            pickle.dump(model, file)

        with feature_names_file.open("wb") as file:
            pickle.dump(feature_names, file)

        with label_encoder_file.open("wb") as file:
            pickle.dump(ID_TO_LABEL, file)

        print("\n[DONE] Retrain xong. Khoi dong lai FastAPI de load model moi.")
        print(f"Features ({len(feature_names)}): {feature_names}")
    except Exception as error:
        raise RuntimeError(f"Train model that bai: {error}") from error


if __name__ == "__main__":
    main()
