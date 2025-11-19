import axios from "axios";

// A more generic interface for line chart data
export interface LineChartData {
    x: string;
    y: number;
}

export interface ParentSubjectPieData {
    name: string;
    value: number;
}

export interface DetailedMarksTableRow {
    subject: string;
    highestMarks: number;
    highestMarkGrade: string;
    studentMarks: number;
    studentGrade: string;
}

export interface TermData {
    term: string;
    average_marks: string;
}

export interface YearlyTermData {
    year: number;
    terms: TermData[];
}

export interface OverallSubjectData {
    year: string;
    [key: string]: any; // dynamic term keys like 'First Term', 'Second Term', etc.
}

export interface YearOption {
    id: number;
    year: string;
    created_at: string;
    updated_at: string;
}

export interface ParentReportData {
    studentName: string;
    studentGrade: string;
    studentClass: string;
    studentMarksDetailedTable: DetailedMarksTableRow[];
    subjectWiseMarksPie: ParentSubjectPieData[];
    overallSubjectLineGraph: OverallSubjectData[];
    individualSubjectAverages: { [subjectName: string]: LineChartData[] };
    current_year?: number | string;
    current_term?: string;
}

export interface ChildDetails {
    studentId?: string;
    admissionNo?: string;
    studentName: string;
    grade: string;
    className: string;
}

export interface StudentDetails {
    id: number;
    name: string;
    student: {
        id: number;
        studentGrade: string;
        studentClass: string;
        medium: string;
        studentAdmissionNo: string;
        year: string;
        userId: string;
    };
}

// Helper function to transform backend data to detailed marks table
const transformToDetailedMarksTable = (
    highestMarksData: any[],
    marksAndGradesData: any[]
): DetailedMarksTableRow[] => {
    const result: DetailedMarksTableRow[] = [];

    // Create a map for student marks by subject
    const studentMarksMap = new Map();
    marksAndGradesData.forEach(item => {
        studentMarksMap.set(item.subject, {
            marks: item.marks,
            grade: item.marksGrade || item.grade
        });
    });

    // Combine highest marks with student marks
    highestMarksData.forEach(highestItem => {
        const studentData = studentMarksMap.get(highestItem.subject) || { marks: 0, grade: 'N/A' };

        result.push({
            subject: highestItem.subject,
            highestMarks: highestItem.marks,
            highestMarkGrade: highestItem.marksGrade || highestItem.grade,
            studentMarks: studentData.marks,
            studentGrade: studentData.grade
        });
    });

    return result;
};

