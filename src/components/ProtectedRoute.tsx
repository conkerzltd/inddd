import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
  skipProfileCheck?: boolean;
}

const ProtectedRoute = ({ children, skipOnboardingCheck, skipProfileCheck }: ProtectedRouteProps) => {
  const { user, clinicId, clinicStatus, profileComplete, loading } = useAuth();

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

  // No clinic yet → onboarding
  if (!skipOnboardingCheck && !clinicId) {
    return <Navigate to="/onboarding" replace />;
  }

  // Clinic exists but not approved → onboarding (shows pending/rejected)
  if (!skipOnboardingCheck && clinicId && clinicStatus !== "active") {
    return <Navigate to="/onboarding" replace />;
  }

  // Clinic approved but profile not complete → clinic-profile
  if (!skipProfileCheck && clinicId && clinicStatus === "active" && !profileComplete) {
    return <Navigate to="/clinic-profile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
