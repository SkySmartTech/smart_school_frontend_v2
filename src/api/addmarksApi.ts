// src/api/addmarksApi.ts
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ==========================
// Types & Interfaces
// ==========================

export interface StudentMark {
  id: number;
  student_admission: string;
  student_name: string;
  student_grade: string;
  student_class: string;
  subject: string;
  term: string;
  marks: string;
  student_grade_value?: string;
  month?: string | null; // allow null for month when not applicable
  year?: string;
  status?: boolean; // true = present, false = absent
}

export interface FetchMarksFilters {
  grade?: string;
  class?: string;
  subject?: string;
  term?: string;
  month?: string;
  searchQuery?: string;
}

export interface DropdownOption {
  label: string;
  value: string;
}

export interface AdmissionData {
  id: number;
  student_admission: string;
  student_name: string;
}

export interface TeacherDataItem {
  id: number;
  teacherGrade: string;
  teacherClass: string;
  subject: string;
  medium: string;
  staffNo: string;
  userId: string;
  userType: string;
  modifiedBy: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileResponse {
  id: number;
  name: string;
  address: string;
  email: string;
  birthDay: string;
  contact: string;
  userType: string;
  gender: string;
  location: string | null;
  username: string;
  photo: string | null;
  userRole: string;
  status: boolean;
  created_at: string;
  updated_at: string;
  teacher_data: TeacherDataItem[];
  access: string[];
}

// ==========================
// Auth Helpers
// ==========================

const getAuthHeader = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token');

  if (!token) {
    console.error('No authentication token found in localStorage');
    throw new Error('Authentication token not found. Please login again.');
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
};

// ==========================
// Error Handling
// ==========================

const handleApiError = (error: any, operation: string) => {
  if (error instanceof Error) {
    console.error(`Error in ${operation}:`, error.message);
  } else if (typeof error === 'object' && error !== null) {
    console.error(`Error in ${operation}:`, JSON.stringify(error));
  } else {
    console.error(`Error in ${operation}:`, String(error));
  }

  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 401:
        throw new Error("Authentication failed. Please login again.");
      case 403:
        throw new Error("You do not have permission to perform this action.");
      case 404:
        throw new Error("The requested resource was not found.");
      case 422:
        throw new Error(data?.message || "Validation error. Please check your input.");
      case 500:
        throw new Error("Server error. Please try again later.");
      default:
        throw new Error(data?.message || `Error: ${status}`);
    }
  } else if (error.request) {
    throw new Error("Network error. Please check your connection and try again.");
  } else {
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

// ==========================
// API Functions
// ==========================

export async function fetchStudentMarks(filters: FetchMarksFilters): Promise<StudentMark[]> {
  try {
    const requestBody = {
      grade: filters.grade || "",
      class: filters.class || "",
      subject: filters.subject || "",
      term: filters.term || "",
      month: filters.month || "",
      search: filters.searchQuery || "",
    };

    const res = await axios.post(`${API_BASE_URL}/api/add-marks`, requestBody, getAuthHeader());
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    handleApiError(error, "fetchStudentMarks");
    return [];
  }
}

export async function submitStudentMarks(marksToSubmit: Partial<StudentMark>[]): Promise<void> {
  try {
    const formattedMarks = marksToSubmit.map(mark => {
      // Normalize month to either trimmed string or '0' when not provided
      const monthValue = (mark.month !== undefined && mark.month !== null && String(mark.month).toString().trim() !== '')
        ? String(mark.month).trim()
        : '0';

      return {
        studentAdmissionNo: mark.student_admission ? String(mark.student_admission).trim() : undefined,
        studentName: String(mark.student_name ?? '').trim(),
        studentGrade: String(mark.student_grade ?? '').trim(),
        studentClass: String(mark.student_class ?? '').trim(),
        term: String(mark.term ?? '').trim(),
        month: monthValue, // '0' when not provided
        subject: String(mark.subject ?? '').trim(),
        medium: "English",
        marks: Number(mark.marks ?? 0),
        marksGrade: String(mark.student_grade_value ?? 'N/A').trim(),
        year: mark.year !== undefined && mark.year !== null ? String(mark.year).trim() : '',
        status: mark.status !== undefined ? mark.status : true // Default to present if not specified
      };
    });

    // Validation:
    // - studentName, marksGrade, year must be present
    // - month is required only when term indicates a Monthly term (treat '0' as missing for Monthly)
    const isValid = formattedMarks.every(mark => {
      if (!mark.studentName) return false;
      if (!mark.marksGrade) return false;
      if (!mark.year) return false;

      const term = (mark.term || '').toString().toLowerCase();
      const requiresMonth = term.includes('monthly'); // treat any term containing 'monthly' as requiring month
      if (requiresMonth && (mark.month === null || mark.month === undefined || String(mark.month).trim() === '' || String(mark.month).trim() === '0')) {
        return false;
      }

      return true;
    });

    if (!isValid) {
      throw new Error("Missing required fields in marks submission (month is required for Monthly term)");
    }

    await axios.post(`${API_BASE_URL}/api/add-marks`, {
      marks: formattedMarks
    }, getAuthHeader());
  } catch (error) {
    handleApiError(error, "submitStudentMarks");
  }
}

export async function fetchGradesFromApi(): Promise<DropdownOption[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/user`, getAuthHeader());
    
    if (res.data && Array.isArray(res.data.teacher_data.teacher_info)) {
      // Extract unique grades from teacher_data
      const uniqueGrades = Array.from(
        new Set(res.data.teacher_data.teacher_info.map((item: TeacherDataItem) => item.teacherGrade))
      ).filter((grade): grade is string => typeof grade === 'string' && grade !== '');
      
      return uniqueGrades.map(grade => ({
        label: grade,
        value: grade
      }));
    }
    
    return [];
  } catch (error) {
    handleApiError(error, "fetchGradesFromApi");
    return [];
  }
}

export async function fetchClassesFromApi(grade?: string): Promise<DropdownOption[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/user`, getAuthHeader());
    
    if (res.data && Array.isArray(res.data.teacher_data.teacher_info)) {
      let classes = res.data.teacher_data.teacher_info;

      // Filter by grade if provided
      if (grade) {
        classes = classes.filter((item: TeacherDataItem) => item.teacherGrade === grade);
      }
      
      // Extract unique classes
      const uniqueClasses = Array.from(
        new Set(classes.map((item: TeacherDataItem) => item.teacherClass))
      ).filter((className): className is string => typeof className === 'string' && className !== '');
      
      return uniqueClasses.map(className => ({
        label: className,
        value: className
      }));
    }
    
    return [];
  } catch (error) {
    handleApiError(error, "fetchClassesFromApi");
    return [];
  }
}