// Helper function to transform subject yearly marks to line chart format
const transformSubjectYearlyMarks = (subjectYearlyMarks: any): { [subjectName: string]: LineChartData[] } => {
    const result: { [subjectName: string]: LineChartData[] } = {};

    Object.keys(subjectYearlyMarks).forEach(subject => {
        const yearlyData = subjectYearlyMarks[subject];
        if (Array.isArray(yearlyData)) {
            result[subject] = yearlyData.map((item: any) => ({
                x: item.year?.toString() || '',
                y: parseFloat(item.average_marks) || 0
            }));
        }
    });

    return result;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Auth Helper function
export const getAuthHeader = () => {
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

/**
 * Fetch list of all children for the logged-in parent
 * Extracts all students from all parent_data entries
 */
export const fetchChildrenList = async (): Promise<ChildDetails[]> => {
    try {
        const authHeader = getAuthHeader();
        const response = await axios.get(`${API_BASE_URL}/api/user`, {
            headers: authHeader.headers,
        });

        const parentDataArray = response.data?.parent_data;
        
        if (!parentDataArray || !Array.isArray(parentDataArray)) {
            throw new Error("Parent data not found in API response.");
        }

        // Extract all students from all parent_data entries
        const children: ChildDetails[] = [];
        
        parentDataArray.forEach((parentEntry: any) => {
            const studentsInfo = parentEntry.students_info;
            
            if (Array.isArray(studentsInfo)) {
                studentsInfo.forEach((student: any) => {
                    children.push({
                        studentId: student.studentId || student.student_id,
                        admissionNo: student.studentAdmissionNo || student.student_admission_no || '',
                        studentName: student.name || student.studentName || '',
                        grade: student.grade || '',
                        className: student.class || student.className || '',
                    });
                });
            }
        });

        if (children.length === 0) {
            throw new Error("No student information found.");
        }

        return children;

    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('token');
                localStorage.removeItem('access_token');
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(error.response?.data?.message || 'Failed to load children list');
        }
        throw new Error("Network error occurred");
    }
};

/**
 * API call to fetch parent report data
 * Route format: /api/parent-report-data/{studentAdmissionNo}/{start_year}/{end_year}/{exam}/{month}/{student_grade}/{student_class}
 */
export const fetchParentReport = async (
    studentAdmissionNo: string,
    startYear: string,
    endYear: string,
    exam: string,
    month: string,
    studentGrade: string,
    studentClass: string
): Promise<ParentReportData> => { 
    try {
        // Convert empty/null values to "null" string for URL path
        const sanitizedMonth = month || 'null';
        const sanitizedStartYear = startYear || 'null';
        const sanitizedEndYear = endYear || 'null';

        // Constructing the URL according to your backend route format:
        // /api/parent-report-data/{studentAdmissionNo}/{start_year}/{end_year}/{exam}/{month}/{student_grade}/{student_class}
        const urlPath = `${API_BASE_URL}/api/parent-report-data/${encodeURIComponent(studentAdmissionNo)}/${sanitizedStartYear}/${sanitizedEndYear}/${exam}/${sanitizedMonth}/${encodeURIComponent(studentGrade)}/${encodeURIComponent(studentClass)}`;

        console.log('API URL:', urlPath);
        console.log('Student Admission No:', studentAdmissionNo);
        console.log('Student Grade:', studentGrade);
        console.log('Student Class:', studentClass);

        const response = await axios.get(urlPath, {
            ...getAuthHeader(),
            timeout: 10000,
        });

        console.log('API Response:', response.data);

        if (!response.data) {
            throw new Error('No data received from server');
        }

        // Transform the response data to match expected structure
        const reportData: ParentReportData = {
            studentName: response.data.studentName || response.data.student_name || '',
            studentGrade: response.data.studentGrade || response.data.student_grade || '',
            studentClass: response.data.studentClass || response.data.student_class || '',

            // Transform highest_marks_per_subject and marks_and_grades into studentMarksDetailedTable
            studentMarksDetailedTable: transformToDetailedMarksTable(
                response.data.highest_marks_per_subject || [],
                response.data.marks_and_grades || []
            ),

            // Transform subject_marks to pie chart data
            subjectWiseMarksPie: (response.data.subject_marks || []).map((item: any) => ({
                name: item.subject,
                value: item.percentage || item.marks || 0
            })),

            // Transform yearly_term_averages to bar chart data (dynamic terms)
            overallSubjectLineGraph: (response.data.yearly_term_averages || []).map((item: any) => {
                const obj: OverallSubjectData = { year: item.year?.toString() || '' };
                if (Array.isArray(item.terms)) {
                    item.terms.forEach((term: any) => {
                        obj[term.term] = parseFloat(term.average_marks) || 0;
                    });
                }
                return obj;
            }),

            // Transform subject_yearly_marks to individual subject averages
            individualSubjectAverages: transformSubjectYearlyMarks(response.data.subject_yearly_marks || {}),
            current_year: response.data.current_year,
            current_term: response.data.current_term,
        };

        // Log for debugging
        console.log('Report Data - Current Year:', reportData.current_year, 'Current Term:', reportData.current_term);

        return reportData;

    } catch (error) {
        console.error('API Error:', error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('token');
                localStorage.removeItem('access_token');
                throw new Error('Session expired. Please login again.');
            } else if (error.response?.status === 403) {
                throw new Error('Access denied. You do not have permission to view this data.');
            } else if (error.response?.status === 404) {
                throw new Error('No report data found for the selected criteria.');
            } else if (error.response?.status === 400) {
                throw new Error('Invalid request parameters. Please check your selection.');
            } else {
                throw new Error(
                    error.response?.data?.message ||
                    error.response?.data?.error ||
                    `Request failed with status ${error.response?.status}`
                );
            }
        } else if (error instanceof Error) {
            throw error;
        }

        throw new Error("Network error or unknown error occurred");
    }
};

