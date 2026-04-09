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


class SubjectResult(BaseModel):
    subjectCode: str
    subjectName: str
    credits: int = Field(ge=0)
    gpa4: float = Field(default=0, ge=0, le=4)
    letterGrade: str = ""
    status: str
    isRequired: bool = True


class GpaRoadmapRequest(BaseModel):
    studentCode: str
    currentGpaAccumulated: float = Field(ge=0, le=4)
    totalCreditsEarned: int = Field(ge=0)
    completedSubjects: list[SubjectResult] = Field(default_factory=list)
    remainingSubjects: list[SubjectResult] = Field(default_factory=list)
    targetGpa: float = Field(ge=0, le=4)


class SubjectPlan(BaseModel):
    subjectCode: str
    subjectName: str
    credits: int = Field(ge=0)
    targetGrade: str
    targetGpa4: float = Field(ge=0, le=4)
    priority: str
    reason: str
    semester: int = Field(ge=1, le=3)
    year: int = Field(ge=1)


class RetakeSubject(BaseModel):
    subjectCode: str
    subjectName: str
    credits: int = Field(ge=0)
    currentGrade: str
    currentGpa4: float = Field(ge=0, le=4)
    targetGrade: str
    urgency: str
    prerequisiteFor: list[str] = Field(default_factory=list)
    suggestedSemester: int = Field(ge=1, le=3)
    reason: str


class GpaRoadmapResponse(BaseModel):
    studentCode: str
    currentGpa: float
    targetGpa: float
    targetLabel: str
    isAchievable: bool
    requiredGpaRemaining: float
    subjectPlans: list[SubjectPlan] = Field(default_factory=list)
    summary: str
    semesterBreakdown: list[dict] = Field(default_factory=list)


class RetakeRoadmapRequest(BaseModel):
    studentCode: str
    failedSubjects: list[SubjectResult] = Field(default_factory=list)
    weakSubjects: list[SubjectResult] = Field(default_factory=list)
    remainingSubjects: list[SubjectResult] = Field(default_factory=list)
    currentSemester: int = Field(ge=1, le=3)
    currentYear: int = Field(ge=1)


class RetakeRoadmapResponse(BaseModel):
    studentCode: str
    urgentRetakes: list[RetakeSubject] = Field(default_factory=list)
    recommendedRetakes: list[RetakeSubject] = Field(default_factory=list)
    retakePlan: list[dict] = Field(default_factory=list)
    note: str


class SemesterPlanRequest(BaseModel):
    studentCode: str
    currentGpaAccumulated: float = Field(ge=0, le=4)
    targetGpa: float = Field(ge=0, le=4)
    registeredSubjects: list[SubjectResult] = Field(default_factory=list)
    weakSubjects: list[SubjectResult] = Field(default_factory=list)


class SemesterPlanResponse(BaseModel):
    studentCode: str
    currentGpa: float
    targetGpa: float
    predictedSemesterGpa: float
    requiredAverage: float
    subjectTargets: list[dict] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    summary: str
