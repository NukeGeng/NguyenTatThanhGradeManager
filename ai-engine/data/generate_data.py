import json
import os
from pathlib import Path
import random
from urllib.parse import urlparse

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient


NUM_STUDENTS = 1000
NOISE_RATE = 0.10
RANDOM_SEED = 42

# Thứ tự mức học lực để áp noise đổi nhãn 1 bậc.
LABEL_ORDER = ["Yếu", "Trung Bình", "Khá", "Giỏi"]


def classify_result(tb_ky_nay: float, so_buoi_vang: int, hanh_kiem: int) -> str:
    if tb_ky_nay >= 8.0 and so_buoi_vang <= 3 and hanh_kiem >= 2:
        return "Giỏi"
    if tb_ky_nay >= 6.5 and so_buoi_vang <= 7 and hanh_kiem >= 1:
        return "Khá"
    if tb_ky_nay >= 5.0 and so_buoi_vang <= 12:
        return "Trung Bình"
    return "Yếu"


def apply_noise(label: str, rng: random.Random) -> str:
    current_index = LABEL_ORDER.index(label)

    candidate_steps = []
    if current_index - 1 >= 0:
        candidate_steps.append(-1)
    if current_index + 1 < len(LABEL_ORDER):
        candidate_steps.append(1)

    step = rng.choice(candidate_steps)
    return LABEL_ORDER[current_index + step]


def _get_database_name_from_uri(mongo_uri: str) -> str:
    parsed = urlparse(mongo_uri)
    db_name = parsed.path.lstrip("/").split("?")[0]
    if not db_name:
        raise RuntimeError(
            "MONGO_URI chưa chỉ rõ database name, ví dụ: mongodb+srv://.../student_ai_db",
        )
    return db_name


def load_active_subjects() -> list[dict[str, float | str]]:
    env_path = Path(__file__).resolve().parents[2] / "backend" / ".env"
    load_dotenv(dotenv_path=env_path)

    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError(f"Không tìm thấy MONGO_URI trong {env_path}")

    client: MongoClient | None = None
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
        database_name = _get_database_name_from_uri(mongo_uri)
        database = client[database_name]

        raw_subjects = list(
            database["subjects"]
            .find(
                {"isActive": True},
                {"_id": 0, "code": 1, "name": 1, "coefficient": 1, "credits": 1},
            )
            .sort("code", 1),
        )

        subjects: list[dict[str, float | str]] = []
        for subject in raw_subjects:
            code = str(subject.get("code") or "").strip().lower()
            name = str(subject.get("name") or "").strip()
            coefficient_raw = subject.get("coefficient")
            credits_raw = subject.get("credits")

            if not code or not name:
                continue

            coefficient = coefficient_raw if coefficient_raw is not None else credits_raw
            coefficient = float(coefficient or 1)
            if coefficient <= 0:
                coefficient = 1.0

            subjects.append({"code": code, "name": name, "coefficient": coefficient})

        if not subjects:
            raise RuntimeError("Không có môn học active trong collection subjects")

        return subjects
    except Exception as error:
        raise RuntimeError(f"Không thể kết nối MongoDB hoặc đọc môn học: {error}") from error
    finally:
        if client:
            client.close()


def main() -> None:
    try:
        rng = random.Random(RANDOM_SEED)
        np.random.seed(RANDOM_SEED)

        subjects = load_active_subjects()
        subject_codes = [str(subject["code"]) for subject in subjects]
        coefficients = np.array(
            [float(subject["coefficient"]) for subject in subjects],
            dtype=np.float64,
        )

        print("Danh sach mon hoc doc tu DB:")
        for subject in subjects:
            print(
                f"- {subject['code']}: {subject['name']} (he so={subject['coefficient']})",
            )

        if len(subject_codes) < 3:
            print("[CANH BAO] So mon hoc active < 3, model co the kem on dinh")

        dynamic_scores = {
            code: np.round(np.random.uniform(3.0, 10.0, NUM_STUDENTS), 1)
            for code in subject_codes
        }

        df = pd.DataFrame(dynamic_scores)
        df["diem_hk_truoc"] = np.round(np.random.uniform(3.0, 10.0, NUM_STUDENTS), 1)
        df["so_buoi_vang"] = np.random.randint(0, 21, NUM_STUDENTS)
        df["hanh_kiem"] = np.random.randint(0, 4, NUM_STUDENTS)

        score_matrix = df[subject_codes].to_numpy(dtype=np.float64)
        weighted_average = np.average(score_matrix, axis=1, weights=coefficients)
        df["tb_ky_nay"] = np.round(weighted_average, 2)

        df["ket_qua"] = df.apply(
            lambda row: classify_result(
                tb_ky_nay=float(row["tb_ky_nay"]),
                so_buoi_vang=int(row["so_buoi_vang"]),
                hanh_kiem=int(row["hanh_kiem"]),
            ),
            axis=1,
        )

        noise_mask = np.random.rand(NUM_STUDENTS) < NOISE_RATE
        noisy_indices = df.index[noise_mask].tolist()
        for idx in noisy_indices:
            df.at[idx, "ket_qua"] = apply_noise(df.at[idx, "ket_qua"], rng)

        df = df.drop(columns=["tb_ky_nay"])

        output_dir = Path(__file__).resolve().parent
        output_dir.mkdir(parents=True, exist_ok=True)

        output_file = output_dir / "students.csv"
        df.to_csv(output_file, index=False, encoding="utf-8-sig")

        feature_order = subject_codes + ["diem_hk_truoc", "so_buoi_vang", "hanh_kiem"]
        feature_file = output_dir / "subject_codes.json"
        feature_file.write_text(
            json.dumps(feature_order, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        print(f"Da tao dataset thanh cong: {output_file}")
        print(f"Da tao thu tu feature: {feature_file}")
        print(f"So luong mau: {len(df)}")

        distribution = df["ket_qua"].value_counts().reindex(
            ["Giỏi", "Khá", "Trung Bình", "Yếu"],
            fill_value=0,
        )
        print("\nPhan phoi nhan:")
        for label, count in distribution.items():
            ratio = count / len(df) * 100
            print(f"- {label}: {count} ({ratio:.2f}%)")
    except Exception as error:
        raise RuntimeError(f"Khong the tao du lieu train: {error}") from error


if __name__ == "__main__":
    main()