/**
 * DEPRECATED: Use fetchChildrenList() instead
 * This function is kept for backward compatibility but will be removed
 */
export const fetchChildDetails = async (): Promise<ChildDetails> => {
    try {
        const authHeader = getAuthHeader();
        const response = await axios.get(`${API_BASE_URL}/api/user`, {
            headers: authHeader.headers,
        });

        const parentDataArray = response.data?.parent_data;
        
        if (!parentDataArray || !Array.isArray(parentDataArray) || parentDataArray.length === 0) {
            throw new Error("Student details not found in API response.");
        }

        // Get first student from first parent entry
        const firstParentEntry = parentDataArray[0];
        const studentsInfo = firstParentEntry.students_info;
        
        if (!Array.isArray(studentsInfo) || studentsInfo.length === 0) {
            throw new Error("Student details not found in API response.");
        }

        const studentInfo = studentsInfo[0];

        const transformedData: ChildDetails = {
            studentId: studentInfo.studentId || studentInfo.student_id,
            admissionNo: studentInfo.studentAdmissionNo || studentInfo.student_admission_no || '',
            studentName: studentInfo.name || studentInfo.studentName || '',
            grade: studentInfo.grade || '',
            className: studentInfo.class || studentInfo.className || '',
        };

        return transformedData;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('token');
                localStorage.removeItem('access_token');
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(error.response?.data?.message || 'Request failed');
        }
        throw new Error("Network error occurred");
    }
};

/**
 * Helper: fetch raw students list (fallback)
 * Uses /api/students and returns the raw array (or empty array).
 */
