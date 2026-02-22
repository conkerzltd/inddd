import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MarketerProtectedRouteProps {
  children: React.ReactNode;
}

const MarketerProtectedRoute = ({ children }: MarketerProtectedRouteProps) => {
  const { user, loading } = useAuth();

  const { data: isMarketer, isLoading } = useQuery({
    queryKey: ["marketer-mapping", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("marketer_users")
        .select("marketer_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">جاري التحميل…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/m" replace />;
  if (!isMarketer) return <Navigate to="/m" replace />;

  return <>{children}</>;
};

export default MarketerProtectedRoute;
