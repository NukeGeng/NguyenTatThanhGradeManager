from __future__ import annotations

import unicodedata


GRADE_THRESHOLDS = [
    ("Giỏi",       8.5),
    ("Khá",        7.0),
    ("Trung Bình", 5.0),
    ("Yếu",        0.0),
]


def _normalize_rank(value: str) -> str:
    text = str(value or "").strip().lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return text.replace("đ", "d")


def score_to_rank(final_score: float) -> str:
    """Ground truth rank from actual score."""
    if final_score >= 8.5:
        return "Giỏi"
    if final_score >= 7.0:
        return "Khá"
    if final_score >= 5.0:
        return "Trung Bình"
    return "Yếu"


def calibrate_confidence(
    final_score: float,
    predicted_rank: str,
    **kwargs,
) -> float:
    """
    Confidence = khoảng cách từ điểm đến ngưỡng gần nhất.
    Càng gần ngưỡng chuyển loại → càng không chắc.

    Điểm 7.0 (đúng ngưỡng Khá/TB) → 50%
    Điểm 7.8 (giữa Khá)            → 68%
    Điểm 9.0 (sâu trong Giỏi)      → 81.25%
    Điểm 4.0 (sâu trong Yếu)       → 90%
    """
    distances = [abs(final_score - threshold) for _, threshold in GRADE_THRESHOLDS]
    min_dist = min(distances)
    # 0 cách ngưỡng = 50%, 2.0 điểm cách ngưỡng = 95%
    confidence = 50.0 + (min(min_dist, 2.0) / 2.0) * 45.0
    return round(min(confidence, 95.0), 2)


def infer_risk_level(
    final_score: float,
    gpa4: float,
    so_buoi_vang: int,
    **kwargs,
) -> str:
    """
    Risk level dựa hoàn toàn vào CHỈ SỐ HỌC TẬP THỰC TẾ.

    LOW:    Giỏi (>= 8.5) VÀ vắng <= 5
    MEDIUM: Khá  (>= 7.0) hoặc Giỏi nhưng vắng nhiều
    HIGH:   Trung Bình / Yếu hoặc các trường hợp nguy hiểm
    """
    score = float(final_score or 0.0)
    g4 = float(gpa4 or 0.0)
    absent = int(so_buoi_vang or 0)

    # Các trường hợp rủi ro cao rõ ràng
    if score < 5.0 or g4 == 0.0 or absent > 15:
        return "high"
    if score < 6.0 and absent > 10:
        return "high"
    if score < 7.0 or g4 < 2.5 or absent > 8:
        return "high"

    # Giỏi và vắng ít → low; còn lại (Khá hoặc Giỏi nhưng vắng vừa) → medium
    if score >= 8.5 and absent <= 5:
        return "low"

    return "medium"


def has_risk_paradox(predicted_rank: str, risk_level: str) -> bool:
    rank = _normalize_rank(predicted_rank)
    risk = str(risk_level or "").strip().lower()
    if rank == "gioi" and risk == "high":
        return True
    if rank == "yeu" and risk == "low":
        return True
    return False
