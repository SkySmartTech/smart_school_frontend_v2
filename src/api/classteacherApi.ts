import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface StudentSubjectMark {
  subject: string;
  marks: number;
}

export interface DropdownOption {
  label: string;
  value: string;
}

interface StudentMark {
  studentName: string;
  subjects: StudentSubjectMark[];
  total_marks: number;
  average_marks: number;
  rank: number;
}

interface SubjectMark {
  subject: string;
  average_marks: number;
  percentage: number;
}

interface YearlySubjectAverage {
  year: number;
  subjects: SubjectMark[];
}

export interface ClassTeacherReportData {
  subject_marks: SubjectMark[];
  student_marks: StudentMark[];
  yearly_subject_averages: YearlySubjectAverage[];
}

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
            value: gradeValue.toString(), // Ensure value is a string
          };
        })
      : [];
  } catch (error) {
    handleApiError(error, "fetchGradesFromApi");
    return [];
  }
}

const getAuthHeader = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token');

  if (!token) {
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

export const fetchClassTeacherReport = async (
  startDate: string,
  endDate: string,
  grade: string, 
  className: string,
  exam: string,
  month: string = "01"
): Promise<ClassTeacherReportData> => {
  try {
    // Validate inputs
    if (!startDate || !endDate || !grade || !className || !exam) {
      throw new Error('Missing required parameters');
    }

    // Format dates to match required format (YYYY.MM.DD)
    const formatDate = (date: string) => {
      return date.replace(/-/g, '.');
    };

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
    const apiUrl = `${API_BASE_URL}/api/teacher-report-data/${formatDate(startDate)}/${formatDate(endDate)}/${grade}/${className}/${exam}/${monthParam}`
      .replace(/([^:]\/)\/+/g, "$1") // Remove any double slashes (except after http/https)
      .trim();

    console.log('API URL:', apiUrl);

    const response = await axios.get(
      encodeURI(apiUrl),
      {
        ...getAuthHeader(),
        timeout: 10000,
        withCredentials: true,
        headers: {
          ...getAuthHeader().headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, Authorization'
        }
      }
    );

    // Transform string numbers to actual numbers
    const transformMarks = (marks: any): number => {
      if (typeof marks === 'string') {
        return parseFloat(marks) || 0;
      }
      return marks || 0;
    };

    return {
      subject_marks: response.data.subject_marks?.map((sm: any) => ({
        subject: sm.subject,
        average_marks: transformMarks(sm.average_marks),
        percentage: transformMarks(sm.percentage)
      })) || [],
      student_marks: response.data.student_marks?.map((student: any) => ({
        studentName: student.studentName,
        subjects: student.subjects.map((subject: any) => ({
          subject: subject.subject,
          marks: transformMarks(subject.marks)
        })),
        total_marks: transformMarks(student.total_marks),
        average_marks: transformMarks(student.average_marks),
        rank: student.rank
      })) || [],
      yearly_subject_averages: response.data.yearly_subject_averages?.map((yearData: any) => ({
        year: yearData.year,
        subjects: yearData.subjects.map((subject: any) => ({
          subject: subject.subject,
          average_marks: transformMarks(subject.average_marks),
          percentage: transformMarks(subject.percentage)
        }))
      })) || []
    };
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

    throw new Error("Network error occurred");
  }
};

// Add this helper function for error handling
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