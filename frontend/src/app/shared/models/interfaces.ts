export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

export type UserRole = 'admin' | 'teacher';
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
  semesterNumber: 1 | 2;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
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
  name: string;
  email: string;
  role: UserRole;
  departmentIds: Array<string | Department>;
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
  semester: 1 | 2 | 'both';
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
  semester: 1 | 2;
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
  semester: 1 | 2;
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
  semester?: 1 | 2;
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
