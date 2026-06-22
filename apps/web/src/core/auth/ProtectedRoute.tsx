import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store';
import type { Permission } from '@agbms/shared';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

interface RoleGuardProps {
  permission?: Permission;
  children: React.ReactNode;
}

export function RoleGuard({ permission, children }: RoleGuardProps) {
  const can = useAuthStore((s) => s.can);
  if (permission && !can(permission)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-navy-500">
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm">You don't have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
