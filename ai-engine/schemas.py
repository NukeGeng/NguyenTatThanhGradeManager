from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    scores: dict[str, float] = Field(default_factory=dict)
    diem_hk_truoc: float = Field(default=0.0, ge=0, le=10)
    so_buoi_vang: int = Field(default=0, ge=0)
    hanh_kiem: int = Field(default=2, ge=0, le=3)
    # Diem tong ket da tinh he so (tu Grade model)
    finalScore: float | None = Field(default=None, ge=0, le=10)
    # GPA he 4
    gpa4: float | None = Field(default=None, ge=0, le=4)


class SemesterData(BaseModel):
    schoolYear: str = ""
    semester: int = Field(ge=1, le=3)
    finalScore: float = Field(ge=0, le=10)
    gpa4: float = Field(ge=0, le=4)
    attendanceAbsent: int = Field(default=0, ge=0)
    letterGrade: str = ""


class PredictAllRequest(BaseModel):
    studentCode: str
    semesters: list[SemesterData]


class PredictResponse(BaseModel):
    predicted_rank: str
    confidence: float
    risk_level: str
    weak_subjects: list[str]
    improve_subjects: list[str] = Field(default_factory=list)
    suggestions: list[str]
    analysis: str
    data_coverage: float = 0.0
    is_low_data: bool = False


class SubjectResult(BaseModel):
    subjectCode: str
    subjectName: str
    credits: int = Field(ge=0)
    gpa4: float = Field(default=0, ge=0, le=4)
    letterGrade: str = ""
    status: str
    isRequired: bool = True
    category: str = "theory"  # theory|practice|both|science|social|language|specialized|other


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
    weeklyPlan: list[str] = Field(default_factory=list)
    resources: list["StudyResource"] = Field(default_factory=list)


class StudyResource(BaseModel):
    title: str
    url: str
    type: str  # search|video|opencourse|docs


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
    weeklyPlan: list[str] = Field(default_factory=list)
    resources: list[StudyResource] = Field(default_factory=list)


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
