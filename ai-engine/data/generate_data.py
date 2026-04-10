import json
import os
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient


SPECIAL_FEATURES = ["diem_hk_truoc", "so_buoi_vang", "hanh_kiem"]
RANDOM_SEED = 42
MIN_ROWS_DEFAULT = 10000
MIN_SUBJECT_COVERAGE_DEFAULT = 0.12


def _get_database_name_from_uri(mongo_uri: str) -> str:
    parsed = urlparse(mongo_uri)
    db_name = parsed.path.lstrip("/").split("?")[0]
    if not db_name:
        raise RuntimeError(
            "MONGO_URI chua chi ro database name, vi du: mongodb+srv://.../student_ai_db",
        )
    return db_name


def _to_float(value):
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None

    if np.isnan(numeric):
        return None
    return numeric


def _clip_score(value):
    numeric = _to_float(value)
    if numeric is None:
        return None
    if numeric < 0:
        return 0.0
    if numeric > 10:
        return 10.0
    return float(round(numeric, 2))


def _resolve_grade_score(doc):
    if bool(doc.get("isVangThi")):
        return 0.0

    for key in ["finalScore", "tktScore", "gkScore", "txAvg"]:
        score = _clip_score(doc.get(key))
        if score is not None:
            return score

    return None


def _map_conduct_to_score(value):
    if value is None:
        return None

    numeric = _to_float(value)
    if numeric is not None:
        if numeric < 0:
            return 0
        if numeric > 3:
            return 3
        return int(round(numeric))

    normalized = str(value).strip().lower()
    mapping = {
        "tot": 3,
        "kha": 2,
        "trung binh": 1,
        "yeu": 0,
    }
    return mapping.get(normalized)


def _infer_attendance(semester_mean: float, fail_count: int):
    base = 0
    if semester_mean < 5:
        base = 8
    elif semester_mean < 6.5:
        base = 5
    elif semester_mean < 8:
        base = 3
    penalty = min(fail_count * 2, 8)
    return int(min(base + penalty, 20))


def _infer_conduct(semester_mean: float):
    if semester_mean >= 8:
        return 3
    if semester_mean >= 6.5:
        return 2
    if semester_mean >= 5:
        return 1
    return 0


def _classify_result(semester_mean: float, fail_count: int, total_subjects: int, so_buoi_vang: int, hanh_kiem: int):
    if (
        semester_mean >= 8.0
        and fail_count == 0
        and so_buoi_vang <= 4
        and hanh_kiem >= 2
    ):
        return "Giỏi"

    if (
        semester_mean >= 6.5
        and fail_count <= 1
        and so_buoi_vang <= 8
        and hanh_kiem >= 1
    ):
        return "Khá"

    fail_ratio = fail_count / max(total_subjects, 1)
    if semester_mean >= 5.0 and fail_ratio <= 0.5:
        return "Trung Bình"

    return "Yếu"


def _load_active_subjects(database):
    raw_subjects = list(
        database["subjects"]
        .find({"isActive": True}, {"code": 1, "name": 1, "coefficient": 1, "credits": 1})
        .sort("code", 1),
    )

    subjects = []
    for item in raw_subjects:
        code = str(item.get("code") or "").strip().lower()
        if not code:
            continue

        coefficient = _to_float(item.get("coefficient"))
        if coefficient is None or coefficient <= 0:
            coefficient = _to_float(item.get("credits"))
        if coefficient is None or coefficient <= 0:
            coefficient = 1.0

        subjects.append(
            {
                "id": str(item.get("_id")),
                "code": code,
                "name": str(item.get("name") or code),
                "coefficient": float(coefficient),
            },
        )

    if not subjects:
        raise RuntimeError("Khong tim thay mon hoc active trong DB")

    return subjects


def _load_grades(database):
    # Avoid server-side sorting here because large datasets can exceed Mongo sort memory.
    return list(
        database["grades"].find(
            {},
            {
                "studentId": 1,
                "schoolYearId": 1,
                "semester": 1,
                "subjectId": 1,
                "finalScore": 1,
                "tktScore": 1,
                "gkScore": 1,
                "txAvg": 1,
                "isVangThi": 1,
                "letterGrade": 1,
                "so_buoi_vang": 1,
                "attendanceAbsent": 1,
                "hanhKiem": 1,
                "conductScore": 1,
                "createdAt": 1,
            },
        ),
    )


