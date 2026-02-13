import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logoSymbol from "@/assets/logo-symbol.png";
import ClinicProfileForm from "@/components/clinic/ClinicProfileForm";

/** Clinic profile editing page (post-approval) */
const ClinicProfile = () => {
  const { clinicId, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background">جاري التحميل...</div>;
  if (!clinicId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">لا توجد عيادة. يرجى إعداد عيادة أولاً.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSymbol} alt="inddd" className="h-8 w-8" />
            <h1 className="text-lg font-bold text-foreground">ملف العيادة</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/console")}>
            <ArrowLeft className="ml-2 h-4 w-4" />العودة للوحة التحكم
          </Button>
        </div>
      </header>
      <main className="container mx-auto p-4 max-w-2xl">
        <ClinicProfileForm clinicId={clinicId} />
      </main>
    </div>
  );
};

export default ClinicProfile;
