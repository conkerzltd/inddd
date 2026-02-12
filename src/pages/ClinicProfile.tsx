import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Check, MapPin, Copy, CopyCheck } from "lucide-react";
import { toast } from "sonner";
import logoSymbol from "@/assets/logo-symbol.png";
import { EgyptPhoneInput } from "@/components/inputs/EgyptPhoneInput";
import { isValidEg10, toEgE164Digits, storedToInput10 } from "@/utils/phoneEG";

const DAYS = [
  { key: "sat", label: "السبت" },
  { key: "sun", label: "الأحد" },
  { key: "mon", label: "الاثنين" },
  { key: "tue", label: "الثلاثاء" },
  { key: "wed", label: "الأربعاء" },
  { key: "thu", label: "الخميس" },
  { key: "fri", label: "الجمعة" },
];

type WorkingHours = Record<string, { open: string; close: string } | null>;

const ClinicProfile = () => {
  const { clinicId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [clinicName, setClinicName] = useState("");
  const [clinicNameAr, setClinicNameAr] = useState("");
  const [whatsappLocal1, setWhatsappLocal1] = useState("");
  const [whatsappLocal2, setWhatsappLocal2] = useState("");
  const [addressText, setAddressText] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});

  const [specialties, setSpecialties] = useState<{ id: string; specialty_ar: string }[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>("");

  const [governorates, setGovernorates] = useState<string[]>([]);
  const [selectedGov, setSelectedGov] = useState("");
  const [level2Options, setLevel2Options] = useState<{ level2_ar: string; level2_type: string }[]>([]);
  const [selectedLevel2, setSelectedLevel2] = useState("");
  const [selectedLevel2Type, setSelectedLevel2Type] = useState("");
  const [villageOptions, setVillageOptions] = useState<string[]>([]);
  const [selectedVillage, setSelectedVillage] = useState("");
  const [villageOther, setVillageOther] = useState("");
  const [showVillageOther, setShowVillageOther] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [geoLoading, setGeoLoading] = useState(false);

  // Load specialties + governorates
  useEffect(() => {
    supabase.from("specialties").select("id, specialty_ar").order("sort_order").then(({ data }) => {
      if (data) setSpecialties(data);
    });
    supabase.from("geo_localities").select("governorate_ar").then(({ data }) => {
      if (data) {
        const unique = [...new Set(data.map((r) => r.governorate_ar))].sort();
        setGovernorates(unique);
      }
    });
  }, []);

  // Load clinic data
  useEffect(() => {
    if (!clinicId) return;
    supabase
      .from("clinics")
      .select("name, name_ar, whatsapp_local_1, whatsapp_local_2, address_text, maps_url, lat, lng, working_hours_json, primary_specialty_id, governorate_ar, locality_level2_ar, locality_level2_type, locality_level3_ar")
      .eq("id", clinicId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setClinicName(data.name || "");
        setClinicNameAr((data as any).name_ar || "");
        setWhatsappLocal1(storedToInput10((data as any).whatsapp_local_1));
        setWhatsappLocal2(storedToInput10((data as any).whatsapp_local_2));
        setAddressText(data.address_text || "");
        setMapsUrl(data.maps_url || "");
        setLat((data as any).lat || null);
        setLng((data as any).lng || null);
        setWorkingHours((data.working_hours_json as WorkingHours) || {});
        if (data.primary_specialty_id) setSelectedSpecialtyId(data.primary_specialty_id);
        if (data.governorate_ar) setSelectedGov(data.governorate_ar);
        if (data.locality_level2_ar) setSelectedLevel2(data.locality_level2_ar);
        if (data.locality_level2_type) setSelectedLevel2Type(data.locality_level2_type);
        if (data.locality_level3_ar) setSelectedVillage(data.locality_level3_ar);
      });
  }, [clinicId]);

  // Load level2 options when governorate changes
  useEffect(() => {
    if (!selectedGov) { setLevel2Options([]); return; }
    supabase
      .from("geo_localities")
      .select("level2_ar, level2_type")
      .eq("governorate_ar", selectedGov)
      .is("level3_ar", null)
      .then(({ data }) => {
        if (data) {
          const seen = new Set<string>();
          const unique = data.filter((r) => {
            const key = `${r.level2_ar}|${r.level2_type}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setLevel2Options(unique.sort((a, b) => a.level2_ar.localeCompare(b.level2_ar, "ar")));
        }
      });
  }, [selectedGov]);

  // Load village options when level2 changes (only for MARKAZ)
  useEffect(() => {
    if (!selectedGov || !selectedLevel2 || selectedLevel2Type !== "MARKAZ") {
      setVillageOptions([]);
      return;
    }
    supabase
      .from("geo_localities")
      .select("level3_ar")
      .eq("governorate_ar", selectedGov)
      .eq("level2_ar", selectedLevel2)
      .not("level3_ar", "is", null)
      .then(({ data }) => {
        if (data) {
          const villages = data.map((r) => r.level3_ar!).filter(Boolean).sort((a, b) => a.localeCompare(b, "ar"));
          setVillageOptions(villages);
          if (villages.length === 0) setShowVillageOther(true);
        }
      });
  }, [selectedGov, selectedLevel2, selectedLevel2Type]);

  const handleGovChange = (gov: string) => {
    setSelectedGov(gov);
    setSelectedLevel2("");
    setSelectedLevel2Type("");
    setSelectedVillage("");
    setVillageOther("");
    setShowVillageOther(false);
  };

  const handleLevel2Change = (val: string) => {
    const [l2, type] = val.split("|");
    setSelectedLevel2(l2);
    setSelectedLevel2Type(type);
    setSelectedVillage("");
    setVillageOther("");
    setShowVillageOther(false);
  };

  const handleVillageChange = (val: string) => {
    if (val === "__other__") {
      setSelectedVillage("");
      setShowVillageOther(true);
    } else {
      setSelectedVillage(val);
      setShowVillageOther(false);
      setVillageOther("");
    }
  };

  const updateWorkingHour = (day: string, field: "open" | "close", value: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...(prev[day] || { open: "", close: "" }), [field]: value },
    }));
  };

  const toggleDay = (day: string, enabled: boolean) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: enabled ? { open: "09:00", close: "17:00" } : null,
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGeoLoading(false);
        toast.success("تم تحديد الموقع!");
      },
      (err) => {
        setGeoLoading(false);
        toast.error("فشل تحديد الموقع: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!clinicName.trim()) errs.clinicName = "اسم العيادة (إنجليزي) مطلوب";
    if (!clinicNameAr.trim()) errs.clinicNameAr = "اسم العيادة (عربي) مطلوب";
    if (!whatsappLocal1 || whatsappLocal1.length !== 10 || !/^\d{10}$/.test(whatsappLocal1)) errs.whatsappLocal1 = "يجب أن يكون ١٠ أرقام";
    if (whatsappLocal2 && (whatsappLocal2.length !== 10 || !/^\d{10}$/.test(whatsappLocal2))) errs.whatsappLocal2 = "يجب أن يكون ١٠ أرقام";
    if (!selectedSpecialtyId) errs.specialty = "التخصص مطلوب";
    if (!selectedGov) errs.gov = "المحافظة مطلوبة";
    if (!selectedLevel2) errs.level2 = "المدينة / المركز مطلوب";
    if (!addressText.trim()) errs.address = "العنوان التفصيلي مطلوب";
    if (selectedLevel2Type === "MARKAZ" && showVillageOther && !villageOther.trim()) {
      errs.villageOther = "يرجى إدخال اسم القرية";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!clinicId) return;
    if (!validate()) {
      toast.error("يرجى تصحيح الأخطاء قبل الحفظ");
      return;
    }
    setSaving(true);
    setSaved(false);
    const finalVillage = showVillageOther ? villageOther : selectedVillage;
    const { error } = await supabase
      .from("clinics")
      .update({
        name: clinicName,
        name_ar: clinicNameAr,
        whatsapp_local_1: whatsappLocal1 ? "0" + whatsappLocal1 : null,
        whatsapp_e164_1: whatsappLocal1 ? toEgE164Digits(whatsappLocal1) : null,
        whatsapp_local_2: whatsappLocal2 ? "0" + whatsappLocal2 : null,
        whatsapp_e164_2: whatsappLocal2 ? toEgE164Digits(whatsappLocal2) : null,
        clinic_whatsapp_phone: whatsappLocal1 ? toEgE164Digits(whatsappLocal1) : null,
        address_text: addressText || null,
        maps_url: mapsUrl || null,
        lat: lat,
        lng: lng,
        working_hours_json: workingHours,
        primary_specialty_id: selectedSpecialtyId || null,
        governorate_ar: selectedGov || null,
        locality_level2_ar: selectedLevel2 || null,
        locality_level2_type: selectedLevel2Type || null,
        locality_level3_ar: (selectedLevel2Type === "MARKAZ" && finalVillage) ? finalVillage : null,
      } as any)
      .eq("id", clinicId);
    setSaving(false);
    if (error) {
      toast.error("فشل الحفظ: " + error.message);
    } else {
      setSaved(true);
      toast.success("تم الحفظ بنجاح!");
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background">جاري التحميل...</div>;
  if (!clinicId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">لا توجد عيادة. يرجى إعداد عيادة أولاً.</p>
      </div>
    );
  }

  const typeLabel = (t: string) => t === "MARKAZ" ? "مركز" : t === "CITY" ? "مدينة" : "حي";

  return (
    <div className="min-h-screen bg-background">
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

      <main className="container mx-auto p-4 max-w-2xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">بيانات العيادة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>اسم العيادة (إنجليزي)</Label>
              <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} dir="ltr" placeholder="e.g. Cairo Heart Clinic" />
              {errors.clinicName && <p className="text-sm text-destructive">{errors.clinicName}</p>}
            </div>
            <div className="space-y-2">
              <Label>اسم العيادة (عربي)</Label>
              <Input value={clinicNameAr} onChange={(e) => setClinicNameAr(e.target.value)} dir="rtl" placeholder="مثال: عيادة القلب" />
              {errors.clinicNameAr && <p className="text-sm text-destructive">{errors.clinicNameAr}</p>}
            </div>
            <EgyptPhoneInput
              label="رقم واتساب ١"
              value10={whatsappLocal1}
              onChange10={setWhatsappLocal1}
              required
              error={errors.whatsappLocal1}
            />
            <EgyptPhoneInput
              label="رقم واتساب ٢ (اختياري)"
              value10={whatsappLocal2}
              onChange10={setWhatsappLocal2}
              error={errors.whatsappLocal2}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">التخصص</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedSpecialtyId} onValueChange={setSelectedSpecialtyId}>
              <SelectTrigger dir="rtl"><SelectValue placeholder="اختر التخصص" /></SelectTrigger>
              <SelectContent dir="rtl">
                {specialties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.specialty_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.specialty && <p className="text-sm text-destructive mt-1">{errors.specialty}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">الموقع</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>المحافظة</Label>
              <Select value={selectedGov} onValueChange={handleGovChange}>
                <SelectTrigger dir="rtl"><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                <SelectContent dir="rtl">
                  {governorates.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gov && <p className="text-sm text-destructive">{errors.gov}</p>}
            </div>

            {selectedGov && (
              <div className="space-y-2">
                <Label>المدينة / المركز / الحي</Label>
                <Select
                  value={selectedLevel2 ? `${selectedLevel2}|${selectedLevel2Type}` : ""}
                  onValueChange={handleLevel2Change}
                >
                  <SelectTrigger dir="rtl"><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {level2Options.map((opt) => (
                      <SelectItem key={`${opt.level2_ar}|${opt.level2_type}`} value={`${opt.level2_ar}|${opt.level2_type}`}>
                        <span className="flex items-center gap-2">
                          {opt.level2_ar}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {typeLabel(opt.level2_type)}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.level2 && <p className="text-sm text-destructive">{errors.level2}</p>}
              </div>
            )}

            {selectedLevel2 && selectedLevel2Type === "MARKAZ" && (
              <div className="space-y-2">
                <Label>القرية (اختياري)</Label>
                {villageOptions.length > 0 ? (
                  <Select value={showVillageOther ? "__other__" : selectedVillage} onValueChange={handleVillageChange}>
                    <SelectTrigger dir="rtl"><SelectValue placeholder="اختر القرية (اختياري)" /></SelectTrigger>
                    <SelectContent dir="rtl">
                      {villageOptions.map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                      <SelectItem value="__other__">أخرى / غير مدرجة</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">لا توجد قرى. أدخل يدوياً:</p>
                )}
                {(showVillageOther || villageOptions.length === 0) && (
                  <Input
                    value={villageOther}
                    onChange={(e) => setVillageOther(e.target.value)}
                    placeholder="أدخل اسم القرية"
                    dir="rtl"
                    className="mt-2"
                  />
                )}
                {errors.villageOther && <p className="text-sm text-destructive">{errors.villageOther}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label>العنوان التفصيلي</Label>
              <Textarea value={addressText} onChange={(e) => setAddressText(e.target.value)} dir="rtl" rows={2} placeholder="الشارع، المبنى، الدور..." />
              {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={handleGetLocation} disabled={geoLoading}>
                  <MapPin className="ml-2 h-4 w-4" />
                  {geoLoading ? "جاري تحديد الموقع..." : "استخدم موقعي الحالي"}
                </Button>
                {lat !== null && lng !== null && (
                  <span className="text-sm text-muted-foreground">
                    تم تحديد الموقع ({lat.toFixed(4)}, {lng.toFixed(4)})
                  </span>
                )}
              </div>
              {lat !== null && lng !== null && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <iframe
                    title="موقع العيادة"
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
                  />
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    يمكنك الضغط على "استخدم موقعي الحالي" لتحديث الموقع
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">ساعات العمل</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const firstEnabled = DAYS.find((d) => workingHours[d.key]);
                  if (!firstEnabled) { toast.info("فعّل يوم واحد على الأقل أولاً"); return; }
                  const tpl = workingHours[firstEnabled.key]!;
                  setWorkingHours((prev) => {
                    const next = { ...prev };
                    DAYS.forEach((d) => { next[d.key] = { open: tpl.open, close: tpl.close }; });
                    return next;
                  });
                  toast.success(`تم تطبيق ساعات ${firstEnabled.label} على كل الأيام`);
                }}
              >
                <CopyCheck className="ml-1.5 h-3.5 w-3.5" />تطبيق على الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((day, idx) => {
              const hours = workingHours[day.key];
              const enabled = hours !== null && hours !== undefined;
              return (
                <div key={day.key} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-24 text-sm">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => toggleDay(day.key, e.target.checked)}
                      className="rounded"
                    />
                    {day.label}
                  </label>
                  {enabled && (
                    <div className="flex items-center gap-2">
                      <Input type="time" value={hours?.open || "09:00"} onChange={(e) => updateWorkingHour(day.key, "open", e.target.value)} className="w-28" />
                      <span className="text-muted-foreground text-sm">←</span>
                      <Input type="time" value={hours?.close || "17:00"} onChange={(e) => updateWorkingHour(day.key, "close", e.target.value)} className="w-28" />
                      {idx < DAYS.length - 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => {
                            const nextDay = DAYS[idx + 1];
                            setWorkingHours((prev) => ({
                              ...prev,
                              [nextDay.key]: { open: hours!.open, close: hours!.close },
                            }));
                            toast.success(`تم النسخ إلى ${nextDay.label}`);
                          }}
                        >
                          <Copy className="ml-1 h-3 w-3" />← {DAYS[idx + 1].label}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} className="min-w-32">
            {saving ? "جاري الحفظ..." : saved ? (
              <><Check className="ml-2 h-4 w-4" />تم الحفظ</>
            ) : (
              <><Save className="ml-2 h-4 w-4" />حفظ</>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ClinicProfile;