def _build_semester_samples(grades, subject_by_id, coefficient_by_code):
    grouped = {}

    for doc in grades:
        student_id = str(doc.get("studentId") or "")
        school_year_id = str(doc.get("schoolYearId") or "")
        semester = int(doc.get("semester") or 0)
        subject_id = str(doc.get("subjectId") or "")

        if not student_id or not school_year_id or semester not in {1, 2, 3}:
            continue

        subject = subject_by_id.get(subject_id)
        if not subject:
            continue

        score = _resolve_grade_score(doc)
        if score is None:
            continue

        key = (student_id, school_year_id, semester)
        if key not in grouped:
            grouped[key] = {
                "studentId": student_id,
                "schoolYearId": school_year_id,
                "semester": semester,
                "scores": {},
                "attendanceValues": [],
                "conductValues": [],
                "createdAt": doc.get("createdAt"),
            }

        sample = grouped[key]
        sample["scores"][subject["code"]] = score

        attendance = _to_float(doc.get("so_buoi_vang"))
        if attendance is None:
            attendance = _to_float(doc.get("attendanceAbsent"))
        if attendance is not None and attendance >= 0:
            sample["attendanceValues"].append(int(round(attendance)))

        conduct = _map_conduct_to_score(doc.get("hanhKiem"))
        if conduct is None:
            conduct = _map_conduct_to_score(doc.get("conductScore"))
        if conduct is not None:
            sample["conductValues"].append(conduct)

        created_at = doc.get("createdAt")
        if created_at and (sample["createdAt"] is None or created_at > sample["createdAt"]):
            sample["createdAt"] = created_at

    samples = []
    for sample in grouped.values():
        scores = sample["scores"]
        if not scores:
            continue

        weighted_total = 0.0
        total_weight = 0.0
        for code, score in scores.items():
            weight = float(coefficient_by_code.get(code, 1.0))
            weighted_total += score * weight
            total_weight += weight

        semester_mean = weighted_total / total_weight if total_weight > 0 else float(np.mean(list(scores.values())))
        failed_count = sum(1 for value in scores.values() if value < 5)

        if sample["attendanceValues"]:
            so_buoi_vang = int(round(float(np.mean(sample["attendanceValues"]))))
        else:
            so_buoi_vang = _infer_attendance(semester_mean, failed_count)

        if sample["conductValues"]:
            hanh_kiem = int(round(float(np.mean(sample["conductValues"]))))
        else:
            hanh_kiem = _infer_conduct(semester_mean)

        samples.append(
            {
                **sample,
                "semesterMean": round(float(semester_mean), 2),
                "failedCount": failed_count,
                "so_buoi_vang": so_buoi_vang,
                "hanh_kiem": hanh_kiem,
            },
        )

    return samples


def _attach_previous_semester_score(samples):
    grouped_by_student = defaultdict(list)
    for sample in samples:
        grouped_by_student[sample["studentId"]].append(sample)

    for student_samples in grouped_by_student.values():
        student_samples.sort(key=lambda item: item.get("createdAt") or 0)
        previous_mean = None
        for sample in student_samples:
            current_mean = float(sample["semesterMean"])
            sample["diem_hk_truoc"] = round(previous_mean if previous_mean is not None else current_mean, 2)
            previous_mean = current_mean


def _to_dataframe(samples, subject_codes):
    rows = []
    for sample in samples:
        row = {code: sample["scores"].get(code, np.nan) for code in subject_codes}

        semester_mean = float(sample["semesterMean"])
        so_buoi_vang = int(max(min(sample["so_buoi_vang"], 20), 0))
        hanh_kiem = int(max(min(sample["hanh_kiem"], 3), 0))
        ket_qua = _classify_result(
            semester_mean=semester_mean,
            fail_count=int(sample["failedCount"]),
            total_subjects=max(len(sample["scores"]), 1),
            so_buoi_vang=so_buoi_vang,
            hanh_kiem=hanh_kiem,
        )

        row["diem_hk_truoc"] = float(sample["diem_hk_truoc"])
        row["so_buoi_vang"] = so_buoi_vang
        row["hanh_kiem"] = hanh_kiem
        row["ket_qua"] = ket_qua
        rows.append(row)

    return pd.DataFrame(rows)


def _select_subject_features(df: pd.DataFrame, subject_codes: list[str]) -> list[str]:
    if not subject_codes:
        return []

    min_coverage = float(
        os.getenv("MIN_SUBJECT_COVERAGE", str(MIN_SUBJECT_COVERAGE_DEFAULT)),
    )
    min_coverage = min(max(min_coverage, 0.0), 1.0)

    coverage = {}
    for code in subject_codes:
        if code not in df.columns:
            coverage[code] = 0.0
            continue

        coverage[code] = float(df[code].notna().mean())

    selected = [
        code
        for code, ratio in sorted(coverage.items(), key=lambda item: item[1], reverse=True)
        if ratio >= min_coverage
    ]

    min_subject_count = 12
    if len(selected) < min_subject_count:
        selected = [
            code
            for code, _ in sorted(coverage.items(), key=lambda item: item[1], reverse=True)[:min_subject_count]
        ]

    return selected


