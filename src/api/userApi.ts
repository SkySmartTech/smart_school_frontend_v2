import axios from "axios";
import { z } from "zod";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

export const userSchema = z.object({
    name: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    address: z.string().min(1, "Address is required"),
    birthDay: z.string().min(1, "Birthday is required"),
    contact: z
      .string()
      .min(10, "Phone must be at least 10 digits")
      .max(15, "Phone must be at most 15 digits"),
    userType: z.string().min(1, "Role is required"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be less than 20 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    password_confirmation: z.string().min(1, "Please confirm your password"),

    photo: z.instanceof(File).optional(),

    gender: z.string().optional(),
    location: z.string().optional(),
    userRole: z.string().min(1, "User role is required"),

    // Teacher specific fields
    grade: z.string().min(1, "Grade is required"),
    subject: z.string().min(1, "Subject is required"),
    class: z.string().min(1, "Class is required"),
    staffId: z.string().min(1, "Staff ID is required"),
    teacherStaffId: z.string().min(1, "Teacher Staff ID is required"),
    teacherGrades: z.array(z.string().min(1)).nonempty("At least one grade is required"),
    teacherClass: z.array(z.string().min(1)).nonempty("At least one class is required"),
    subjects: z.array(z.string().min(1)).nonempty("At least one subject is required"),
    staffNo: z.string().min(1, "Staff number is required"),
    medium: z.array(z.string().min(1)).nonempty("At least one medium is required"),

    // Student specific fields
    studentGrade: z.string().min(1, "Student grade is required"),
    studentClass: z.string().min(1, "Student class is required"),
    studentAdmissionNo: z
      .string()
      .min(5, "Student admission number must be at least 5 digits")
      .max(10, "Student admission number must be at most 10 digits"),
    parentContact: z
      .string()
      .min(10, "Parent phone must be at least 10 digits")
      .max(15, "Parent phone must be at most 15 digits"),
    parentProfession: z.string().min(1, "Parent profession is required"),

    // Parent specific fields
    profession: z.string().min(1, "Profession is required"),
    relation: z.string().min(1, "Relation is required"),
  
}).refine(data => data.password === data.password_confirmation, {
  message: "Passwords don't match",
  path: ["password_confirmation"],
});

export type User = z.infer<typeof userSchema>;

export async function registerUser(userData: FormData) {
  try {
    const response = await API.post("/api/user-register", userData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
    throw new Error("Registration failed");
  }
}

// Role-specific registration functions
export async function registerStudent(studentData: FormData) {
  try {
    // Try reading a JSON string payload first (preferred)
    const raw = studentData.get('studentData');
    let studentArr: any[] = [];

    if (raw) {
      try {
        studentArr = JSON.parse(raw as string);
      } catch (e) {
        // If parsing fails, try to treat raw as single JSON object string
        const maybe = raw as string;
        try {
          const parsed = JSON.parse(maybe);
          studentArr = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          studentArr = [];
        }
      }
    } else {
      // fallback: convert individual fields into a single-item array
      studentArr = [
        {
          studentGrade: studentData.get('studentGrade'),
          medium: studentData.get('medium'),
          studentClass: studentData.get('studentClass'),
          studentAdmissionNo: studentData.get('studentAdmissionNo'),
          userId: studentData.get('userId'),
          userType: studentData.get('userType'),
        },
      ];
    }

    // Ensure we have userId and userType (from FormData)
    const headerUserId = studentData.get('userId') ? String(studentData.get('userId')) : (studentArr[0]?.userId ? String(studentArr[0].userId) : undefined);
    const headerUserType = studentData.get('userType') ? String(studentData.get('userType')) : (studentArr[0]?.userType ? String(studentArr[0].userType) : undefined);

    // If we have a single student payload, send its fields directly (backend store expects fields, not an array),
    // and send userId/userType in headers because backend controller reads them from headers.
    if (studentArr.length === 1) {
      const item = studentArr[0];

      const requestBody = {
        studentGrade: item.studentGrade,
        studentClass: item.studentClass,
        medium: item.medium,
        studentAdmissionNo: item.studentAdmissionNo,
        // other optional fields accepted by backend can be included here if needed
        parentContact: item.parentContact ?? null,
        parentProfession: item.parentProfession ?? null,
      };

      const response = await API.post(
        "/api/user-student-register",
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(headerUserId ? { 'userId': headerUserId } : {}),
            ...(headerUserType ? { 'userType': headerUserType } : {}),
          }
        }
      );

      return response.data;
    }

    // If multiple entries (bulk) are provided, send them as studentData array.
    // Again set headers for userId/userType if present (useful for some backend flows).
    const requestBody = {
      studentData: studentArr.map((item: any) => ({
        studentGrade: item.studentGrade,
        studentClass: item.studentClass,
        medium: item.medium,
        studentAdmissionNo: item.studentAdmissionNo,
        userId: item.userId ?? headerUserId,
        userType: item.userType ?? headerUserType,
      }))
    };

    const response = await API.post(
      "/api/user-student-register",
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(headerUserId ? { 'userId': headerUserId } : {}),
          ...(headerUserType ? { 'userType': headerUserType } : {}),
        }
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Student registration failed");
    }
    throw new Error("Student registration failed");
  }
}

