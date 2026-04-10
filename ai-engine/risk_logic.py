from __future__ import annotations

import math
import unicodedata


def _normalize_rank(value: str) -> str:
    text = str(value or "").strip().lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return text.replace("đ", "d")


def infer_risk_level(
    predicted_rank: str,
    confidence: float,
    so_buoi_vang: int,
    weak_subject_count: int,
) -> str:
    rank = _normalize_rank(predicted_rank)
    confidence_value = float(confidence or 0)
    attendance = max(int(so_buoi_vang or 0), 0)
    weak_count = max(int(weak_subject_count or 0), 0)

    if rank == "yeu":
        return "high"

    if rank == "trung binh":
        if confidence_value < 60 or attendance >= 8 or weak_count >= 2:
            return "high"
        return "medium"

    if rank == "kha":
        if confidence_value < 55 or attendance >= 10 or weak_count >= 3:
            return "medium"
        return "low"

    if rank == "gioi":
        if confidence_value < 55 or attendance >= 12 or weak_count >= 4:
            return "medium"
        return "low"

    if confidence_value < 60:
        return "high"
    if confidence_value < 75:
        return "medium"
    return "low"


def calibrate_confidence(
    predicted_rank: str,
    probabilities: list[float],
    provided_subject_count: int,
    total_subject_feature_count: int,
    so_buoi_vang: int,
    weak_subject_count: int,
) -> float:
    probs = [max(float(value), 0.0) for value in probabilities]
    if not probs:
        return 50.0

    total_prob = sum(probs)
    if total_prob <= 0:
        return 50.0

    normalized = [value / total_prob for value in probs]
    sorted_probs = sorted(normalized, reverse=True)
    top1 = sorted_probs[0]
    top2 = sorted_probs[1] if len(sorted_probs) > 1 else 0.0

    margin = max(top1 - top2, 0.0)
    margin_factor = 0.65 + 0.35 * min(margin / 0.45, 1.0)

    entropy = 0.0
    for value in normalized:
        if value > 0:
            entropy += -(value * math.log(value))

    if len(normalized) > 1:
        max_entropy = math.log(len(normalized))
        entropy_ratio = min(max(entropy / max_entropy, 0.0), 1.0)
    else:
        entropy_ratio = 0.0

    entropy_factor = 1.0 - 0.28 * entropy_ratio

    total_features = max(int(total_subject_feature_count or 0), 1)
    provided = max(int(provided_subject_count or 0), 0)
    coverage_ratio = min(provided / total_features, 1.0)
    coverage_factor = 0.72 + 0.28 * coverage_ratio

    calibrated = float(top1 * 100.0 * margin_factor * entropy_factor * coverage_factor)

    attendance = max(int(so_buoi_vang or 0), 0)
    weak_count = max(int(weak_subject_count or 0), 0)
    if attendance >= 8:
        calibrated *= 0.92
    if weak_count >= 2:
        calibrated *= 0.90

    rank = _normalize_rank(predicted_rank)
    if rank == "yeu":
        calibrated = min(calibrated, 78.0)
    elif rank == "trung binh":
        calibrated = min(calibrated, 86.0)

    return round(min(max(calibrated, 35.0), 99.0), 2)


def has_risk_paradox(predicted_rank: str, risk_level: str) -> bool:
    rank = _normalize_rank(predicted_rank)
    risk = str(risk_level or "").strip().lower()

    if rank == "gioi" and risk == "high":
        return True

    if rank == "yeu" and risk == "low":
        return True

    return False
