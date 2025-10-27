import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface Student {
  id: string;
  admissionNo: string;
  name: string;
  grade: string;
  class: string;
  medium: string;
  year: string;
}

export interface StudentPromotionData {
  name: string;
  studentAdmissionNo: string;
  year: string | number;
  studentGrade: string;
  studentClass: string;
}

export interface PromoteStudentsRequest {
  students: StudentPromotionData[];
}

export interface SearchStudentsParams {
  year?: string;
  grade?: string;
  class?: string;
  search?: string;
}
interface GradeResponse {
  id: number;
  gradeId: string | null;
  grade: string;
  description: string;
  schoolId: string | null;
  created_at: string;
  updated_at: string;
}

// Auth header function
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

// Fetch students with search and filter capabilities (kept for backward compat)
export async function fetchStudents(params?: SearchStudentsParams): Promise<Student[]> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.year) queryParams.append('year', params.year);
    if (params?.grade) queryParams.append('grade', params.grade);
    if (params?.class) queryParams.append('class', params.class);

    const url = `${API_BASE_URL}/api/students${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const res = await axios.get(url, getAuthHeader());
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    handleApiError(error, "fetchStudents");
    return [];
  }
}

// New: fetch students for a specific year/grade/class
// GET /api/class-students/{year}/{grade}/{class}
export async function fetchClassStudents(year: string, grade: string, className: string): Promise<Student[]> {
  try {
    const res = await axios.get(
      `${API_BASE_URL}/api/class-students/${encodeURIComponent(year)}/${encodeURIComponent(grade)}/${encodeURIComponent(className)}`,
      getAuthHeader()
    );

    const raw = Array.isArray(res.data) ? res.data : [];

    // Each item in raw is a user object containing `student` nested object per your sample.
    // Map to Student[] with fields: id, admissionNo, name, grade, class, medium, year
    const mapped: Student[] = raw.flatMap((item: any, idx: number) => {
      const student = item.student ?? item.student_data ?? null;
      if (!student) {
        // If no nested student object, try to map using available fields, otherwise skip
        const id = item.id ?? `unknown-${idx}`;
        return [{
          id: String(id),
          admissionNo: item.studentAdmissionNo ?? item.admissionNo ?? "",
          name: item.name ?? "",
          grade: item.studentGrade ?? "",
          class: item.studentClass ?? "",
          medium: item.medium ?? "",
          year: item.year ?? ""
        }];
      }

      return [{
        id: String(student.userId ?? student.id ?? item.id ?? `s-${idx}`),
        admissionNo: student.studentAdmissionNo ?? student.studentAdmissionNo ?? "",
        name: item.name ?? "",
        grade: student.studentGrade ?? "",
        class: student.studentClass ?? "",
        medium: student.medium ?? "",
        year: student.year ?? ""
      }];
    });

    return mapped;
  } catch (error) {
    handleApiError(error, "fetchClassStudents");
    return [];
  }
}

// Promote students to next year
export async function promoteStudents(request: PromoteStudentsRequest): Promise<{success: boolean; message: string}> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/students-grade-update`, 
      request, // Send the properly formatted request
      getAuthHeader()
    );
    return {
      success: true,
      message: response.data?.message || "Students promoted successfully"
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      return {
        success: false,
        message: error.response.data.message
      };
    }
    handleApiError(error, "promoteStudents");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to promote students"
    };
  }
}

// Get available years
export async function getAvailableYears(): Promise<string[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/years`, getAuthHeader());
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    handleApiError(error, "getAvailableYears");
    return [];
  }
}

// Get available grades
export async function getAvailableGrades(): Promise<string[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/grades`, getAuthHeader());
    if (Array.isArray(res.data)) {
      return res.data.map((item: GradeResponse) => item.grade);
    }
    return [];
  } catch (error) {
    handleApiError(error, "getAvailableGrades");
    return [];
  }
}

interface ClassResponse {
  id: number;
  classId: string | null;
  class: string;
  description: string;
  gradeId: string | null;
  created_at: string;
  updated_at: string;
}

export async function getAvailableClasses(_grade: string): Promise<string[]> {
  try {
    const res = await axios.get(
      `${API_BASE_URL}/api/grade-classes`, // Fixed: using the correct endpoint
      getAuthHeader()
    );
    
    // Check if response data is an array and map to get only class names
    if (Array.isArray(res.data)) {
      return res.data.map((item: ClassResponse) => item.class);
    }
    return [];
  } catch (error) {
    handleApiError(error, "getAvailableClasses");
    return [];
  }
}

const handleApiError = (error: any, _operation: string) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      throw new Error('Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      throw new Error('You do not have permission to perform this action.');
    } else if (error.response?.status === 404) {
      throw new Error('The requested resource was not found.');
    } else if (error.response?.status === 500) {
      throw new Error('Server error. Please try again later.');
    } else {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        `Request failed with status ${error.response?.status}`
      );
    }
  } else if (error.request) {
    throw new Error("Network error. Please check your connection and try again.");
  } else {
    throw new Error(error.message || "An unexpected error occurred. Please try again.");
  }
};