import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/gameStore';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, role } = useAuthStore();

  if (!token) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return children;
}
