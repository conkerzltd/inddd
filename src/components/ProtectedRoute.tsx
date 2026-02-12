import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getLocaleFromPathname } from "@/i18n/locale";
import { withLocalePath } from "@/i18n/paths";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: Array<"owner" | "admin" | "secretary" | "doctor">;
}

const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user, userRoles, loading } = useAuth();
  const { pathname } = useLocation();
  const locale = getLocaleFromPathname(pathname);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={withLocalePath(locale, "/login")} replace />;
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
