import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected Route Component (Auth Disabled)
 * Renders children directly without authentication check
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  return <>{children}</>;
};

export default ProtectedRoute;