export async function fetchSubjectsFromApi(grade: string, classValue: string): Promise<DropdownOption[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/user`, getAuthHeader());
    
    if (res.data && Array.isArray(res.data.teacher_data.teacher_info)) {
      const subjects = res.data.teacher_data.teacher_info.filter((item: TeacherDataItem) => 
        item.teacherGrade === grade && item.teacherClass === classValue
      );
      
      const uniqueSubjects = Array.from(
        new Set(subjects.map((item: TeacherDataItem) => item.subject))
      ).filter((subject): subject is string => typeof subject === 'string' && subject !== '');
      
      return uniqueSubjects.map(subject => ({
        label: subject,
        value: subject.toLowerCase()
      }));
    }
    
    return [];
  } catch (error) {
    handleApiError(error, "fetchSubjectsFromApi");
    return [];
  }
}

// New function to fetch admission data
export async function fetchAdmissionData(grade: string, classValue: string, keyword?: string): Promise<AdmissionData[]> {
  try {
    const params: Record<string, string> = {};
    if (keyword) {
      params.keyword = keyword;
    }
    
    const res = await axios.get(
      `${API_BASE_URL}/api/search-admission-data/${encodeURIComponent(grade)}/${encodeURIComponent(classValue)}`, 
      {
        ...getAuthHeader(),
        params
      }
    );
    
    // Transform the API response to match our expected format
    return Array.isArray(res.data) 
      ? res.data.map((item: any, index: number) => ({
          id: index + 1,
          student_admission: item.studentAdmissionNo || item.admissionNo || '',
          student_name: item.name || item.studentName || '',
        }))
      : [];
  } catch (error) {
    handleApiError(error, "fetchAdmissionData");
    return [];
  }
}

// New function to calculate grade
export async function calculateGrade(marks: string): Promise<string> {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/calculate-grade/${marks}`, getAuthHeader());
    return res.data.grade || "N/A";
  } catch (error) {
    handleApiError(error, "calculateGrade");
    return "Error";
  }
}

// ==========================
// Auth Utilities
// ==========================

export const hasAuthToken = (): boolean => !!localStorage.getItem("authToken");
export const clearAuthToken = (): void => localStorage.removeItem("authToken");
export const setAuthToken = (token: string): void => {
  if (!token || !token.trim()) throw new Error("Invalid token provided");
  localStorage.setItem("authToken", token.trim());
};
export const getAuthToken = (): string | null => localStorage.getItem("authToken");
export const isValidTokenFormat = (token: string | null): boolean => {
  if (!token) return false;
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
};