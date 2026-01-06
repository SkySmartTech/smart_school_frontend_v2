import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Types
export interface DropdownOption {
  label: string;
  value: string;
}

export interface MarksStatusItem {
  staffNo: string;
  teacher_name: string | null;
  teacherGrade: string;
  subject: string;
  teacherClass: string;
  marks_submitted: boolean;
  student_count: number;
  given_marks_count: number;
}

// Helper: auth header
const getAuthHeader = () => {
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  if (!token) {
    console.error("No authentication token found in localStorage");
    // throw to let caller handle
    throw new Error("Authentication token not found. Please login again.");
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
};

const handleApiError = (error: any, operation = "api") => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      switch (status) {
        case 401:
          localStorage.removeItem("authToken");
          localStorage.removeItem("token");
          localStorage.removeItem("access_token");
          throw new Error("Session expired. Please login again.");
        case 403:
          throw new Error("Access denied. You do not have permission.");
        case 404:
          throw new Error("Requested resource not found.");
        default:
          throw new Error(data?.message || data?.error || `Request failed (${status})`);
      }
    } else if (error.request) {
      throw new Error("Network error. Please check your connection.");
    }
  }
  // fallback
  throw new Error(error?.message || `Unknown error in ${operation}`);
};

export async function fetchGradesFromApi(): Promise<DropdownOption[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/grades`, getAuthHeader());
    if (!Array.isArray(res.data)) return [];

    return res.data.map((item: any) => {
      const gradeValue = item.grade ?? item.id ?? item.value ?? item.name ?? "";
      const gradeLabel = gradeValue ? `${gradeValue}` : "Unknown Grade";
      return {
        label: gradeLabel,
        value: String(gradeValue),
      };
    });
  } catch (err) {
    handleApiError(err, "fetchGradesFromApi");
    return []; // unreachable because handleApiError throws, but keeps TS happy
  }
}

export async function fetchYearsFromApi(): Promise<string[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/years`, getAuthHeader());
    if (!Array.isArray(res.data)) return [];

    // Extract year values from objects if they contain a year property
    return res.data.map((item: any) =>
      typeof item === 'string' ? item : item.year
    );
  } catch (err) {
    handleApiError(err, "fetchYearsFromApi");
    return [];
  }
}

/**
 * Fetch marks status data.
 * year: string (hardcoded value from UI)
 * grade: string (value from grades dropdown)
 * examYear: string (added examYear parameter)
 * exam: string (e.g., "First", "Mid", "End", "Monthly")
 * month: string, two-digit month like "01".."12". If exam !== "Monthly" pass ignored and backend receives "null".
 */
export const fetchMarksStatus = async (
  year: string,
  grade: string,
  examYear: string, // Added examYear parameter
  exam: string,
  month: string = "01"
): Promise<MarksStatusItem[]> => {
  try {
    if (!year || !grade || !examYear || !exam) {
      throw new Error("Missing required parameters: year, grade, examYear, or exam");
    }

    // If Monthly exam, use month as provided ("01".."12"), else send "null"
    const monthParam = exam === "Monthly" ? month : "0";

    const url = `${API_BASE_URL}/api/marks-status/${encodeURIComponent(year)}/${encodeURIComponent(
      grade
    )}/${encodeURIComponent(examYear)}/${encodeURIComponent(exam)}/${encodeURIComponent(monthParam)}`.replace(/([^:]\/)\/+/g, "$1");

    const res = await axios.get(url, {
      ...getAuthHeader(),
      timeout: 10000,
      withCredentials: true,
    });

    if (!Array.isArray(res.data)) {
      // If API returns an object wrapper, attempt to extract array
      if (res.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    }

    return res.data as MarksStatusItem[];
  } catch (err) {
    handleApiError(err, "fetchMarksStatus");
    return []; // for TS; handleApiError typically throws
  }
};