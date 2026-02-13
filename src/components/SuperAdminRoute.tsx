import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const { user, userRoles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">جاري التحميل…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/owner-portal/login" replace />;
  }

  const isSuperAdmin = userRoles.some((ur) => (ur.role as string) === "superadmin");
  if (!isSuperAdmin) {
    return <Navigate to="/404" replace />;
  }

  return <>{children}</>;
};

export default SuperAdminRoute;
