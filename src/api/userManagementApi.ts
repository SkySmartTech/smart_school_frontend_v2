import axios from "axios";
import type { Subject, User, UserListResponse, UserResponse } from "../types/userManagementTypes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type UserType = "Student" | "Teacher" | "Parent";
// Define UserRole type
export type UserRole = "user" | "admin" | "managementStaff" | "userStudent" | "userParent" | "userTeacher" | "userClassTeacher";

// The rest of the file remains the same as BaseUser already uses this union type

const getAuthHeader = () => {
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  if (!token) {
    console.error("No authentication token found in localStorage");
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

export const getUserRole = (userType: UserType): UserRole => {
  switch (userType) {
    case "Teacher":
      return "userTeacher";
    case "Student":
      return "userStudent";
    case "Parent":
      return "userParent";
    default:
      return "user";
  }
};

export const fetchSubjects = async (): Promise<Subject[]> => {
  try {
    const response = await axios.get<Subject[]>(
      `${API_BASE_URL}/api/subjects`,
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }
};

const endpointForUserType = (userType: UserType) => {
  switch (userType) {
    case "Student":
      return "/api/all-students";
    case "Parent":
      return "/api/all-parents";
    case "Teacher":
    default:
      return "/api/all-teachers";
  }
};

const createEndpointForUserType = (userType: UserType) => {
  switch (userType) {
    case "Student":
      return "/api/add-new-student";
    case "Parent":
      return "/api/add-new-parent";
    case "Teacher":
    default:
      return "/api/add-new-teacher";
  }
};

const updateEndpointForUserType = (userType: UserType, id: number) => {
  switch (userType) {
    case "Student":
      return `/api/user-student/${id}/update`;
    case "Parent":
      return `/api/user-parent/${id}/update`;
    case "Teacher":
    default:
      return `/api/user-teacher/${id}/update`;
  }
};

const deactivateEndpointForUserType = (userType: UserType, id: number) => {
  switch (userType) {
    case "Student":
      return `/api/user-student/${id}/status-update`;
    case "Parent":
      return `/api/user-parent/${id}/status-update`;
    case "Teacher":
    default:
      return `/api/user-teacher/${id}/status-update`;
  }
};

// new: delete endpoint helper
const deleteEndpointForUserType = (userType: UserType, id: number) => {
  switch (userType) {
    case "Student":
      return `/api/user-student/${id}/delete`;
    case "Parent":
      return `/api/user-parent/${id}/delete`;
    case "Teacher":
    default:
      return `/api/user-teacher/${id}/delete`;
  }
};

export const fetchUsers = async (userType: UserType = "Teacher"): Promise<User[]> => {
  try {
    const url = `${API_BASE_URL}${endpointForUserType(userType)}`;
    
    const response = await axios.get<UserListResponse>(url, {
      ...getAuthHeader(),
      withCredentials: true,
      // Add timeout and cache control headers
      timeout: 15000,
      headers: {
        ...getAuthHeader().headers,
        'Cache-Control': 'max-age=300' // Allow caching for 5 minutes
      }
    });

    // Use early returns for error cases
    if (!response?.data) return [];
    
    const userData = Array.isArray(response.data) ? response.data : 
                    response.data.data || response.data.users || [];
    
    if (!Array.isArray(userData)) return [];

    // Use Map for better performance with large datasets
    return userData.map(user => ({
      id: user.id,
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      status: user.status ?? true,
      userType,
      userRole: user.userRole || getUserRole(userType),
      address: user.address || '',
      birthDay: user.birthDay || '',
      contact: user.contact || '',
      gender: user.gender || '',
      photo: user.photo || '',
      grade: '',
      class: '',
      medium: '',
      studentAdmissionNo: '',
      subject: '',
      staffNo: '',
      profession: '',
      parentContact: '',
      relation: user.relation || user.parent?.relation || '',   
      ...getTypeSpecificFields(user, userType)
    }));
  } catch (error) {
    console.error(`Error in fetchUsers(${userType}):`, error);
    throw error;
  }
};

// Separate function for type-specific fields
const getTypeSpecificFields = (user: any, userType: UserType) => {
  switch (userType) {
    case "Student":
      return {
        grade: user.student?.studentGrade || user.studentGrade || '',
        class: user.student?.studentClass || user.studentClass || '',
        medium: user.student?.medium || user.medium || '',
        studentAdmissionNo: user.student?.studentAdmissionNo || user.studentAdmissionNo || '',
      };
    case "Teacher":
      // Normalize whatever backend returned into an array of assignments
      const rawTeacherArray = user.teacher || user.teacherData || user.teacherAssignments || [];
      const teacherArray = Array.isArray(rawTeacherArray) ? rawTeacherArray : rawTeacherArray ? [rawTeacherArray] : [];

      // Build joined display strings (unique grades)
      const grades = teacherArray.map((t: any) => t.teacherGrade || t.grade).filter(Boolean);
      const uniqueGrades = Array.from(new Set(grades));
      const classes = teacherArray.map((t: any) => {
        if (Array.isArray(t.teacherClass)) return t.teacherClass.join(', ');
        return t.teacherClass || t.class || '';
      }).filter(Boolean);
      const subjects = teacherArray.map((t: any) => {
        if (Array.isArray(t.subject)) return t.subject.join(', ');
        return t.subject || '';
      }).filter(Boolean);
      const mediums = teacherArray.map((t: any) => {
        if (Array.isArray(t.medium)) return t.medium.join(', ');
        return t.medium || '';
      }).filter(Boolean);

      const staffNo = teacherArray.find((t: any) => t.staffNo)?.staffNo || user.staffNo || '';

      // Map assignments into a consistent shape
      const normalizedAssignments = teacherArray.map((t: any) => ({
        teacherGrade: t.teacherGrade || t.grade || '',
        teacherClass: Array.isArray(t.teacherClass) ? t.teacherClass.join(', ') : t.teacherClass || t.class || '',
        subject: Array.isArray(t.subject) ? t.subject.join(', ') : t.subject || '',
        medium: Array.isArray(t.medium) ? t.medium.join(', ') : t.medium || '',
        staffNo: t.staffNo || user.staffNo || '',
        modifiedBy: t.modifiedBy || undefined
      }));

      return {
        // joined strings for the grid display
        grade: uniqueGrades.join(', '),
        class: classes.join(', '),
        subject: subjects.join(', '),
        medium: mediums.join(', '),
        staffNo,
        // include the full assignments array so UI can edit properly
        teacherData: normalizedAssignments,
        teacherAssignments: normalizedAssignments
      };
    case "Parent":

      const rawParentArray = user.parent ?? user.parentData ?? [];
      const parentArray = Array.isArray(rawParentArray) ? rawParentArray : (rawParentArray ? [rawParentArray] : []);

      const normalizedParents = parentArray.map((p: any) => ({
        id: p?.id ?? null,
        studentAdmissionNo: p?.studentAdmissionNo ?? '',
        profession: p?.profession ?? '',
        parentContact: p?.parentContact ?? '',
        relation: p?.relation ?? '',
        // keep userId/userType normalized to strings where present
        userId: p?.userId !== undefined ? String(p.userId) : (user?.id !== undefined ? String(user.id) : undefined),
        userType: p?.userType ?? user?.userType ?? 'Parent',
        modifiedBy: p?.modifiedBy ?? undefined,
        created_at: p?.created_at ?? undefined,
        updated_at: p?.updated_at ?? undefined
      }));

      const firstParent = normalizedParents[0] ?? null;

      return {
        // root-level fields for grid display (existing behavior)
        profession: firstParent?.profession ?? user.profession ?? '',
        parentContact: firstParent?.parentContact ?? user.parentContact ?? '',
        studentAdmissionNo: firstParent?.studentAdmissionNo ?? user.studentAdmissionNo ?? '',
        relation: firstParent?.relation ?? user.relation ?? '',
        // keep a single-object parentData (matches User.parentData type)
        parentData: firstParent
          ? {
              profession: firstParent.profession,
              parentContact: firstParent.parentContact,
              studentAdmissionNo: firstParent.studentAdmissionNo,
              relation: firstParent.relation
            }
          : undefined,
        // expose the full array for UI editing/loading
        parentEntries: normalizedParents.map(p => ({
          relation: p.relation,
          profession: p.profession,
          parentContact: p.parentContact,
          studentAdmissionNo: p.studentAdmissionNo
        }))
      };
    default:
      return {};
  }
};


export const createUser = async (userData: User): Promise<User> => {
  const url = `${API_BASE_URL}${createEndpointForUserType(userData.userType)}`;
  
const baseData = {
  name: userData.name,
  username: userData.username,
  email: userData.email,
  password: userData.password,
  address: userData.address || '',
  birthDay: userData.birthDay || '',
  contact: userData.contact || '',
  gender: userData.gender || '',
  status: userData.status,
  userType: userData.userType,
  userRole: userData.userRole, // Use the role from userData, not getUserRole
  photo: userData.photo === "" ? null : (userData.photo ?? null),
};
  let formattedData: any = { ...baseData };

  switch (userData.userType) {
    case "Student":
      // Base user data that matches the backend's userData structure
      formattedData = {
        ...formattedData,
        name: userData.name,
        address: userData.address || '',
        email: userData.email,
        birthDay: userData.birthDay || '',
        contact: userData.contact || '',
        userType: userData.userType,
        gender: userData.gender || '',
        username: userData.username,
        photo: userData.photo === "" ? null : (userData.photo ?? null),
        // Prefer explicit role from the form (userData.userRole). Fall back to default for the type.
        userRole: userData.userRole ?? getUserRole(userData.userType),
        status: userData.status,
        // Student specific fields that need to be at root level
        studentGrade: safeString(userData.grade) || safeString(userData.studentGrade) || '',
        studentClass: safeString(userData.class) || safeString(userData.studentClass) || '',
        medium: safeString(userData.medium) || '',
        studentAdmissionNo: safeString(userData.studentAdmissionNo) || '',
        // Additional required fields from backend
        modifiedBy: localStorage.getItem('userName') || 'System'
      };

      // Clean up undefined/null values but keep empty strings as backend expects them
      Object.keys(formattedData).forEach(key => {
        if (formattedData[key] === undefined || formattedData[key] === null) {
          formattedData[key] = '';
        }
      });
      break;

    case "Teacher":
      // Prefer explicit teacherData or teacherAssignments if provided by UI
      let teacherAssignmentsSource: any[] = [];

      if (Array.isArray(userData.teacherAssignments) && userData.teacherAssignments.length > 0) {
        teacherAssignmentsSource = userData.teacherAssignments;
      } else if (Array.isArray(userData.teacherData) && userData.teacherData.length > 0) {
        teacherAssignmentsSource = userData.teacherData;
      } else if (userData.grade || userData.class || userData.subject || userData.medium || userData.staffNo) {
        teacherAssignmentsSource = [{
          teacherGrade: userData.grade || '',
          teacherClass: userData.class || '',
          subject: userData.subject || '',
          medium: userData.medium || '',
          staffNo: userData.staffNo || '',
        }];
      }

      const formattedTeacherAssignments = teacherAssignmentsSource
        .map(a => ({
          teacherGrade: a.teacherGrade || a.grade || '',
          teacherClass: Array.isArray(a.teacherClass) ? a.teacherClass.join(', ') : (a.teacherClass || a.class || ''),
          subject: Array.isArray(a.subject) ? a.subject.join(', ') : (a.subject || ''),
          medium: Array.isArray(a.medium) ? a.medium.join(', ') : (a.medium || ''),
          staffNo: a.staffNo || userData.staffNo || '',
        }));

      // Always include teacherData key (either formatted assignments or empty array).
      formattedData = {
        ...formattedData,
        teacherData: formattedTeacherAssignments.length > 0 ? formattedTeacherAssignments : (Array.isArray(userData.teacherData) ? userData.teacherData : []),
      };

      // Also include some root-level display fields for grid
      formattedData.grade = formattedTeacherAssignments.map(a => a.teacherGrade).filter(Boolean).join(', ');
      formattedData.class = formattedTeacherAssignments.map(a => a.teacherClass).filter(Boolean).join(', ');
      formattedData.subject = formattedTeacherAssignments.map(a => a.subject).filter(Boolean).join(', ');
      formattedData.medium = formattedTeacherAssignments.map(a => a.medium).filter(Boolean).join(', ');
      formattedData.staffNo = formattedTeacherAssignments.find(a => a.staffNo)?.staffNo || userData.staffNo || '';
      break;

    case "Parent":
      // Prefer an explicit array sent from the UI (parentEntries or parentData)
      let parentEntriesSource: any[] = [];

      if (Array.isArray(userData.parentEntries) && userData.parentEntries.length > 0) {
        parentEntriesSource = userData.parentEntries;
      } else if (Array.isArray((userData as any).parentData) && (userData as any).parentData.length > 0) {
        // backend or UI may use parentData as an array in some places
        parentEntriesSource = (userData as any).parentData;
      } else if (userData.relation || userData.parentContact || userData.profession || userData.studentAdmissionNo) {
        // fallback to single root-level fields
        parentEntriesSource = [{
          relation: userData.relation || '',
          profession: userData.profession || '',
          parentContact: userData.parentContact || userData.contact || '',
          studentAdmissionNo: userData.studentAdmissionNo || ''
        }];
      }

      const currentUser = localStorage.getItem('userName') || 'System';
      const formattedParentEntries = parentEntriesSource
        .map(p => ({
          // normalize and trim
          studentAdmissionNo: safeString(p.studentAdmissionNo) ?? null,
          parentContact: safeString(p.parentContact) ?? null,
          profession: safeString(p.profession) ?? null,
          relation: safeString(p.relation) ?? null,
          // include metadata expected by backend
          userType: userData.userType,
          modifiedBy: currentUser
        }))
        // optional: drop entirely empty entries
        .filter(entry => Object.values(entry).some(v => v !== null && v !== ''));

      // Put first entry fields on root level for grid display (keep keys even if null)
      const first = formattedParentEntries[0] ?? null;
      formattedData.studentAdmissionNo = first ? first.studentAdmissionNo : (userData.studentAdmissionNo ?? null);
      formattedData.parentContact = first ? first.parentContact : (userData.parentContact ?? (userData.contact ?? null));
      formattedData.profession = first ? first.profession : (userData.profession ?? null);
      formattedData.relation = first ? first.relation : (userData.relation ?? null);

      // Send the full parent array as parentData (backend expects array for update/create)
      formattedData.parentData = formattedParentEntries.length > 0 ? formattedParentEntries : [{
        userType: userData.userType,
        studentAdmissionNo: formattedData.studentAdmissionNo,
        parentContact: formattedData.parentContact,
        profession: formattedData.profession,
        relation: formattedData.relation,
        modifiedBy: currentUser
      }];

      break;
  }

  // Cleanup: remove undefined values but preserve keys the backend expects to exist
  // List of keys we must NOT remove (backend accesses them directly)
  const requiredKeysToKeep = ['photo', 'teacherData', 'studentGrade', 'studentClass', 'studentData', 'studentAdmissionNo', 'relation', 'profession', 'parentContact', 'location'];

  Object.keys(formattedData).forEach(key => {
    if (
      (formattedData[key] === undefined) ||
      (formattedData[key] === null) ||
      (formattedData[key] === '' && !requiredKeysToKeep.includes(key)) ||
      (Array.isArray(formattedData[key]) && formattedData[key].length === 0 && !requiredKeysToKeep.includes(key))
    ) {
      delete formattedData[key];
    }
  });

  // Clean up nested studentData but keep required student keys even if empty
  if (formattedData.studentData) {
    Object.keys(formattedData.studentData).forEach(key => {
      if (formattedData.studentData[key] === undefined || formattedData.studentData[key] === null) {
        delete formattedData.studentData[key];
      }
      // if it's empty string keep it (so backend won't frown on missing keys)
    });
  }

  // Ensure photo key exists (in case any cleanup removed it erroneously)
  if (!Object.prototype.hasOwnProperty.call(formattedData, 'photo')) {
    formattedData.photo = userData.photo === "" ? null : (userData.photo ?? null);
  }

  // Ensure teacherData key exists for Teacher payloads (even if empty array)
  if (userData.userType === "Teacher" && !Object.prototype.hasOwnProperty.call(formattedData, 'teacherData')) {
    formattedData.teacherData = Array.isArray(userData.teacherData) ? userData.teacherData : [];
  }

  // Ensure location key exists (backend may expect it)
  if (!Object.prototype.hasOwnProperty.call(formattedData, 'location')) {
    formattedData.location = null;
  }

  console.log('Creating user with data:', formattedData);

  try {
    const response = await axios.post<UserResponse>(
      url,
      formattedData,
      {
        ...getAuthHeader(),
        withCredentials: true
      }
    );
    return response.data.data;
  } catch (error: any) {
    console.error('Create user API error:', error);
    console.error('Error response:', error.response?.data);
    throw error;
  }
};

export const updateUser = async (id: number, userData: User): Promise<User> => {
  const url = `${API_BASE_URL}${updateEndpointForUserType(userData.userType, id)}`;
  try {
    const response = await axios.post<UserResponse>(
      url,
      userData,
      getAuthHeader()
    );
    return response.data.data;
  } catch (error) {
    console.error('Update user error:', error);
    throw error;
  }
};

export const deactivateUser = async (id: number, userType: UserType): Promise<void> => {
  const url = `${API_BASE_URL}${deactivateEndpointForUserType(userType, id)}`;
  await axios.post(
    url,
    { status: false },
    getAuthHeader()
  );
};

// new: delete user
export const deleteUser = async (id: number, userType: UserType): Promise<void> => {
  const url = `${API_BASE_URL}${deleteEndpointForUserType(userType, id)}`;
  try {
    // Use HTTP DELETE (backend complains POST not supported)
    await axios.delete(url, {
      ...getAuthHeader(),
      withCredentials: true,
      timeout: 15000
    });
  } catch (error) {
    console.error(`Error deleting user (${userType}, id=${id}):`, error);
    throw error;
  }
};

export const searchUsers = async (searchTerm: string, userType: UserType): Promise<User[]> => {
  let endpoint = '';
  
  // Determine the correct endpoint based on userType
  switch (userType) {
    case 'Teacher':
      endpoint = '/api/teacher/search';
      break;
    case 'Student':
      endpoint = '/api/student/search';
      break;
    case 'Parent':
      endpoint = '/api/parent/search';
      break;
    default:
      throw new Error('Invalid user type for search');
  }

  try {
    const response = await axios.get<UserListResponse>(
      `${API_BASE_URL}${endpoint}`,
      {
        ...getAuthHeader(),
        params: {
          keyword: searchTerm
        },
      }
    );

    // Normalize/unwrap response into an array of raw user objects
    const rawArray = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
        ? response.data
        : (response.data?.data && Array.isArray(response.data?.data)) ? response.data.data : [];

    if (!Array.isArray(rawArray)) return [];

    // Map/normalize each raw user into the UI User shape (same as fetchUsers)
    return rawArray.map((user: any) => ({
      id: user.id,
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      status: user.status ?? true,
      userType,
      userRole: user.userRole || getUserRole(userType),
      address: user.address || '',
      birthDay: user.birthDay || '',
      contact: user.contact || '',
      gender: user.gender || '',
      photo: user.photo || '',
      grade: '',
      class: '',
      medium: '',
      studentAdmissionNo: '',
      subject: '',
      staffNo: '',
      profession: '',
      parentContact: '',
      relation: user.relation || user.parent?.relation || '',
      ...getTypeSpecificFields(user, userType)
    }));
        
  } catch (error) {
    console.error('Search users error:', error);
    throw error;
  }
};

export const bulkDeactivateUsers = async (ids: number[], userType: UserType): Promise<void> => {
  const promises = ids.map(id => deactivateUser(id, userType));
  await Promise.all(promises);
};
function safeString(value: string | string[] | undefined | null): string | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.join(', ').trim() || null;
  }
  const trimmed = String(value).trim();
  return trimmed || null;
}

