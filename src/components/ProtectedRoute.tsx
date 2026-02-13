import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: Array<"doctor">;
  skipOnboardingCheck?: boolean;
  skipProfileCheck?: boolean;
}

const ProtectedRoute = ({ children, skipOnboardingCheck, skipProfileCheck }: ProtectedRouteProps) => {
  const { user, userRoles, clinicId, clinicStatus, profileComplete, loading } = useAuth();

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

  // No clinic yet → go to onboarding to create one
  if (!skipOnboardingCheck && !clinicId && userRoles.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  // Clinic exists but not approved → go to onboarding (shows pending/rejected)
  if (!skipOnboardingCheck && clinicId && clinicStatus !== "active") {
    return <Navigate to="/onboarding" replace />;
  }

  // Clinic approved but profile not complete → go to clinic-profile
  if (!skipProfileCheck && clinicId && clinicStatus === "active" && !profileComplete) {
    return <Navigate to="/clinic-profile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
