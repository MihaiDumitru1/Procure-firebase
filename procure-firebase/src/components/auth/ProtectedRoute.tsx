import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, suppliers landing on this route are redirected to /supplier-portal */
  redirectSuppliers?: boolean;
  /** Restrict route exclusively to suppliers (non-suppliers redirected to /) */
  suppliersOnly?: boolean;
}

export function ProtectedRoute({ children, redirectSuppliers, suppliersOnly }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Se încarcă...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (redirectSuppliers && role === 'supplier') {
    return <Navigate to="/supplier-portal" replace />;
  }

  if (suppliersOnly && role && role !== 'supplier') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
