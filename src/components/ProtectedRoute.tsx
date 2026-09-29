import { Navigate, Outlet } from 'react-router-dom';
import { getStoredUser, type PortalUser } from '../lib/api';

type ProtectedRouteProps = {
  allow: Array<PortalUser['role']>;
};

export default function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const user = getStoredUser();
  const token = localStorage.getItem('edu_token');

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
