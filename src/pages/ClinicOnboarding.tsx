import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import logoSymbol from "@/assets/logo-symbol.png";
import ClinicProfileForm from "@/components/clinic/ClinicProfileForm";

type OnboardingStep = "profile" | "pending" | "rejected";

const ClinicOnboarding = () => {
  const { user, clinicId, clinicStatus, loading: authLoading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const autoCreating = useRef(false);
  const [localClinicId, setLocalClinicId] = useState<string | null>(null);

  const effectiveClinicId = clinicId || localClinicId;

  const getStep = (): OnboardingStep => {
    if (clinicStatus === "blocked") return "rejected";
    if (clinicStatus === "pending") return "pending";
    return "profile";
  };

  const [step, setStep] = useState<OnboardingStep>(getStep);

  useEffect(() => {
    setStep(getStep());
  }, [clinicId, clinicStatus]);

  // If clinic is active, redirect to console
  useEffect(() => {
    if (!authLoading && clinicId && clinicStatus === "active") {
      navigate("/console", { replace: true });
    }
  }, [authLoading, clinicId, clinicStatus, navigate]);

  // Auto-create a minimal clinic record so the full form can load
  useEffect(() => {
    if (authLoading || effectiveClinicId || autoCreating.current) return;
    autoCreating.current = true;
    const create = async () => {
      const marketerId = localStorage.getItem("pending_marketer_id");
      const { data, error } = await supabase.rpc("onboard_clinic", {
        p_name_ar: "عيادة جديدة",
        p_primary_specialty_id: "00000000-0000-0000-0000-000000000000",
        p_governorate_ar: "placeholder",
        p_locality_level2_ar: "placeholder",
        p_locality_level2_type: "CITY",
        p_phone: null,
        p_marketer_id: marketerId || null,
      });
      if (error) {
        toast.error("فشل إنشاء العيادة: " + error.message);
        autoCreating.current = false;
        return;
      }
      localStorage.removeItem("pending_marketer_id");
      setLocalClinicId(data as string);
      await refreshRoles();
    };
    create();
  }, [authLoading, effectiveClinicId]);

  const handleProfileSaved = async () => {
    const cid = effectiveClinicId;
    if (cid) {
      await supabase.from("clinics").update({ status: "pending" } as any).eq("id", cid);
    }
    await refreshRoles();
    setStep("pending");
  };

  if (authLoading || (!effectiveClinicId && step === "profile")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Full profile form — same ClinicProfileForm used in /clinic-profile
  if (step === "profile" || step === "rejected") {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="border-b border-border bg-card px-4 py-3">
          <div className="container mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <img src={logoSymbol} alt="inddd" className="h-8 w-8" />
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {step === "rejected" ? "تعديل بيانات العيادة" : "إعداد العيادة"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {step === "rejected"
                    ? "يرجى مراجعة البيانات وتعديلها ثم إعادة الإرسال"
                    : "أكمل بيانات العيادة بالكامل للمراجعة والموافقة"}
                </p>
              </div>
            </div>
            {step === "rejected" && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">تم رفض الطلب</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  يرجى مراجعة البيانات وتعديلها ثم إعادة الإرسال.
                </p>
              </div>
            )}
          </div>
        </header>
        <main className="container mx-auto p-4 max-w-2xl">
          {effectiveClinicId && (
            <ClinicProfileForm
              clinicId={effectiveClinicId}
              onSaved={handleProfileSaved}
              submitLabel={step === "rejected" ? "إعادة الإرسال للمراجعة" : "حفظ وإرسال للمراجعة"}
            />
          )}
        </main>
      </div>
    );
  }

  // Step 3: Pending approval
  if (step === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">في انتظار الموافقة</CardTitle>
            <CardDescription className="text-base">
              تم إرسال بيانات العيادة للمراجعة. سيتم تفعيل حسابك بعد موافقة الإدارة.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              عادةً ما تتم المراجعة خلال ٢٤ ساعة. يمكنك إعادة تحميل الصفحة للتحقق من حالة الطلب.
            </div>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              تحديث الحالة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default ClinicOnboarding;
