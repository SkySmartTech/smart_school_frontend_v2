import axios from "axios";

// Define interfaces for each data type
export interface School {
  id: number;
  schoolName: string;
  updated_at: string;
  created_at: string;
}

export interface Grade {
  id: number;
  grade: string;
  description: string;
  updated_at: string;
  created_at: string;
}

// Subject interface updated to include the required 'medium' field and 
// optional fields observed in the API response that are needed for updates.
export interface Subject {
  id: number;
  subjectName: string; // The frontend field for the name
  updated_at: string;
  created_at: string;
  medium: string; 
  // Fields required by the backend API but not necessarily filled by the user
  mainSubject?: string | null;
  grade?: string | null;
}

export interface Class {
  id: number;
  class: string;
  description: string;
  grade: string; // Keep interface field for fetching/displaying data
  updated_at: string;
  created_at: string;
}

export interface CommonSetting {
  id: number;
  settingName: string;
  value: string;
  updated_at: string;
  created_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create an Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to attach the auth token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Add a response interceptor to handle errors globally, but without redirecting
api.interceptors.response.use(
  response => response,
  error => {
    console.error("API call failed:", error.response || error);
    return Promise.reject(error);
  }
);

// Fetch all data for each table
export const fetchSchools = async (): Promise<School[]> => {
  try {
    const response = await api.get('/api/schools');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching schools:', error);
    throw error;
  }
};

export const fetchGrades = async (): Promise<Grade[]> => {
  try {
    const response = await api.get('/api/grades');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching grades:', error);
    throw error;
  }
};

export const fetchSubjects = async (): Promise<Subject[]> => {
  try {
    const response = await api.get('/api/subjects');
    // The component will map the subject name from 'subSubject' to 'subjectName'
    return response.data || [];
  } catch (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }
};

export const fetchClasses = async (): Promise<Class[]> => {
  try {
    const response = await api.get('/api/grade-classes');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching classes:', error);
    throw error;
  }
};

export const fetchCommonSettings = async (): Promise<CommonSetting[]> => {
  try {
    const response = await api.get('/api/common-settings');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching common settings:', error);
    throw error;
  }
};

// Create new items
export const createSchool = async (data: Omit<School, 'id' | 'created_at' | 'updated_at'>): Promise<School> => {
  try {
    const response = await api.post('/api/school-create', { school: data.schoolName });
    return response.data;
  } catch (error) {
    console.error('Error creating school:', error);
    throw error;
  }
};

export const createGrade = async (data: Omit<Grade, 'id' | 'created_at' | 'updated_at'> & { gradeId: string | number }): Promise<Grade> => {
  try {
    const response = await api.post('/api/grade-create', { 
        gradeId: data.gradeId, 
        grade: data.grade 
    });
    return response.data;
  } catch (error) {
    console.error('Error creating grade:', error);
    throw error;
  }
};

export const createSubject = async (data: Omit<Subject, 'id' | 'created_at' | 'updated_at'>): Promise<Subject> => {
  try {
    // FIX: Map frontend field 'subjectName' to backend field 'subSubject'.
    // Include 'mainSubject' and 'grade' to satisfy backend validation.
    const response = await api.post('/api/subject-create', { 
        subSubject: data.subjectName,
        medium: data.medium,
        mainSubject: data.mainSubject || null, // Included to satisfy backend requirement
        grade: data.grade || null, // Included to satisfy backend requirement
    });
    return response.data;
  } catch (error) {
    console.error('Error creating subject:', error);
    throw error;
  }
};

export const createClass = async (data: Omit<Class, 'id' | 'created_at' | 'updated_at' | 'grade'>): Promise<Class> => {
  try {
    // UPDATED: Removed 'grade' from the request body
    const response = await api.post('/api/grade-class-create', { class: data.class /*, grade: data.grade */ });
    // NOTE: The returned object might still contain 'grade' if the backend sets it.
    return response.data;
  } catch (error) {
    console.error('Error creating class:', error);
    throw error;
  }
};

export const createCommonSetting = async (data: Omit<CommonSetting, 'id' | 'created_at' | 'updated_at'>): Promise<CommonSetting> => {
  try {
    const response = await api.post('/api/common-settings', data);
    return response.data;
  } catch (error) {
    console.error('Error creating common setting:', error);
    throw error;
  }
};

// Update items
export const updateSchool = async (id: number, data: Partial<School>): Promise<School> => {
  try {
    const response = await api.post(`/api/school/${id}/update`, { school: data.schoolName });
    return response.data;
  } catch (error) {
    console.error('Error updating school:', error);
    throw error;
  }
};

export const updateGrade = async (id: number, data: Partial<Grade>): Promise<Grade> => {
  try {
    // FIX: Removed gradeId from the request body. Only send the 'grade' name, 
    // as the ID is already in the URL (`/api/grade/${id}/update`).
    const response = await api.post(`/api/grade/${id}/update`, { 
        grade: data.grade // Only the editable field is sent
    });
    return response.data;
  } catch (error) {
    console.error('Error updating grade:', error);
    throw error;
  }
};

export const updateSubject = async (id: number, data: Partial<Subject>): Promise<Subject> => {
  try {
    // FIX: Map frontend field 'subjectName' to backend field 'subSubject'.
    // Include 'mainSubject' and 'grade' to satisfy backend validation.
    const response = await api.post(`/api/subject/${id}/update`, { 
        subSubject: data.subjectName,
        medium: data.medium,
        mainSubject: data.mainSubject || null, // Included to satisfy backend requirement
        grade: data.grade || null, // Included to satisfy backend requirement
    });
    return response.data;
  } catch (error) {
    console.error('Error updating subject:', error);
    throw error;
  }
};

export const updateClass = async (id: number, data: Partial<Omit<Class, 'grade'>>): Promise<Class> => {
  try {
    // UPDATED: Removed 'grade' from the request body
    const response = await api.post(`/api/grade-class/${id}/update`, { class: data.class /*, grade: data.grade */ });
    return response.data;
  } catch (error) {
    console.error('Error updating class:', error);
    throw error;
  }
};

export const updateCommonSetting = async (id: number, data: Partial<CommonSetting>): Promise<CommonSetting> => {
  try {
    const response = await api.put(`/api/common-settings/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating common setting:', error);
    throw error;
  }
};

// Delete items
export const deleteSchool = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/school/${id}/delete`);
  } catch (error) {
    console.error('Error deleting school:', error);
    throw error;
  }
};

export const deleteGrade = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/grade/${id}/delete`);
  } catch (error) {
    console.error('Error deleting grade:', error);
    throw error;
  }
};

export const deleteSubject = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/subject/${id}/delete`);
  } catch (error) {
    console.error('Error deleting subject:', error);
    throw error;
  }
};

export const deleteClass = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/grade-class/${id}/delete`);
  } catch (error) {
    console.error('Error deleting class:', error);
    throw error;
  }
};

export const deleteCommonSetting = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/common-settings/${id}`);
  } catch (error) {
    console.error('Error deleting common setting:', error);
    throw error;
  }
};