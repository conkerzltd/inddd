import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: Array<"owner" | "admin" | "secretary" | "doctor">;
}

const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user, userRoles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = userRoles.some((ur) =>
      requiredRoles.includes(ur.role as any)
    );
    if (!hasRequiredRole) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="mt-2 text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
