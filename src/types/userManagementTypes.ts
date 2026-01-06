export type UserRole = "user" | "admin" | "managementStaff" | "userStudent" | "userParent" | "userTeacher" | "userClassTeacher" | "userStaff";

export interface TeacherAssignment {
  id?: string;
  teacherGrade: string;
  teacherClass: string;
  subject: string;
  medium: string;
  staffNo?: string;
  modifiedBy?: string;
}

export interface Subject {
  id: number;
  subjectId: number | null;
  grade: string | null;
  mainSubject: string;
  subSubject: string | null;
  description: string | null;
  medium: string;
  created_at: string;
  updated_at: string;
}

export interface BaseUser {
  id?: number;
  name: string;
  username: string;
  email: string;
  userType: "Student" | "Teacher" | "Parent" | "ManagementStaff";
  status: boolean;
  userRole?: UserRole;
  password?: string;
  address?: string;
  birthDay?: string;
  contact?: string;
  gender?: string;
photo?: string | null;
  location?: string;
}

export interface User extends BaseUser {
  // Common fields that might be used across different user types
  grade?: string;
  class?: string;
  medium?: string;
  subject?: string;
  staffNo?: string;
  
  // Teacher specific fields
  teacherData?: TeacherAssignment[];
  teacherAssignments?: TeacherAssignment[]; 
  
  // Student specific fields
  studentGrade?: string;
  studentClass?: string;
  studentData?: {
    studentGrade: string;
    studentClass: string;
    medium: string;
    studentAdmissionNo?: string;
  };
  
  // Parent specific fields
  profession?: string;
  parentContact?: string;
  studentAdmissionNo?: string;
  relation?: string;
  parentData?: {
    profession: string;
    parentContact: string;
    studentAdmissionNo: string;
    relation: string;
  };
  parentEntries?: Array<{
    relation: string;
    profession: string;
    parentContact: string;
    studentAdmissionNo: string;
  }>;
  
  // Staff specific fields
  staffData?: Array<{
    designation?: string;
    department?: string;
    staffContact?: string;
    staffId?: string;
  }>;
  staffEntries?: Array<{
    designation: string;
    department: string;
    staffContact: string;
    staffId: string;
  }>;
  designation?: string;
  department?: string;
  staffContact?: string;
  staffId?: string;
}

export interface UserListResponse {
  users: any;
  data: User[];
}

export interface UserResponse {
  data: User;
}

export const statusOptions = [
  { value: true, label: 'Active' },
  { value: false, label: 'Inactive' }
];

// Add missing option arrays
export const genderOptions: string[] = [
  'Male',
  'Female',
  'Other'
];

export const relationOptions: string[] = [
  'Father',
  'Mother',
  'Guardian'
];

export const gradeOptions: string[] = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'Grade 13'
];

export const classOptions: string[] = [
  "Araliya", "Olu", "Nelum", "Rosa", "Manel", "Sooriya", "Kumudu"
];

export const mediumOptions: string[] = [
  'sinhala',
  'english',
  'tamil'
];

export const userRoleOptions: UserRole[] = [
  'user',
  'admin',
  'managementStaff',
  'userStudent',
  'userParent',
  'userTeacher',
  'userClassTeacher'
];

export const userTypeOptions: string[] = [
  'Student',
  'Teacher',
  'Parent',
  'ManagementStaff'
];


