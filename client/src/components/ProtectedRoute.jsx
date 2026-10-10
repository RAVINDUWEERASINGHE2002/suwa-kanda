import React from 'react';
import { useAuth } from '../context/AuthContext';
import PinLogin from './PinLogin';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <PinLogin requiredRole={requiredRole} />;
  }

  if (requiredRole === 'admin' && user?.role !== 'admin') {
    return <PinLogin requiredRole="admin" />;
  }

  return children;
}
