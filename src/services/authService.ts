import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Login function
export async function login({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  try {
    const res = await api.post("/api/login", {
      username,
      password,
    });

    console.log('Login response:', res.data); // Debug log

    // Store token
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }

    let userData = res.data.user || res.data;

    // Store the complete user data
    localStorage.setItem('userData', JSON.stringify(userData));

    // Handle permissions: support both stringified JSON and an object in access[0]
    if (userData.access && userData.access.length > 0) {
      const first = userData.access[0];
      try {
        const permissions = typeof first === 'string' ? JSON.parse(first) : first;
        // store parsed permissions (array or object) as-is
        localStorage.setItem('userPermissions', JSON.stringify(permissions));
      } catch (error) {
        console.error('Error parsing permissions:', error);
        // fallback to empty object
        localStorage.setItem('userPermissions', JSON.stringify({}));
      }
    }

    return userData;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Logout function (unchanged)
export async function logout() {
  const token = localStorage.getItem('token');

  if (!token) return;

  try {
    await api.post('/api/logout', {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('userPermissions');
  }
}

// Add this function to validate permissions after token validation
export async function validatePermissions() {
  const token = localStorage.getItem('token');
  const userPermissions = localStorage.getItem('userPermissions');

  if (!token || !userPermissions) {
    return false;
  }

  try {
    const perms = JSON.parse(userPermissions);
    if (Array.isArray(perms)) {
      // permissions stored as an array (legacy): treat as present
      return perms.length >= 0;
    }
    // object shaped permissions: check keys exist (we consider presence of the object valid)
    if (perms && typeof perms === 'object') {
      return Object.keys(perms).length >= 0;
    }
    return false;
  } catch {
    return false;
  }
}

// Modify the existing validateUser function
export async function validateUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const response = await api.get('/api/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data) {
      const userData = response.data;
      localStorage.setItem('userData', JSON.stringify(userData));

      // Enhanced permission handling: accept array/object/string
      if (userData.access) {
        let userPermissions: any = {};
        try {
          if (Array.isArray(userData.access)) {
            const first = userData.access[0];
            userPermissions = typeof first === 'string' ? JSON.parse(first) : first;
          } else {
            // access not an array - may be stringified or an object
            userPermissions = typeof userData.access === 'string' ? JSON.parse(userData.access) : userData.access;
          }

          // store parsed permissions (may be array or object)
          localStorage.setItem('userPermissions', JSON.stringify(userPermissions));
        } catch (error) {
          console.error('Error parsing permissions:', error);
          localStorage.setItem('userPermissions', JSON.stringify({}));
          return null;
        }
      } else {
        localStorage.setItem('userPermissions', JSON.stringify({}));
        return null;
      }

      return userData;
    }
    return null;
  } catch (error) {
    // Clear all auth data on validation error
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('userPermissions');
    console.error("User validation failed:", error);
    return null;
  }
}

// Add request interceptor to add token to all requests (unchanged)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Utility functions (unchanged)
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}