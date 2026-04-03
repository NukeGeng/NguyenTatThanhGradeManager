from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    scores: dict[str, float] = Field(default_factory=dict)
    diem_hk_truoc: float = Field(ge=0, le=10)
    so_buoi_vang: int = Field(ge=0)
    hanh_kiem: int = Field(ge=0, le=3)


class PredictResponse(BaseModel):
    predicted_rank: str
    confidence: float
    risk_level: str
    weak_subjects: list[str]
    suggestions: list[str]
    analysis: str
