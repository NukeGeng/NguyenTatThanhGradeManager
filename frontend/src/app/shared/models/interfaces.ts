export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

export type UserRole = 'admin' | 'teacher';

export interface Department {
  _id: string;
  code: string;
  name: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentIds: Array<string | Department>;
  isActive?: boolean;
  lastLogin?: string | null;
}

export interface Student {
  _id: string;
  studentCode: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: 'male' | 'female' | null;
  classId: string;
  parentPhone?: string;
  status?: 'active' | 'inactive' | 'transferred';
}

export interface Class {
  _id: string;
  code: string;
  name: string;
  subjectId: string;
  departmentId: string;
  schoolYearId: string;
  semester: 1 | 2;
  teacherId?: string | null;
  studentCount: number;
  isActive: boolean;
}

export interface Grade {
  _id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  semester: 1 | 2;
  txScores: number[];
  gkScore: number | null;
  thScores: number[];
  tktScore: number | null;
  finalScore: number | null;
  gpa4: number | null;
  letterGrade: 'A' | 'B' | 'C' | 'F' | null;
}

export interface Prediction {
  _id: string;
  studentId: string;
  gradeId: string;
  predictedRank: 'Giỏi' | 'Khá' | 'Trung Bình' | 'Yếu';
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  weakSubjects: string[];
  suggestions: string[];
  analysis: string;
  createdAt?: string;
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
