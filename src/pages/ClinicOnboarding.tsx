import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/i18n/useLocale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2 } from "lucide-react";

const ClinicOnboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const { toast } = useToast();

  const [clinicName, setClinicName] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  // Fetch specialties
  const { data: specialties } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specialties")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch unique governorates
  const { data: governorates } = useQuery({
    queryKey: ["governorates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geo_localities")
        .select("governorate_ar")
        .order("governorate_ar");
      if (error) throw error;
      const unique = [...new Set(data.map((d) => d.governorate_ar))];
      return unique;
    },
  });

  // Fetch cities for selected governorate
  const { data: cities } = useQuery({
    queryKey: ["cities", governorate],
    queryFn: async () => {
      if (!governorate) return [];
      const { data, error } = await supabase
        .from("geo_localities")
        .select("level2_ar")
        .eq("governorate_ar", governorate)
        .order("level2_ar");
      if (error) throw error;
      const unique = [...new Set(data.map((d) => d.level2_ar))];
      return unique;
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
    onSuccess: () => {
      toast({ title: "تم إنشاء العيادة بنجاح", description: "جاري التحويل للكونسول…" });
      // Force refresh auth to pick up new roles
      window.location.href = localePath("/console");
    },
    onError: (err: any) => {
      toast({ title: "فشل إنشاء العيادة", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName.trim() || !specialtyId || !governorate || !city) {
      toast({ title: "بيانات ناقصة", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    onboardMutation.mutate();
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">إعداد العيادة</CardTitle>
          <CardDescription>أكمل بيانات العيادة للبدء في استخدام النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinic-name">اسم العيادة *</Label>
              <Input
                id="clinic-name"
                placeholder="مثال: عيادة د. أحمد للباطنة"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>التخصص *</Label>
              <Select value={specialtyId} onValueChange={setSpecialtyId} required>
                <SelectTrigger>
                  <SelectValue placeholder="اختر التخصص" />
                </SelectTrigger>
                <SelectContent>
                  {specialties?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.specialty_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>المحافظة *</Label>
                <Select
                  value={governorate}
                  onValueChange={(v) => {
                    setGovernorate(v);
                    setCity("");
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المحافظة" />
                  </SelectTrigger>
                  <SelectContent>
                    {governorates?.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>المدينة/المركز *</Label>
                <Select value={city} onValueChange={setCity} disabled={!governorate} required>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المدينة" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities?.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinic-phone">رقم الهاتف (اختياري)</Label>
              <Input
                id="clinic-phone"
                type="tel"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={onboardMutation.isPending || !clinicName.trim() || !specialtyId || !governorate || !city}
            >
              {onboardMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                  جاري الإنشاء…
                </>
              ) : (
                "إنشاء العيادة والبدء"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClinicOnboarding;
