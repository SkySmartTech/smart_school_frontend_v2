import axios from "axios";

export type PermissionKey =
  | "dashboard"
  | "studentDashboard"
  | "teacherDashboard"
  | "commonDashboard"
  | "addMarks"
  | "addStudent"
  | "addClassTeacher"
  | "addStudent"
  | "reports"
  | "marksChecking"
  | "help"
  | "userManagementSub"
  | "userManagement"
  | "userAccessManagement"
  | "managementStaffReport"
  | "classTeacherReport"
  | "parentReport"
  | "parentTeacherReport"
  | "parentPrincipalReport"
  | "systemManagement"
  | "userProfile"
  |"autoRefresh"
;

export interface UserRole {
  userType: string | number | readonly string[] | undefined;
  id: string;
  name: string;
  description: string;
  permissionObject: PermissionKey[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

export const fetchUserRoles = async (): Promise<UserRole[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/user-accesses`, getAuthHeader());
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch user roles');
  }
};

export const createUserRole = async (roleData: {
  userType: string;
  description: string;
  permissionObject: PermissionKey[];
}): Promise<UserRole> => {
  try {
    const payload = {
      ...roleData,
      userType: roleData.userType
    };
    const response = await axios.post(
      `${API_BASE_URL}/api/user-access-create`,
      payload,
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    throw new Error('Failed to create user role');
  }
};

export const updateUserRole = async (id: string, roleData: Partial<Omit<UserRole, 'id'>>): Promise<UserRole> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/user-access/${id}/update`,
      roleData,
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    throw new Error('Failed to update user role');
  }
};

export const deleteUserRole = async (id: string): Promise<void> => {
  try {
    await axios.delete(
      `${API_BASE_URL}/api/user-access/${id}/delete`,
      getAuthHeader()
    );
  } catch (error) {
    throw new Error('Failed to delete user role');
  }
};

export const checkUserPermission = async (permission: PermissionKey): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/user-permissions`, getAuthHeader());
    return response.data.permissions.includes(permission);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
};