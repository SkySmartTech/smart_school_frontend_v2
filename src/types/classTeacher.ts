export interface ClassTeacher {
  id: number;
  grade: string;
  class: string;
  teacher_id: number;
  teacher_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Teacher {
  id: number;
  name: string;
  staff_no: string;
  email: string;
  contact: string;
  user_type: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClassTeacherAssignment {
  grade: string;
  class: string;
  teacher_id: number;
}

export interface GradeClassData {
  grade: string;
  classes: string[];
}