async function fetchAllStudentsRaw(): Promise<any[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/students`, getAuthHeader());
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    // If fetching all students fails, rethrow so caller can handle/log
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // mirror behavior used elsewhere: remove tokens so the app will prompt login
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
    }
    throw error;
  }
}

/**
 * Get available years with full year object details.
 * Uses /api/years endpoint and returns YearOption array.
 */
export async function getAvailableYears(): Promise<YearOption[]> {
  try {
    // Try the dedicated endpoint first
    const res = await axios.get(`${API_BASE_URL}/api/years`, getAuthHeader());
    if (Array.isArray(res.data) && res.data.length > 0) {
      // Check if response has year objects
      if (res.data[0] && typeof res.data[0] === 'object' && 'year' in res.data[0]) {
        return res.data as YearOption[];
      }
      // If plain strings, convert to YearOption format
      return res.data.map((y: any) => ({
        id: 0,
        year: String(typeof y === 'object' ? y.year : y),
        created_at: '',
        updated_at: ''
      }));
    }
    // If empty or unexpected, fall through to fallback
  } catch (error: any) {
    // If it's a 404, use fallback. For 401/403/etc. rethrow to preserve auth behavior.
    if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
      // Not a 404: let caller handle (401 will clear tokens in handleApiError below)
      try { handleApiError(error, "getAvailableYears"); } catch (e) { throw e; }
    }
    // otherwise continue to fallback
  }

  // Fallback: derive from /api/students
  try {
    const raw = await fetchAllStudentsRaw();
    const yearsSet = new Set<string>();
    raw.forEach((item: any) => {
      const student = item.student ?? item.student_data ?? item;
      const year = student?.year ?? student?.year?.toString?.();
      if (year) yearsSet.add(String(year));
    });
    const years = Array.from(yearsSet).sort((a, b) => b.localeCompare(a)); // newest first
    return years.map(y => ({
      id: 0,
      year: y,
      created_at: '',
      updated_at: ''
    }));
  } catch (error) {
    handleApiError(error, "getAvailableYears");
    return [];
  }
}

/**
 * Get available grades.
 * Try /api/grades first; if not available, derive from /api/students.
 */
export async function getAvailableGrades(): Promise<string[]> {
  try {
    // Try dedicated endpoint
    const res = await axios.get(`${API_BASE_URL}/api/grades`, getAuthHeader());
    if (Array.isArray(res.data) && res.data.length > 0) {
      // The earlier code mapped to item.grade — preserve that if present
      return res.data.map((item: any) => (item.grade ?? String(item))).filter(Boolean);
    }
    // fall back if empty/unexpected
  } catch (error: any) {
    // Allow 404 to fall through to fallback; propagate other errors via handleApiError
    if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
      try { handleApiError(error, "getAvailableGrades"); } catch (e) { throw e; }
    }
  }

  // Fallback: derive from /api/students
  try {
    const raw = await fetchAllStudentsRaw();
    const gradeSet = new Set<string>();
    raw.forEach((item: any) => {
      const student = item.student ?? item.student_data ?? item;
      const grade = student?.studentGrade ?? student?.student_grade ?? student?.grade;
      if (grade) gradeSet.add(String(grade));
    });
    return Array.from(gradeSet).sort();
  } catch (error) {
    handleApiError(error, "getAvailableGrades");
    return [];
  }
}

/**
 * Get available classes. If grade is provided, filter classes for that grade.
 * Try /api/grade-classes first; if not available, derive from /api/students.
 */
export async function getAvailableClasses(gradeFilter: string): Promise<string[]> {
  try {
    // Try dedicated endpoint first
    const res = await axios.get(`${API_BASE_URL}/api/grade-classes`, getAuthHeader());
    if (Array.isArray(res.data) && res.data.length > 0) {
      // Map to item.class (same as previous behavior)
      let classes = res.data.map((item: any) => item.class).filter(Boolean);
      if (gradeFilter) {
        // If the API returns grade relationship, try to filter (best-effort)
        classes = classes.filter((_c: any) => {
          // If API items include grade, we could filter; otherwise keep as-is
          return true;
        });
      }
      // Sort alphabetically A-Z with proper comparator
      return Array.from(new Set(classes)).sort((a, b) => a.localeCompare(b));
    }
  } catch (error: any) {
    // If endpoint missing (404) fall back; otherwise propagate via handleApiError
    if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
      try { handleApiError(error, "getAvailableClasses"); } catch (e) { throw e; }
    }
  }

  // Fallback: derive classes from /api/students, optionally filtering by grade
  try {
    const raw = await fetchAllStudentsRaw();
    const classSet = new Set<string>();
    raw.forEach((item: any) => {
      const student = item.student ?? item.student_data ?? item;
      const studentGrade = student?.studentGrade ?? student?.student_grade ?? student?.grade;
      const className = student?.studentClass ?? student?.student_class ?? student?.class;
      if (!className) return;
      if (gradeFilter) {
        if (studentGrade && String(studentGrade) === String(gradeFilter)) {
          classSet.add(String(className));
        }
      } else {
        classSet.add(String(className));
      }
    });
    return Array.from(classSet).sort();
  } catch (error) {
    handleApiError(error, "getAvailableClasses");
    return [];
  }
}

/**
 * Fetch students for a specific class
 * Uses the /api/class-students endpoint
 */
export const fetchClassStudents = async (year: string, grade: string, className: string): Promise<StudentDetails[]> => {
    try {
        // Skip the call if any parameter is empty to avoid invalid API calls
        if (!year || !grade || !className) {
            return [];
        }

        const response = await axios.get(
            `${API_BASE_URL}/api/class-students/${encodeURIComponent(year)}/${encodeURIComponent(grade)}/${encodeURIComponent(className)}`,
            getAuthHeader()
        );

        if (!Array.isArray(response.data)) {
            throw new Error('Invalid response format from server');
        }

        return response.data.map((student: any) => ({
            id: student.id,
            name: student.name,
            student: {
                id: student.student.id,
                studentGrade: student.student.studentGrade,
                studentClass: student.student.studentClass,
                medium: student.student.medium,
                studentAdmissionNo: student.student.studentAdmissionNo,
                year: student.student.year,
                userId: student.student.userId
            }
        }));
    } catch (error) {
        handleApiError(error, 'fetchClassStudents');
        return [];
    }
}

function handleApiError(error: any, _operation: string): never {
  // Standardized error handling for axios errors and network issues.
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      // Clear auth tokens so app can redirect to login
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
    // request was made but no response received
    throw new Error("Network error. Please check your connection and try again.");
  } else {
    // Something happened in setting up the request
    throw new Error(error.message || "An unexpected error occurred. Please try again.");
  }
}