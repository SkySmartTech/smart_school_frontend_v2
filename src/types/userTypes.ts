// src/types/userTypes.ts
export interface User {
  id: number;
  name: string;
  address: string;
  password: string;
  birthDay: string;
  email: string;
  userType: string;
  gender: string;
  userRole: string;
  username: string;
  location: string;
  grade: string;
  contact: string;
  photo: string | null;
  subject: string;
  class: string;
  epf?: string;
  teacher_data: TeacherData | null;
  parent_data: ParentData | null;
  student_data: StudentData | null;
  status?: boolean;
  created_at?: string;
  updated_at?: string;
  access?: any[];
}

export interface TeacherData {
  teacher_info?: TeacherInfo[];
  id?: number;
  teacherGrade?: string;
  teacherClass?: string;
  subject?: string;
  medium?: string;
  staffNo?: string;
  userId?: string;
  userType?: string;
  modifiedBy?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeacherInfo {
  id: number;
  teacherGrade: string;
  teacherClass: string;
  subject: string;
  medium: string;
  staffNo: string;
  userId: string;
  userType: string;
  modifiedBy: string;
  created_at: string;
  updated_at: string;
}

// FIXED: Proper ParentData interface
export interface ParentData {
  parent_info?: ParentInfo;
  students_info?: StudentInfo[];
  id?: number;
  profession?: string;
  relation?: string;
  parent_contact?: string;
  created_at?: string;
  updated_at?: string;
}

// FIXED: Added proper ParentInfo interface
export interface ParentInfo {
  id: number;
  profession: string;
  relation: string;
  parent_contact: string;
  created_at?: string;
  updated_at?: string;
  studentAdmissionNo?: string; // Added this field
}

// FIXED: Added proper StudentInfo interface for parent data
export interface StudentInfo {
  name: string | null;
  studentAdmissionNo: string;
  grade: string;
  class: string | null;
}

export interface StudentData {
  id: number;
  studentGrade: string;
  studentClass: string;
  medium: string;
  studentAdmissionNo: string;
  year: string;
  userType: string;
  userId: string;
  modifiedBy: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoUploadResponse {
  photoUrl: string;
  message?: string;
}