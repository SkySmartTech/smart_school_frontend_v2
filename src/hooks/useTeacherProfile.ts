import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface TeacherInfo {
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

interface UserProfile {
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
  // Normalized: components expect an array of teacher entries
  teacher_data: TeacherInfo[];
  access: any[];
}

const getAuthHeader = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token');
  if (!token) {
    return null;
  }
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
};

const fetchTeacherProfile = async (): Promise<UserProfile> => {
  const headers = getAuthHeader();
  if (!headers) {
    throw new Error('No authentication token found');
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/user`, headers);
    const raw = response.data || {};

    // Normalize teacher_data to always be an array of teacher entries.
    // Backend sometimes returns { teacher_info: [...] , class_teacher_info: {...} }
    // or an array directly — handle both.
    let normalizedTeacherData: TeacherInfo[] = [];

    if (Array.isArray(raw.teacher_data)) {
      normalizedTeacherData = raw.teacher_data;
    } else if (raw.teacher_data && Array.isArray(raw.teacher_data.teacher_info)) {
      normalizedTeacherData = raw.teacher_data.teacher_info;
    } else {
      // fallback: try to detect an array at other reasonable locations
      normalizedTeacherData = [];
    }

    const userProfile: UserProfile = {
      id: raw.id,
      name: raw.name,
      address: raw.address,
      email: raw.email,
      birthDay: raw.birthDay,
      contact: raw.contact,
      userType: raw.userType,
      gender: raw.gender,
      location: raw.location ?? null,
      username: raw.username,
      photo: raw.photo ?? null,
      userRole: raw.userRole,
      status: !!raw.status,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      teacher_data: normalizedTeacherData,
      access: raw.access ?? [],
    };

    return userProfile;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw new Error('Failed to fetch teacher profile');
  }
};

export const useTeacherProfile = () => {
  const authHeader = getAuthHeader();
  
  return useQuery<UserProfile, Error>({
    queryKey: ['teacherProfile'],
    queryFn: fetchTeacherProfile,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 2,
    enabled: !!authHeader, // Only run the query if we have an auth token
  });
};

export default useTeacherProfile;