export async function registerTeacher(teacherData: FormData) {
  try {
    // Convert FormData to an array of teacher assignments
    const teacherAssignments = JSON.parse(teacherData.get('teacherAssignments') as string);
    const staffNo = teacherData.get('staffNo'); // Get staffNo from FormData

    if (!staffNo) {
      throw new Error("Staff number is required");
    }

    // Create the request body in the expected format
    const requestBody = {
      teacherData: teacherAssignments.map((assignment: any) => ({
        teacherGrade: assignment.teacherGrade,
        teacherClass: assignment.teacherClass,
        subject: assignment.subject,
        medium: assignment.medium,
        staffNo: staffNo, 
        userId: teacherData.get('userId'),
        userType: teacherData.get('userType')
      }))
    };

    const response = await API.post("/api/user-teacher-register", requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Teacher registration failed");
    }
    throw new Error("Teacher registration failed");
  }
}

export async function registerParent(parentData: FormData) {
  try {
    // Parse parent data array from FormData
    const rawParentData = parentData.get('parentData');
    
    if (!rawParentData) {
      throw new Error("Parent data is required");
    }

    const parentAssignments = JSON.parse(rawParentData as string);
    
    if (!parentAssignments || !parentAssignments.length) {
      throw new Error("Parent data is required");
    }

    // Validate that all required fields are present
    const requiredFields = ['studentAdmissionNo', 'profession', 'relation', 'parentContact'];
    const firstAssignment = parentAssignments[0];
    
    for (const field of requiredFields) {
      if (!firstAssignment[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Create the request body in the expected format
    const requestBody = {
      parentData: parentAssignments.map((assignment: any) => ({
        studentAdmissionNo: assignment.studentAdmissionNo,
        profession: assignment.profession,
        relation: assignment.relation,
        parentContact: assignment.parentContact,
        userId: assignment.userId,
        userType: assignment.userType,
        status: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
    };

    console.log('Sending parent data:', JSON.stringify(requestBody, null, 2)); 

    const response = await API.post("/api/user-parent-register", requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Parent registration error:', error); 
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Parent registration failed");
    }
    throw new Error("Parent registration failed");
  }
}

export async function loginUser(credentials: { username: string; password: string }) {
  try {
    const response = await API.post("/auth/login", credentials);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
    throw new Error("Login failed");
  }
}

export async function getUserProfile(userId: string) {
  try {
    const response = await API.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Failed to fetch profile");
    }
    throw new Error("Failed to fetch profile");
  }
}

export async function updateUserProfile(userId: string, userData: Partial<User>) {
  try {
    const response = await API.patch(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Update failed");
    }
    throw new Error("Update failed");
  }
}

export async function validateUser() {
  try {
    const response = await API.get("/auth/validate");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Validation failed");
    }
    throw new Error("Validation failed");
  }
}

export async function sendForgotPasswordOtp(payload: { email: string }) {
  try {
    const response = await API.post("/api/forgot-password/send-otp", payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Failed to send OTP");
    }
    throw new Error("Failed to send OTP");
  }
}

export async function verifyForgotPasswordOtp(payload: { email: string; otp: string }) {
  try {
    const response = await API.post("/api/forgot-password/verify-otp", payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "OTP verification failed");
    }
    throw new Error("OTP verification failed");
  }
}

export async function resetForgotPassword(payload: { email: string; password: string; password_confirmation: string }) {
  try {
    const response = await API.post("/api/forgot-password/reset", payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Password reset failed");
    }
    throw new Error("Password reset failed");
  }
}

export const authService = {
  register: registerUser,
  login: loginUser,
  validate: validateUser,
  getProfile: getUserProfile,
  updateProfile: updateUserProfile,
};