def _augment_dataset(df: pd.DataFrame, subject_codes: list[str], target_rows: int) -> pd.DataFrame:
    if len(df) >= target_rows:
        return df

    rng = np.random.default_rng(RANDOM_SEED)
    missing_rows = target_rows - len(df)
    sampled = df.sample(n=missing_rows, replace=True, random_state=RANDOM_SEED).reset_index(drop=True)

    for code in subject_codes:
        if code not in sampled.columns:
            continue

        noise = rng.normal(0, 0.35, size=len(sampled))
        sampled[code] = pd.to_numeric(sampled[code], errors="coerce").fillna(5.0)
        sampled[code] = np.clip(sampled[code] + noise, 0, 10).round(2)

    if "diem_hk_truoc" in sampled.columns:
        sampled["diem_hk_truoc"] = pd.to_numeric(sampled["diem_hk_truoc"], errors="coerce").fillna(5.0)
        sampled["diem_hk_truoc"] = np.clip(
            sampled["diem_hk_truoc"] + rng.normal(0, 0.25, size=len(sampled)),
            0,
            10,
        ).round(2)

    if "so_buoi_vang" in sampled.columns:
        sampled["so_buoi_vang"] = pd.to_numeric(sampled["so_buoi_vang"], errors="coerce").fillna(0)
        sampled["so_buoi_vang"] = np.clip(
            sampled["so_buoi_vang"] + rng.integers(-2, 3, size=len(sampled)),
            0,
            20,
        ).round(0).astype(int)

    if "hanh_kiem" in sampled.columns:
        sampled["hanh_kiem"] = pd.to_numeric(sampled["hanh_kiem"], errors="coerce").fillna(2)
        sampled["hanh_kiem"] = np.clip(
            sampled["hanh_kiem"] + rng.integers(-1, 2, size=len(sampled)),
            0,
            3,
        ).round(0).astype(int)

    merged = pd.concat([df, sampled], ignore_index=True)
    return merged.sample(frac=1.0, random_state=RANDOM_SEED).reset_index(drop=True)


def main() -> None:
    env_path = Path(__file__).resolve().parents[2] / "backend" / ".env"
    load_dotenv(dotenv_path=env_path)

    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError(f"Khong tim thay MONGO_URI trong {env_path}")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)

    try:
        database_name = _get_database_name_from_uri(mongo_uri)
        database = client[database_name]

        np.random.seed(RANDOM_SEED)

        subjects = _load_active_subjects(database)
        subject_codes = [item["code"] for item in subjects]
        subject_by_id = {item["id"]: item for item in subjects}
        coefficient_by_code = {item["code"]: item["coefficient"] for item in subjects}

        print("Doc mon hoc active:")
        for item in subjects:
            print(f"- {item['code']}: {item['name']} (he so={item['coefficient']})")

        grades = _load_grades(database)
        if not grades:
            raise RuntimeError("Collection grades khong co du lieu de train")

        print(f"Tong so ban ghi grade doc duoc: {len(grades)}")

        samples = _build_semester_samples(grades, subject_by_id, coefficient_by_code)
        if not samples:
            raise RuntimeError("Khong tao duoc mau train hop le tu du lieu diem")

        _attach_previous_semester_score(samples)
        df = _to_dataframe(samples, subject_codes)

        if df.empty:
            raise RuntimeError("DataFrame train rong sau khi tong hop du lieu")

        selected_subject_codes = _select_subject_features(df, subject_codes)
        if not selected_subject_codes:
            raise RuntimeError("Khong chon duoc feature mon hoc tu du lieu tong hop")

        selected_columns = selected_subject_codes + SPECIAL_FEATURES + ["ket_qua"]
        df = df[selected_columns].copy()

        min_rows = int(os.getenv("TARGET_SAMPLE_ROWS", str(MIN_ROWS_DEFAULT)))
        if min_rows < MIN_ROWS_DEFAULT:
            min_rows = MIN_ROWS_DEFAULT
        df = _augment_dataset(df, selected_subject_codes, min_rows)

        output_dir = Path(__file__).resolve().parent
        output_dir.mkdir(parents=True, exist_ok=True)

        output_file = output_dir / "students.csv"
        feature_file = output_dir / "subject_codes.json"

        df.to_csv(output_file, index=False, encoding="utf-8-sig")

        feature_order = selected_subject_codes + SPECIAL_FEATURES
        feature_file.write_text(
            json.dumps(feature_order, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        print(f"\nDa tao dataset thanh cong: {output_file}")
        print(f"Da tao thu tu feature: {feature_file}")
        print(f"So luong mau train: {len(df)}")
        print(f"So feature mon hoc duoc chon: {len(selected_subject_codes)}")

        distribution = df["ket_qua"].value_counts().reindex(
            ["Giỏi", "Khá", "Trung Bình", "Yếu"],
            fill_value=0,
        )
        print("\nPhan phoi nhan:")
        for label, count in distribution.items():
            ratio = count / len(df) * 100
            print(f"- {label}: {count} ({ratio:.2f}%)")

    except Exception as error:
        raise RuntimeError(f"Khong the tao du lieu train tu DB that: {error}") from error
    finally:
        client.close()


if __name__ == "__main__":
    main()