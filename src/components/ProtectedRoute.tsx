import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { validateUser, validatePermissions } from '../services/authService';
import PageLoader from './PageLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
  requiredPermissions?: string[];
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const validate = async () => {
      try {
        const user = await validateUser();
        const hasValidPermissions = await validatePermissions();

        if (user && hasValidPermissions) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Authentication validation error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsValidating(false);
      }
    };

    validate();
  }, [location.pathname]);

  if (isValidating) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;