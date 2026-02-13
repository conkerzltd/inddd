import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Clock, XCircle } from "lucide-react";
import logoSymbol from "@/assets/logo-symbol.png";
import ClinicProfileForm from "@/components/clinic/ClinicProfileForm";

type OnboardingStep = "create" | "profile" | "pending" | "rejected";

const ClinicOnboarding = () => {
  const { user, clinicId, clinicStatus, loading: authLoading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const getStep = (): OnboardingStep => {
    if (!clinicId) return "create";
    if (clinicStatus === "active") return "profile"; // fallback, redirect should catch
    if (clinicStatus === "blocked") return "rejected";
    if (clinicStatus === "pending") return "pending";
    return "create";
  };

  const [step, setStep] = useState<OnboardingStep>(getStep);
  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setStep(getStep());
  }, [clinicId, clinicStatus]);

  // If clinic is active, redirect to console
  useEffect(() => {
    if (!authLoading && clinicId && clinicStatus === "active") {
      navigate("/console", { replace: true });
    }
  }, [authLoading, clinicId, clinicStatus, navigate]);

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const marketerId = localStorage.getItem("pending_marketer_id");
      // Create a minimal clinic record — profile form will fill the rest
      const { data, error } = await supabase.rpc("onboard_clinic", {
        p_name_ar: clinicName.trim(),
        p_primary_specialty_id: "00000000-0000-0000-0000-000000000000", // placeholder, profile form sets real one
        p_governorate_ar: "placeholder",
        p_locality_level2_ar: "placeholder",
        p_phone: phone.trim() || null,
        p_marketer_id: marketerId || null,
      });
      if (error) throw error;
      localStorage.removeItem("pending_marketer_id");
      return data;
    },
    onSuccess: async () => {
      toast({ title: "تم إنشاء العيادة", description: "أكمل بيانات العيادة…" });
      await refreshRoles();
    },
    onError: (err: any) => {
      toast({ title: "فشل إنشاء العيادة", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName.trim()) {
      toast({ title: "بيانات ناقصة", description: "يرجى إدخال اسم العيادة", variant: "destructive" });
      return;
    }
    onboardMutation.mutate();
  };

  const handleProfileSaved = async () => {
    // After saving profile, clinic goes to pending status
    if (clinicId) {
      await supabase.from("clinics").update({ status: "pending" } as any).eq("id", clinicId);
    }
    await refreshRoles();
    setStep("pending");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Step 1: Create clinic (no clinic yet)
  if (step === "create" && !clinicId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl">إعداد العيادة</CardTitle>
            <CardDescription>أدخل اسم العيادة لبدء التسجيل</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinic-name">اسم العيادة *</Label>
                <Input id="clinic-name" placeholder="مثال: عيادة د. أحمد للباطنة" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic-phone">رقم الهاتف (اختياري)</Label>
                <Input id="clinic-phone" type="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
              </div>
              <Button type="submit" className="w-full" disabled={onboardMutation.isPending || !clinicName.trim()}>
                {onboardMutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin me-2" />جاري الإنشاء…</>) : "إنشاء العيادة والمتابعة"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Fill profile using the SAME ClinicProfileForm used in /clinic-profile
  if ((step === "create" && clinicId) || step === "rejected") {
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
                    : "أكمل بيانات العيادة للمراجعة والموافقة"}
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
          {clinicId && (
            <ClinicProfileForm
              clinicId={clinicId}
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
