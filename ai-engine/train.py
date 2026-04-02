import json
import pickle
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split


LABEL_TO_ID = {
    "Yếu": 0,
    "Trung Bình": 1,
    "Khá": 2,
    "Giỏi": 3,
}

ID_TO_LABEL = {value: key for key, value in LABEL_TO_ID.items()}


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

        X = df[feature_names]
        y = y_raw.map(LABEL_TO_ID)

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            stratify=y,
            random_state=42,
        )

        model = RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            random_state=42,
        )
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)

        print(f"Accuracy: {accuracy:.4f}")
        print("\nClassification Report:")
        print(
            classification_report(
                y_test,
                y_pred,
                labels=[0, 1, 2, 3],
                target_names=[
                    ID_TO_LABEL[0],
                    ID_TO_LABEL[1],
                    ID_TO_LABEL[2],
                    ID_TO_LABEL[3],
                ],
                digits=4,
                zero_division=0,
            ),
        )

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
