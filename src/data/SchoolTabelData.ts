export type MarksTableData = {
  id: number;
  student_admission: string;
  student_name: string;
  term: string;
  marks: string;
  student_grade: string;
  subject : string;
};

export type ClassTableData = {
  id: number;
  class_id : string;
  grade_id : string;
  student_name: string;
  class: string;
  description:string;
};

export type UserTableData = {
  id: number;
  user_role: string;
  name: string;
  user_name: string;
  user_type: string;
  contact_no: string;
  birthday: string;
  address: string;
  location: string;
  email: string;
  gender: string;
  photo: string;
  created_at: string;
  status: string;
  user_id: string;
};
  
  
  export const marks_table: MarksTableData[] = [
    { id: 1, student_admission: "stid001", student_name: "Nicoly", subject: "Mathematics", term: "2nd Term", marks: "89", student_grade: "A" },
    { id: 2, student_admission: "stid002", student_name: "Frank", subject: "Mathematics", term: "2nd Term", marks: "98", student_grade: "A" },
    { id: 3, student_admission: "stid003", student_name: "Jcob", subject: "Mathematics", term: "2nd Term", marks: "75", student_grade: "A" },
    { id: 4, student_admission: "stid004", student_name: "Jane", subject: "Mathematics", term: "2nd Term", marks: "65", student_grade: "B" },
    { id: 5, student_admission: "stid005", student_name: "Alex", subject: "Mathematics", term: "2nd Term", marks: "85", student_grade: "A" },
  ];

export const class_table: ClassTableData[] = [
    { id: 1, class:"10-B", student_name: "Nicoly", description:"Sample Text1", class_id: "cls010_B", grade_id: "10"},
    { id: 2, class:"10-B", student_name: "Nicoly", description:"Sample Text1", class_id: "cls010_B", grade_id: "10"},
    { id: 3, class:"10-B", student_name: "Nicoly", description:"Sample Text1", class_id: "cls010_B", grade_id: "10"},
    { id: 4, class:"10-B", student_name: "Nicoly", description:"Sample Text1", class_id: "cls010_B", grade_id: "10"},
    { id: 5, class:"10-B", student_name: "Nicoly", description:"Sample Text1", class_id: "cls010_B", grade_id: "10"},
  ];

export const user_table: UserTableData[] = [
    {id: 1, user_role: "admin", name: "Mrs.H.K.M.P.D.Perera", user_name: "Mrs.H.K.M.P.D.Perera", user_type: "Teacher", contact_no: '0758952621', birthday: '1996/12/26', address: "471,Galle Road", location: 'https://maps.app.goo.gl/kMi5m63ov24N7z5h7', email: 'testperera25@gmail.com', gender: 'female', photo: '', created_at: '', status: 'active', user_id: "usr010",},
    
  ];