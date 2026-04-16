import os
import pickle
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, quote

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from risk_logic import calibrate_confidence, infer_risk_level

from schemas import (
    GpaRoadmapRequest,
    GpaRoadmapResponse,
    PredictAllRequest,
    PredictRequest,
    PredictResponse,
    RetakeRoadmapRequest,
    RetakeRoadmapResponse,
    RetakeSubject,
    SemesterPlanRequest,
    SemesterPlanResponse,
    StudyResource,
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
    """
    Uu tien dung finalScore neu co (chinh xac hon).
    Fallback ve trung binh scores neu khong co finalScore.
    """
    if request_data.finalScore is not None:
        fallback = float(request_data.finalScore)
    else:
        valid = [float(s) for s in request_data.scores.values() if s is not None]
        fallback = float(np.mean(valid)) if valid else float(request_data.diem_hk_truoc)

    values: list[float] = []
    for feature in feature_names:
        if feature == "diem_hk_truoc":
            values.append(float(request_data.diem_hk_truoc))
        elif feature == "so_buoi_vang":
            values.append(float(request_data.so_buoi_vang))
        elif feature == "hanh_kiem":
            values.append(float(request_data.hanh_kiem))
        else:
            values.append(float(request_data.scores.get(feature, fallback)))

    return np.array(values, dtype=np.float64).reshape(1, -1)


def _build_suggestions(weak_subjects: list[str], so_buoi_vang: int, risk_level: str) -> list[str]:
    suggestions: list[str] = []

    if weak_subjects:
        suggestions.append(
            "Cần tập trung phụ đạo các môn yếu: " + ", ".join(weak_subjects),
        )
        suggestions.append("Đề xuất lập kế hoạch ôn tập theo từng môn mỗi ngày")
    else:
        suggestions.append("Nên duy trì nhịp học ổn định và tiếp tục luyện đề")

    if so_buoi_vang >= 8:
        suggestions.append("Số buổi vắng cao, cần tăng tỷ lệ chuyên cần ngay")
    elif so_buoi_vang >= 4:
        suggestions.append("Cần theo dõi chuyên cần để tránh ảnh hưởng kết quả")

    if risk_level == "high":
        suggestions.append("Cần can thiệp sớm với GVCN và phụ huynh")
    elif risk_level == "medium":
        suggestions.append("Nên tăng cường bài tập và kiểm tra định kỳ")

    if not suggestions:
        suggestions.append("Tiếp tục duy trì tiến độ học tập hiện tại")

    return suggestions[:5]


def _build_analysis(
    predicted_rank: str,
    confidence: float,
    weak_subjects: list[str],
    so_buoi_vang: int,
    risk_level: str,
) -> str:
    sentence_1 = (
        f"AI dự đoán học lực: {predicted_rank} với độ tin cậy {confidence:.2f}%"
    )

    if weak_subjects:
        sentence_2 = (
            "Các môn đang yếu gồm " + ", ".join(weak_subjects) + ", cần ưu tiên bổ sung"
        )
    else:
        sentence_2 = "Chưa ghi nhận môn yếu rõ ràng trong bộ điểm đầu vào"

    sentence_3 = (
        f"Số buổi vắng hiện tại là {so_buoi_vang}, mức rủi ro tổng thể ở ngưỡng {risk_level}"
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
    predicted_rank = _safe_label(predicted_class)

    # Dung finalScore neu co, fallback ve trung binh scores
    if request_data.finalScore is not None:
        final_score = float(request_data.finalScore)
    else:
        valid = [float(s) for s in request_data.scores.values() if s is not None]
        final_score = float(np.mean(valid)) if valid else float(request_data.diem_hk_truoc)

    gpa4_value = float(request_data.gpa4) if request_data.gpa4 is not None else 0.0

    # Mon yeu: diem < 5.0 (tinh tren scores dict)
    weak_subjects = [
        code for code, score in request_data.scores.items()
        if float(score) < 5.0
    ]

    # Mon can cai thien: diem 5.0 <= score < 6.5 (tuong duong C)
    improve_subjects = [
        code for code, score in request_data.scores.items()
        if 5.0 <= float(score) < 6.5
    ]

    confidence = calibrate_confidence(
        final_score=final_score,
        predicted_rank=predicted_rank,
    )

    risk_level = infer_risk_level(
        final_score=final_score,
        gpa4=gpa4_value,
        so_buoi_vang=request_data.so_buoi_vang,
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

    subject_feature_count = len([n for n in feature_names if n not in SPECIAL_FEATURES])
    matched = len([k for k in request_data.scores if k in feature_names and k not in SPECIAL_FEATURES])
    data_coverage = round(min(matched / max(subject_feature_count, 1), 1.0), 2)

    return PredictResponse(
        predicted_rank=predicted_rank,
        confidence=round(confidence, 2),
        risk_level=risk_level,
        weak_subjects=weak_subjects,
        improve_subjects=improve_subjects,
        suggestions=suggestions,
        analysis=analysis,
        data_coverage=data_coverage,
        is_low_data=len(request_data.scores) < 2,
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


def _allocate_grades(
    sorted_subjects: list[SubjectResult],
    required_remaining: float,
) -> list[tuple[str, float]]:
    """
    Phân bổ A/B sao cho trung bình GPA4 có trọng số tín chỉ đạt đúng required_remaining.

    Thuật toán:
    1. Tính min/max có thể đạt được (tất cả B = 3.0, tất cả A = 4.0).
    2. Nếu required_remaining <= 3.0 → tất cả B.
    3. Nếu required_remaining >= 4.0 → tất cả A.
    4. Ngược lại, tính số tín chỉ cần đạt A (credits_A) để trung bình = required_remaining:
         credits_A * 4.0 + credits_B * 3.0 = required_remaining * total_credits
         credits_A = (required_remaining - 3.0) * total_credits
    5. Sắp xếp theo priority (critical > high > normal), gán A cho đến khi đủ credits_A.
    """
    total_credits = sum(s.credits for s in sorted_subjects)
    if total_credits == 0:
        return [("B", 3.0) for _ in sorted_subjects]

    if required_remaining <= 3.0:
        return [("B", 3.0) for _ in sorted_subjects]

    if required_remaining >= 4.0:
        return [("A", 4.0) for _ in sorted_subjects]

    credits_need_a = (required_remaining - 3.0) * total_credits  # số tín chỉ phải đạt A
    accumulated_a = 0.0
    results: list[tuple[str, float]] = []

    for subject in sorted_subjects:
        if accumulated_a < credits_need_a:
            results.append(("A", 4.0))
            accumulated_a += subject.credits
        else:
            results.append(("B", 3.0))

    return results


def _build_subject_reason(subject: SubjectResult, priority: str, target_grade: str) -> str:
    if priority == "critical":
        return (
            f"Môn cốt lõi ({subject.credits} tín chỉ), cần đạt {target_grade} để kéo GPA tích lũy"
        )

    if priority == "high":
        return f"Môn quan trọng, nên đạt tối thiểu {target_grade} để giữ tiến độ GPA"

    return f"Môn bổ trợ, mục tiêu {target_grade} là phù hợp để cân bằng tải"


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
            summary="Bạn đã hoàn thành toàn bộ môn học trong chương trình khung.",
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

    # Phân bổ A/B theo trọng số tín chỉ, không dùng threshold cứng per-subject
    grade_allocations = _allocate_grades(sorted_remaining, required_remaining)

    for subject, (target_grade, target_gpa4) in zip(sorted_remaining, grade_allocations):
        if subjects_in_current_slot >= max_subjects_per_semester:
            semester, year = _next_semester_year(semester, year)
            subjects_in_current_slot = 0

        priority = _subject_priority(subject)

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
            weeklyPlan=_gen_weekly_plan(
                subject.subjectName,
                getattr(subject, "category", "theory") or "theory",
                subject.credits,
            ),
            resources=_gen_resources(
                subject.subjectName,
                getattr(subject, "category", "theory") or "theory",
            ),
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
    count_a = sum(1 for p in subject_plans if p.targetGrade == "A")
    count_b = sum(1 for p in subject_plans if p.targetGrade == "B")
    grade_breakdown = f"{count_a} môn cần đạt A, {count_b} môn đạt B là đủ. "
    summary = (
        f"Để đạt GPA {request_data.targetGpa:.2f} ({_target_label(request_data.targetGpa)}), "
        f"bạn cần đạt trung bình {required_remaining:.2f} GPA ở {len(sorted_remaining)} môn còn lại. "
        f"{grade_breakdown}"
        f"Cần ưu tiên các môn: {focus_subjects}."
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


# ============================================================
# TEMPLATE ENGINE & SEARCH LINK GENERATOR
# ============================================================

_WEEKLY_PLAN_TEMPLATES: dict[str, list[str]] = {
    "language": [
        "Tuần {w1}: Ôn lại toàn bộ từ vựng và ngữ pháp nền tảng của môn {name}",
        "Tuần {w2}: Luyện kỹ năng đọc hiểu — đọc ít nhất 1 bài/ngày và ghi chép từ mới",
        "Tuần {w3}: Luyện kỹ năng nghe — nghe audio bài giảng và podcast liên quan",
        "Tuần {w4}: Luyện viết và nói — viết đoạn văn ngắn, luyện phát âm theo bài mẫu",
        "Tuần {w5}: Làm lại toàn bộ bài tập trong giáo trình {name}",
        "Tuần {w6}: Luyện đề thi cũ — phân tích lỗi sai và bổ sung từng điểm yếu",
        "Tuần {w7}: Kiểm tra thử với đề thi mới, củng cố những mảng còn yếu",
        "Tuần {w8}: Ôn tổng hợp — tập trung vào dạng câu hỏi hay ra trong kỳ thi",
    ],
    "practice": [
        "Tuần {w1}: Đọc lại toàn bộ lý thuyết nền của môn {name}, lập mind-map từng chương",
        "Tuần {w2}: Xem lại slide bài giảng và ghi chú những khái niệm chưa rõ",
        "Tuần {w3}: Làm lại từng bài lab từ đầu — chạy lại code/thực hành từng bước",
        "Tuần {w4}: Tự build project nhỏ áp dụng kiến thức môn {name} từ đầu",
        "Tuần {w5}: Debug và hoàn thiện project, viết ghi chú kỹ thuật từng phần",
        "Tuần {w6}: Xem thêm ví dụ trên internet, so sánh với cách làm của mình",
        "Tuần {w7}: Ôn lý thuyết đi kèm phần thực hành — chuẩn bị cho phần thi lý thuyết",
        "Tuần {w8}: Làm đề thi thử, kiểm tra lại toàn bộ kỹ năng thực hành",
    ],
    "both": [
        "Tuần {w1}: Đọc lại lý thuyết chương 1–2 của môn {name}, ghi chú khái niệm cốt lõi",
        "Tuần {w2}: Làm bài tập lý thuyết chương 1–2 và hoàn thành bài lab tương ứng",
        "Tuần {w3}: Đọc lý thuyết chương 3–4, tiếp tục bài thực hành theo tiến độ",
        "Tuần {w4}: Làm bài tập tổng hợp chương 1–4, xem lại lỗi sai",
        "Tuần {w5}: Ôn toàn bộ phần lý thuyết còn lại, tập trung phần hay thi",
        "Tuần {w6}: Hoàn thiện toàn bộ bài lab — đảm bảo mỗi bài chạy đúng",
        "Tuần {w7}: Luyện đề thi cũ kết hợp lý thuyết và thực hành",
        "Tuần {w8}: Kiểm tra thử toàn bộ, củng cố điểm yếu cuối cùng",
    ],
    "science": [
        "Tuần {w1}: Đọc lại lý thuyết và công thức cốt lõi của môn {name}",
        "Tuần {w2}: Giải bài tập chương 1–2 từ cơ bản đến nâng cao",
        "Tuần {w3}: Giải bài tập chương 3–4, đặc biệt chú ý dạng bài tính toán",
        "Tuần {w4}: Làm đề thi cũ phần trắc nghiệm — rà soát lỗi sai từng câu",
        "Tuần {w5}: Ôn lại công thức và định lý, lập bảng tổng hợp công thức",
        "Tuần {w6}: Giải đề thi tự luận cũ — rèn kỹ năng trình bày bài toán",
        "Tuần {w7}: Luyện tập dạng bài khó và dạng bài mới",
        "Tuần {w8}: Kiểm tra thử toàn bộ chương trình môn {name}",
    ],
    "social": [
        "Tuần {w1}: Đọc lại toàn bộ giáo trình môn {name}, tóm tắt ý chính từng chương",
        "Tuần {w2}: Ghi nhớ các khái niệm, định nghĩa và mô hình lý thuyết quan trọng",
        "Tuần {w3}: Làm bài tập phân tích tình huống — liên hệ lý thuyết với thực tiễn",
        "Tuần {w4}: Đọc thêm tài liệu tham khảo, bổ sung ví dụ thực tế",
        "Tuần {w5}: Ôn lý thuyết theo dạng câu hỏi thi — luyện trả lời ngắn gọn",
        "Tuần {w6}: Làm đề thi thử và chấm điểm theo thang điểm đáp án",
        "Tuần {w7}: Củng cố các mảng kiến thức còn yếu dựa trên kết quả làm đề",
        "Tuần {w8}: Ôn tổng hợp và hệ thống hóa toàn bộ nội dung môn học",
    ],
    "specialized": [
        "Tuần {w1}: Đọc lại đề cương và slide toàn bộ môn {name}, xác định trọng tâm",
        "Tuần {w2}: Ôn lý thuyết chuyên ngành phần 1 — ghi chép và hệ thống hóa",
        "Tuần {w3}: Ôn lý thuyết chuyên ngành phần 2 — kết hợp làm bài tập",
        "Tuần {w4}: Tham khảo tài liệu kỹ thuật bổ trợ và tài liệu chuẩn ngành",
        "Tuần {w5}: Làm bài tập tổng hợp và đề thi thử — phân tích đáp án",
        "Tuần {w6}: Thực hành thêm case study hoặc bài tập tình huống thực tế",
        "Tuần {w7}: Ôn toàn bộ trọng tâm — lập checklist kiến thức cần nhớ",
        "Tuần {w8}: Kiểm tra thử lần cuối và bổ sung những điểm còn thiếu",
    ],
    "other": [
        "Tuần {w1}: Đọc lại toàn bộ giáo trình và đề cương môn {name}",
        "Tuần {w2}: Hệ thống hóa kiến thức theo từng chương — lập sơ đồ tư duy",
        "Tuần {w3}: Làm bài tập và câu hỏi ôn tập từng chương",
        "Tuần {w4}: Làm đề thi cũ, chú ý dạng câu hỏi hay gặp",
        "Tuần {w5}: Ôn lại phần kiến thức còn yếu dựa trên kết quả đề cũ",
        "Tuần {w6}: Kiểm tra thử toàn bộ nội dung môn học",
    ],
    "theory": [
        "Tuần {w1}: Đọc lại lý thuyết từng chương của môn {name}, lập mind-map",
        "Tuần {w2}: Ghi chép và ghi nhớ các khái niệm, định nghĩa quan trọng",
        "Tuần {w3}: Làm bài tập lý thuyết và câu hỏi ôn tập từng chương",
        "Tuần {w4}: Đọc thêm tài liệu tham khảo, mở rộng hiểu biết",
        "Tuần {w5}: Luyện đề thi cũ — phân tích và sửa lỗi từng câu",
        "Tuần {w6}: Ôn tổng hợp, tập trung phần hay thi và phần còn yếu",
    ],
}


def _gen_weekly_plan(subject_name: str, category: str, credits: int) -> list[str]:
    """Sinh lộ trình học theo tuần dựa trên category và số tín chỉ (credits * 2 tuần)."""
    total_weeks = credits * 2
    template_key = category if category in _WEEKLY_PLAN_TEMPLATES else "theory"
    template = _WEEKLY_PLAN_TEMPLATES[template_key]
    selected = template[:total_weeks]
    result: list[str] = []
    for i, item in enumerate(selected, start=1):
        line = item.format(w1=1, w2=2, w3=3, w4=4, w5=5, w6=6, w7=7, w8=8, name=subject_name)
        # Thay số tuần thực tế vào label
        line = line.replace(f"Tuần {i - (i - 1)}", f"Tuần {i}", 1) if f"Tuần {i}" not in line else line
        result.append(line)
    return result


def _gen_resources(subject_name: str, category: str) -> list[StudyResource]:
    """Sinh danh sách link tìm kiếm tài liệu tự động theo tên môn."""
    q_vi = quote(f"{subject_name} giáo trình đại học")
    q_yt = quote(f"{subject_name} bài giảng")

    resources: list[StudyResource] = [
        StudyResource(
            title=f"Tìm PDF giáo trình {subject_name} trên Google",
            url=f"https://www.google.com/search?q={q_vi}+filetype:pdf",
            type="search",
        ),
        StudyResource(
            title=f"Xem bài giảng {subject_name} trên YouTube",
            url=f"https://www.youtube.com/results?search_query={q_yt}+bai+giang",
            type="video",
        ),
        StudyResource(
            title=f"Tài liệu mở {subject_name} — MIT OpenCourseWare",
            url=f"https://ocw.mit.edu/search/?q={quote(subject_name)}",
            type="opencourse",
        ),
    ]

    if category in {"practice", "both", "specialized"}:
        resources.append(
            StudyResource(
                title=f"Tìm project mẫu {subject_name} trên GitHub",
                url=f"https://github.com/search?q={quote(subject_name)}&type=repositories",
                type="docs",
            )
        )
    elif category == "language":
        resources.append(
            StudyResource(
                title=f"Luyện tập {subject_name} trên BBC Learning English",
                url="https://www.bbc.co.uk/learningenglish/",
                type="docs",
            )
        )
    elif category == "science":
        resources.append(
            StudyResource(
                title=f"Tài liệu {subject_name} trên Khan Academy",
                url=f"https://www.khanacademy.org/search?page_search_query={quote(subject_name)}",
                type="docs",
            )
        )

    return resources


def _build_retake_item(
    subject: SubjectResult,
    urgency: str,
    suggested_semester: int,
) -> RetakeSubject:
    target_grade = "B" if urgency == "urgent" else "A"
    reason = (
        "Môn F ảnh hưởng mạnh đến GPA, cần học lại ngay"
        if urgency == "urgent"
        else "Môn C nên cải thiện để tăng GPA tích lũy"
    )
    category = getattr(subject, "category", "theory") or "theory"

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
        weeklyPlan=_gen_weekly_plan(subject.subjectName, category, subject.credits),
        resources=_gen_resources(subject.subjectName, category),
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
        f"Cần ưu tiên học lại {len(urgent_retakes)} môn F trước, "
        f"sau đó cải thiện {len(recommended_retakes)} môn C để tăng GPA."
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
            "Môn cốt lõi, cần điểm cao để bảo toàn mục tiêu GPA"
            if target_grade == "A"
            else "Đạt B là đủ để giữ tiến độ và tránh quá tải"
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
        warnings.append("Cần theo sát các môn yếu từ kỳ trước: " + ", ".join(weak_names))

    if gap > 0.6:
        warnings.append("Mục tiêu GPA cao, cần ưu tiên nhịp học đều và giữ điểm quá trình")

    summary = (
        f"Kỳ này cần duy trì GPA trung bình khoảng {predicted_semester_gpa:.2f}. "
        f"Tập trung môn trọng điểm cao để hướng đến mục tiêu {request_data.targetGpa:.2f}."
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


@app.post("/predict-all-semesters", response_model=PredictResponse)
def predict_all_semesters(request_data: PredictAllRequest) -> PredictResponse:
    """
    Du doan tong hop tu nhieu hoc ky.
    HK gan nhat co trong so 2, cac HK truoc trong so 1.
    """
    semesters = request_data.semesters
    if not semesters:
        raise HTTPException(status_code=400, detail="Can it nhat 1 hoc ky")

    n = len(semesters)
    weights = [1.0] * n
    weights[-1] = 2.0  # HK gan nhat quan trong hon
    total_w = sum(weights)

    avg_final = sum(s.finalScore * w for s, w in zip(semesters, weights)) / total_w
    avg_gpa4 = sum(s.gpa4 * w for s, w in zip(semesters, weights)) / total_w
    avg_absent = sum(s.attendanceAbsent for s in semesters) / n

    synthetic = PredictRequest(
        scores={},
        diem_hk_truoc=round(avg_final, 2),
        so_buoi_vang=int(round(avg_absent)),
        hanh_kiem=2,
        finalScore=round(avg_final, 2),
        gpa4=round(avg_gpa4, 2),
    )
    return _predict_single(synthetic)


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
