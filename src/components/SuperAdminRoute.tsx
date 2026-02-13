import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getLocaleFromPathname } from "@/i18n/locale";
import { withLocalePath } from "@/i18n/paths";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const { user, userRoles, loading } = useAuth();
  const { pathname } = useLocation();
  const locale = getLocaleFromPathname(pathname);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">جاري التحميل…</div>
      </div>
    );
  }

  // Not logged in → redirect to owner portal login
  if (!user) {
    return <Navigate to={withLocalePath(locale, "/owner-portal/login")} replace />;
  }

  // Logged in but not superadmin → redirect to 404
  const isSuperAdmin = userRoles.some((ur) => (ur.role as string) === "superadmin");
  if (!isSuperAdmin) {
    return <Navigate to={withLocalePath(locale, "/404")} replace />;
  }

  return <>{children}</>;
};

export default SuperAdminRoute;
