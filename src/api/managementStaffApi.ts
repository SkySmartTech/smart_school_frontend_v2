import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Define interfaces for your data
export interface SubjectMark {
  subject: string;
  average_marks: string;
  percentage: number;
}

export interface DropdownOption {
  label: string;
  value: string;
}

export interface ClassSubjectMark {
  subject_percentage: number;
  percentage: number;
  subject: string;
  average_mark: string;
}

export interface ClassMarks {
  [key: string]: ClassSubjectMark[];
}

export interface OverallSubjectAverage {
  [className: string]: {
    overall_average: number;
  };
}

export interface ManagementStaffReportData {
  subject_marks: SubjectMark[];
  class_subject_marks: ClassMarks;
  overall_subject_average: OverallSubjectAverage;
  tableData?: {
    class: string;
    english: number;
    arts: number;
    mathematics: number;
    history: number;
    science: number;
    ict?: number;
    sinhala?: number;
    tamil?: number;
    buddhism?: number;
    overall_average?: number;
  }[];
}

// Enhanced auth header function with better error handling
const getAuthHeader = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token');

  if (!token) {
    console.error('No authentication token found in localStorage');
    // Check if user needs to login again
    throw new Error('Authentication token not found. Please login again.');
  }

  console.log('Token found:', token ? 'Yes' : 'No'); // Debug log

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
};

export async function fetchGradesFromApi(): Promise<DropdownOption[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/grades`, getAuthHeader());

    return Array.isArray(res.data)
      ? res.data.map((item: any) => {
        // Extract the grade value - it could be in different fields
        const gradeValue = item.grade || item.id || item.value || item.name || "";

        // Create the label with "Grade" prefix
        const gradeLabel = gradeValue ? ` ${gradeValue}` : "Unknown Grade";

        return {
          label: gradeLabel,
          value: gradeValue.toString(),
        };
      })
      : [];
  } catch (error) {
    handleApiError(error, "fetchGradesFromApi");
    return [];
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
  } catch (error) {
    handleApiError(error, "fetchYearsFromApi");
    return [];
  }
}

export const fetchManagementStaffReport = async (
  year: string,
  grade: string,
  exam: string,
  month: string = "01"
): Promise<ManagementStaffReportData> => {
  try {
    // Validate inputs
    if (!year || !grade || !exam) {
      throw new Error('Missing required parameters: year, grade, or exam');
    }

    // Format the month parameter based on exam type
    let monthParam = "null";
    if (exam === "Monthly") {
      // Convert month number to month name for Monthly exam type
      const monthNames = {
        "01": "January", "02": "February", "03": "March", "04": "April",
        "05": "May", "06": "June", "07": "July", "08": "August",
        "09": "September", "10": "October", "11": "November", "12": "December"
      };
      monthParam = monthNames[month as keyof typeof monthNames] || "January";
    }

    // Build base URL with required parameters
    const apiUrl = `${API_BASE_URL}/api/management-staff-report/${year}/${grade}/${exam}/${monthParam}`
      .replace(/([^:]\/)\/+/g, "$1") // Remove any double slashes (except after http/https)
      .trim();

    console.log('API URL:', apiUrl);

    const response = await axios.get(
      encodeURI(apiUrl),
      {
        ...getAuthHeader(),
        timeout: 10000,
        withCredentials: true
      }
    );

    console.log('API Response:', response.data);

    // Transform the response data
    const transformedData: ManagementStaffReportData = {
      subject_marks: response.data.subject_marks || [],
      class_subject_marks: response.data.class_subject_marks || {},
      overall_subject_average: response.data.overall_subject_average || {},
      tableData: transformToTableData(response.data.class_subject_marks, response.data.overall_subject_average),
    };

    return transformedData;
  } catch (error) {
    console.error('API Error:', error);

    if (axios.isAxiosError(error)) {
      // Handle CORS error specifically
      if (error.message === 'Network Error') {
        throw new Error('CORS error or network issue. Please check server configuration.');
      }
      
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        throw new Error('Session expired. Please login again.');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied. You do not have permission to view this data.');
      } else if (error.response?.status === 404) {
        throw new Error('Report endpoint not found. Please check the URL format.');
      } else {
        throw new Error(
          error.response?.data?.message ||
          error.response?.data?.error ||
          `Request failed with status ${error.response?.status}`
        );
      }
    }

    throw new Error("Network error or unknown error occurred");
  }
};

// Helper function to transform class_subject_marks into tableData format
const transformToTableData = (classSubjectMarks: ClassMarks | undefined, overallSubjectAverage: OverallSubjectAverage | undefined) => {
  if (!classSubjectMarks) return [];

  return Object.keys(classSubjectMarks).map((className) => {
    const marks = classSubjectMarks[className];
    const row: any = { class: className };

    marks.forEach((mark) => {
      const subjectKey = mark.subject.toLowerCase();
      row[subjectKey] = parseFloat(mark.average_mark) || 0;
    });

    // Ensure all subjects have default values
    ['English', 'Arts', 'Mathematics', 'Science', 'History', 'Sinhala', 'Tamil', 'ICT', 'Buddhism'].forEach(subject => {
      if (!row[subject]) row[subject] = 0;
    });

    // Add overall_average from backend data instead of calculating
    if (overallSubjectAverage && overallSubjectAverage[className]) {
      row.overall_average = parseFloat(overallSubjectAverage[className].overall_average.toFixed(1));
    } else {
      row.overall_average = 0;
    }

    return row;
  });
};

// Optional: Add a function to check if user is authenticated
export const checkAuthStatus = (): boolean => {
  const token = localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token');
  return !!token;
};

// Optional: Add a function to refresh token if your API supports it
export const refreshAuthToken = async (): Promise<void> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
      refresh_token: refreshToken
    });

    if (response.data.access_token) {
      localStorage.setItem('authToken', response.data.access_token);
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Clear all auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refreshToken');
    throw new Error('Session refresh failed. Please login again.');
  }
};

const handleApiError = (error: any, _operation: string) => {
  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 401:
        throw new Error("Authentication failed. Please login again.");
      case 403:
        throw new Error("You do not have permission to perform this action.");
      case 404:
        throw new Error("The requested resource was not found.");
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