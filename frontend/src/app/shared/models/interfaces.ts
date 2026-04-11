export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

export type UserRole = 'admin' | 'teacher' | 'advisor';
export type Gender = 'male' | 'female';
export type StudentStatus = 'active' | 'inactive' | 'transferred';
export type PredictionRiskLevel = 'low' | 'medium' | 'high';
export type GradeLetter = 'A' | 'B' | 'C' | 'F';
export type NotificationType = 'risk_alert' | 'grade_entered' | 'prediction_done' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high';

export interface DefaultWeights {
  tx: number;
  gk: number;
  th: number;
  tkt: number;
}

export interface SemesterConfig {
  semesterNumber: 1 | 2 | 3;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isOptional?: boolean;
}

export interface Major {
  _id: string;
  code: string;
  name: string;
  departmentId: string | Department;
  totalCredits: number;
  durationYears: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CurriculumSubjectType = 'required' | 'elective' | 'prerequisite';

export interface CurriculumItem {
  subjectId: string | Subject;
  subjectCode: string;
  subjectName: string;
  credits: number;
  year: number;
  semester: 1 | 2 | 3;
  subjectType: CurriculumSubjectType;
  prerequisiteIds: string[];
  note?: string;
}

export interface Curriculum {
  _id: string;
  majorId: string | Major;
  schoolYear: string;
  name: string;
  items: CurriculumItem[];
  totalCredits: number;
  isActive: boolean;
  createdBy?: string | User;
  createdAt?: string;
  updatedAt?: string;
}

export type RegistrationStatus = 'registered' | 'completed' | 'failed' | 'retaking';

export interface StudentRegistration {
  subjectId: string | Subject;
  subjectCode: string;
  classId?: string | Class | null;
  schoolYear: string;
  semester: 1 | 2 | 3;
  status: RegistrationStatus;
  gradeId?: string | Grade | null;
  gpa4?: number | null;
  letterGrade?: string;
}

export interface StudentCurriculum {
  _id: string;
  studentId: string | Student;
  curriculumId: string | Curriculum;
  majorId?: string | Major | null;
  advisorId?: string | User | null;
  enrolledYear: string;
  registrations: StudentRegistration[];
  createdAt?: string;
  updatedAt?: string;
}

export type MessageRoomType = 'department' | 'direct';

export interface Message {
  _id: string;
  roomId: string;
  roomType: MessageRoomType;
  senderId: string | User;
  senderName: string;
  content: string;
  isRead: boolean;
  readBy: Array<string | User>;
  createdAt: string;
}

export interface MessageRoomSummary {
  roomId: string;
  roomType: MessageRoomType;
  roomName?: string;
  roomCode?: string;
  unreadCount: number;
  lastMessage?: Message | null;
}

export interface SubjectResult {
  subjectCode: string;
  subjectName: string;
  credits: number;
  gpa4: number;
  letterGrade: string;
  status: 'completed' | 'failed' | 'not_started' | 'in_progress';
  isRequired: boolean;
}

export interface SubjectPlan {
  subjectCode: string;
  subjectName: string;
  credits: number;
  targetGrade: 'A' | 'B';
  targetGpa4: number;
  priority: 'critical' | 'high' | 'normal';
  reason: string;
  semester: 1 | 2 | 3;
  year: number;
}

export interface GpaRoadmap {
  studentCode: string;
  currentGpa: number;
  targetGpa: number;
  targetLabel: string;
  isAchievable: boolean;
  requiredGpaRemaining: number;
  subjectPlans: SubjectPlan[];
  summary: string;
  semesterBreakdown: Array<{
    year: number;
    semester: 1 | 2 | 3;
    totalCredits: number;
    subjects: Array<{
      subjectCode: string;
      subjectName: string;
      credits: number;
      priority: 'critical' | 'high' | 'normal';
      targetGrade: 'A' | 'B';
    }>;
  }>;
}

export interface RetakeSubject {
  subjectCode: string;
  subjectName: string;
  credits: number;
  currentGrade: string;
  currentGpa4: number;
  targetGrade: string;
  urgency: 'urgent' | 'recommended';
  prerequisiteFor: string[];
  suggestedSemester: 1 | 2 | 3;
  reason: string;
}

export interface RetakeRoadmap {
  studentCode: string;
  urgentRetakes: RetakeSubject[];
  recommendedRetakes: RetakeSubject[];
  retakePlan: Array<{
    year: number;
    semester: 1 | 2 | 3;
    subjects: Array<{
      subjectCode: string;
      subjectName: string;
      urgency: 'urgent' | 'recommended';
      targetGrade: string;
    }>;
  }>;
  note: string;
}

export interface SemesterPlan {
  studentCode: string;
  currentGpa: number;
  targetGpa: number;
  predictedSemesterGpa: number;
  requiredAverage: number;
  warnings: string[];
  summary: string;
  subjectTargets: Array<{
    subjectCode: string;
    subjectName: string;
    credits: number;
    targetGrade: 'A' | 'B';
    targetGpa4: number;
    reason: string;
  }>;
}

export interface Department {
  _id: string;
  code: string;
  name: string;
  description?: string;
  headId?: string | User;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  _id: string;
  teacherCode?: string;
  name: string;
  email: string;
  role: UserRole;
  departmentIds: Array<string | Department>;
  advisingStudentIds?: Array<string | Student>;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolYear {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  semesters: SemesterConfig[];
  isCurrent: boolean;
  createdBy?: string | User;
  createdAt?: string;
}

export interface Subject {
  _id: string;
  code: string;
  name: string;
  departmentId: string | Department;
  credits: number;
  coefficient?: number;
  semester: 1 | 2 | 3 | 'all';
  category:
    | 'theory'
    | 'practice'
    | 'both'
    | 'science'
    | 'social'
    | 'language'
    | 'specialized'
    | 'other';
  defaultWeights: DefaultWeights;
  txCount: number;
  gradeLevel?: number[];
  isActive: boolean;
  createdAt?: string;
}

export interface Student {
  _id: string;
  studentCode: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  classId: string | Class;
  majorId?: string | Major | null;
  enrolledYear?: string;
  address?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  avatar?: string;
  notes?: string;
  status?: StudentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Class {
  _id: string;
  code: string;
  name: string;
  subjectId: string | Subject;
  departmentId: string | Department;
  schoolYearId: string | SchoolYear;
  semester: 1 | 2 | 3;
  teacherId: string | User | null;
  weights: DefaultWeights;
  txCount?: number;
  studentCount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Grade {
  _id: string;
  studentId: string | Student;
  classId: string | Class;
  subjectId: string | Subject;
  departmentId?: string | Department;
  schoolYearId: string | SchoolYear;
  semester: 1 | 2 | 3;
  weights: DefaultWeights;
  txScores: number[];
  gkScore: number | null;
  thScores: number[];
  tktScore: number | null;
  txAvg?: number | null;
  thAvg?: number | null;
  finalScore: number | null;
  gpa4: number | null;
  letterGrade: GradeLetter | null;
  isDuThi?: boolean;
  isVangThi?: boolean;
  enteredBy?: string | User;
  classAverageScore?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PredictionAtRiskSubject {
  subjectId: string;
  subjectName: string;
  currentGpa4: number;
  predictedGpa4: number;
  reason: string;
}

export interface Prediction {
  _id: string;
  studentId: string | Student;
  schoolYearId?: string | SchoolYear;
  semester?: 1 | 2 | 3;
  gradeId?: string | Grade;
  predictedGpaHK?: number;
  predictedDiemTB?: number;
  predictedRank: 'Giỏi' | 'Khá' | 'Trung Bình' | 'Yếu';
  confidence: number;
  riskLevel: PredictionRiskLevel;
  atRiskSubjects?: PredictionAtRiskSubject[];
  weakSubjects: string[];
  suggestions: string[];
  analysis: string;
  isRead?: boolean;
  createdAt?: string;
}

export interface NotificationData {
  studentId?: string;
  classId?: string;
  departmentId?: string;
  gradeId?: string;
  predictionId?: string;
}

export interface Notification {
  _id: string;
  userId: string | User;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  userId: string | User;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PREDICT';
  resource: string;
  resourceId?: string;
  description?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuthPayload {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  departmentIds: string[];
}
