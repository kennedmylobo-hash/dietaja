import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'super_admin' | 'customer')[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        return;
      }

      if (!allowedRoles || allowedRoles.length === 0) {
        setHasAccess(true);
        return;
      }

      // Check roles in parallel
      const roleChecks = allowedRoles.map((role) =>
        supabase.rpc('has_role', { _user_id: user.id, _role: role })
      );

      const results = await Promise.all(roleChecks);
      const anyRole = results.some(({ data }) => data === true);
      setHasAccess(anyRole);
    };

    checkAccess();
  }, [user, allowedRoles]);

  if (hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
