import { useEffect, useState, useMemo } from 'react';
import type { PermissionKey } from '../api/userAccessmanagementApi';

export const usePermissions = () => {
  // keep an array of allowed permission keys for easy checks across the app
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);

  // memoized Set for quick lookup
  const permissionsSet = useMemo(() => new Set(permissions), [permissions]);

  useEffect(() => {
    const loadPermissions = () => {
      try {
        // If explicit userPermissions stored, use that first
        const permissionsStr = localStorage.getItem('userPermissions');
        if (permissionsStr) {
          const parsed = JSON.parse(permissionsStr);
          // parsed might be an array of keys, or an object mapping keys->boolean
          if (Array.isArray(parsed)) {
            // ensure items are strings and cast to PermissionKey[]
            setPermissions(parsed.filter(Boolean).map(String) as PermissionKey[]);
            return;
          }

          if (parsed && typeof parsed === 'object') {
            // collect keys whose value is truthy (true)
            const allowed = Object.entries(parsed)
              .filter(([_, v]) => v === true)
              .map(([k]) => k) as PermissionKey[];
            setPermissions(allowed);
            return;
          }

          // fallback
          setPermissions([]);
          return;
        }

        // Fallback: read from raw userData if userPermissions not present
        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
          const user = JSON.parse(userDataStr);
          if (user.access && user.access.length > 0) {
            const first = user.access[0];
            let parsed: any;
            try {
              parsed = typeof first === 'string' ? JSON.parse(first) : first;
            } catch (err) {
              console.error('Error parsing user.access[0]:', err);
              parsed = {};
            }

            if (Array.isArray(parsed)) {
              setPermissions(parsed.filter(Boolean).map(String) as PermissionKey[]);
              localStorage.setItem('userPermissions', JSON.stringify(parsed));
              return;
            }

            if (parsed && typeof parsed === 'object') {
              const allowed = Object.entries(parsed)
                .filter(([_, v]) => v === true)
                .map(([k]) => k) as PermissionKey[];
              setPermissions(allowed);
              localStorage.setItem('userPermissions', JSON.stringify(parsed));
              return;
            }
          }
        }

        // default
        setPermissions([]);
      } catch (error) {
        console.error('Error loading permissions:', error);
        setPermissions([]);
      }
    };

    loadPermissions();
  }, []);

  // check if a permission key is allowed
  const hasPermission = (permission: PermissionKey): boolean => {
    return permissionsSet.has(permission);
  };

  return {
    hasPermission,
    permissions, // list of allowed permission keys (derived from object or array)
  };
};