import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import logoSymbol from "@/assets/logo-symbol.png";
import ClinicProfileForm from "@/components/clinic/ClinicProfileForm";

type OnboardingStep = "create" | "profile" | "pending" | "rejected";

const ClinicOnboarding = () => {
  const { user, clinicId, clinicStatus, loading: authLoading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Determine step based on auth state
  const getStep = (): OnboardingStep => {
    if (!clinicId) return "create";
    if (clinicStatus === "active") return "profile"; // shouldn't happen, but fallback
    if (clinicStatus === "blocked") return "rejected";
    // pending or profile incomplete
    return "pending";
  };

  const [step, setStep] = useState<OnboardingStep>(getStep);
  const [clinicName, setClinicName] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setStep(getStep());
  }, [clinicId, clinicStatus]);

  // If clinic is active and profile complete, redirect to console
  useEffect(() => {
    if (!authLoading && clinicId && clinicStatus === "active") {
      navigate("/console", { replace: true });
    }
  }, [authLoading, clinicId, clinicStatus, navigate]);

  const { data: specialties } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("specialties").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: governorates } = useQuery({
    queryKey: ["governorates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("geo_localities").select("governorate_ar").order("governorate_ar");
      if (error) throw error;
      return [...new Set(data.map((d) => d.governorate_ar))];
    },
  });

  const { data: cities } = useQuery({
    queryKey: ["cities", governorate],
    queryFn: async () => {
      if (!governorate) return [];
      const { data, error } = await supabase.from("geo_localities").select("level2_ar").eq("governorate_ar", governorate).order("level2_ar");
      if (error) throw error;
      return [...new Set(data.map((d) => d.level2_ar))];
    },
    enabled: !!governorate,
  });

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const marketerId = localStorage.getItem("pending_marketer_id");
      const { data, error } = await supabase.rpc("onboard_clinic", {
        p_name_ar: clinicName.trim(),
        p_primary_specialty_id: specialtyId,
        p_governorate_ar: governorate,
        p_locality_level2_ar: city,
        p_phone: phone.trim() || null,
        p_marketer_id: marketerId || null,
      });
      if (error) throw error;
      localStorage.removeItem("pending_marketer_id");
      return data;
    },
    onSuccess: async () => {
      toast({ title: "تم إنشاء العيادة بنجاح", description: "أكمل بيانات العيادة…" });
      await refreshRoles();
      // Step will update via useEffect when clinicId populates
    },
    onError: (err: any) => {
      toast({ title: "فشل إنشاء العيادة", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName.trim() || !specialtyId || !governorate || !city) {
      toast({ title: "بيانات ناقصة", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    onboardMutation.mutate();
  };

  const handleProfileSaved = async () => {
    // After saving profile, clinic goes to pending status
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

  // Step: Create clinic (no clinic yet)
  if (step === "create" && !clinicId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl">إعداد العيادة</CardTitle>
            <CardDescription>أكمل البيانات الأساسية لإنشاء العيادة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinic-name">اسم العيادة *</Label>
                <Input id="clinic-name" placeholder="مثال: عيادة د. أحمد للباطنة" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>التخصص *</Label>
                <Select value={specialtyId} onValueChange={setSpecialtyId} required>
                  <SelectTrigger><SelectValue placeholder="اختر التخصص" /></SelectTrigger>
                  <SelectContent>
                    {specialties?.map((s) => (<SelectItem key={s.id} value={s.id}>{s.specialty_ar}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>المحافظة *</Label>
                  <Select value={governorate} onValueChange={(v) => { setGovernorate(v); setCity(""); }} required>
                    <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                    <SelectContent>{governorates?.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المدينة/المركز *</Label>
                  <Select value={city} onValueChange={setCity} disabled={!governorate} required>
                    <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                    <SelectContent>{cities?.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic-phone">رقم الهاتف (اختياري)</Label>
                <Input id="clinic-phone" type="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
              </div>
              <Button type="submit" className="w-full" disabled={onboardMutation.isPending || !clinicName.trim() || !specialtyId || !governorate || !city}>
                {onboardMutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin me-2" />جاري الإنشاء…</>) : "إنشاء العيادة والمتابعة"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step: Fill complete profile (clinic exists but profile not complete)
  if (step === "create" && clinicId) {
    // Clinic was just created, show profile form
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="border-b border-border bg-card px-4 py-3">
          <div className="container mx-auto flex items-center gap-3">
            <img src={logoSymbol} alt="inddd" className="h-8 w-8" />
            <div>
              <h1 className="text-lg font-bold text-foreground">إعداد العيادة</h1>
              <p className="text-sm text-muted-foreground">أكمل بيانات العيادة للمراجعة والموافقة</p>
            </div>
          </div>
        </header>
        <main className="container mx-auto p-4 max-w-2xl">
          <ClinicProfileForm clinicId={clinicId} onSaved={handleProfileSaved} submitLabel="حفظ وإرسال للمراجعة" />
        </main>
      </div>
    );
  }

  // Step: Pending approval
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

  // Step: Rejected — allow editing and resubmission
  if (step === "rejected") {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="border-b border-border bg-card px-4 py-3">
          <div className="container mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <img src={logoSymbol} alt="inddd" className="h-8 w-8" />
              <h1 className="text-lg font-bold text-foreground">تعديل بيانات العيادة</h1>
            </div>
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">تم رفض الطلب</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                يرجى مراجعة البيانات وتعديلها ثم إعادة الإرسال.
              </p>
            </div>
          </div>
        </header>
        <main className="container mx-auto p-4 max-w-2xl">
          {clinicId && (
            <ClinicProfileForm
              clinicId={clinicId}
              onSaved={async () => {
                // Reset status to pending for re-review
                await supabase.from("clinics").update({ status: "pending" } as any).eq("id", clinicId);
                await refreshRoles();
                setStep("pending");
              }}
              submitLabel="إعادة الإرسال للمراجعة"
            />
          )}
        </main>
      </div>
    );
  }

  return null;
};

export default ClinicOnboarding;
