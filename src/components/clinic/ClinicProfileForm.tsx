import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Copy, CopyCheck, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { EgyptPhoneInput } from "@/components/inputs/EgyptPhoneInput";
import { GeoDropdown, type GeoValue } from "@/components/inputs/GeoDropdown";
import { toEgE164Digits, storedToInput10 } from "@/utils/phoneEG";

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

interface ClinicProfileFormProps {
  clinicId: string;
  onSaved?: () => void;
  onDraftSave?: () => void;
  submitLabel?: string;
  showDraftSave?: boolean;
}

const EMPTY_GEO: GeoValue = { governorate_ar: "", level2_ar: "", level2_type: "", level3_ar: "" };

const ClinicProfileForm = ({ clinicId, onSaved, onDraftSave, submitLabel, showDraftSave }: ClinicProfileFormProps) => {
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
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

  // Use GeoDropdown shared component state
  const [geo, setGeo] = useState<GeoValue>({ ...EMPTY_GEO });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [geoLoading, setGeoLoading] = useState(false);

  // Load specialties
  useEffect(() => {
    supabase.from("specialties").select("id, specialty_ar").order("sort_order").then(({ data }) => {
      if (data) setSpecialties(data);
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
        setGeo({
          governorate_ar: data.governorate_ar || "",
          level2_ar: data.locality_level2_ar || "",
          level2_type: data.locality_level2_type || "",
          level3_ar: data.locality_level3_ar || "",
        });
      });
  }, [clinicId]);

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
    if (!geo.governorate_ar) errs.gov = "المحافظة مطلوبة";
    if (!geo.level2_ar) errs.level2 = "المدينة / المركز مطلوب";
    if (!addressText.trim()) errs.address = "العنوان التفصيلي مطلوب";
    const hasWorkingDay = DAYS.some((d) => workingHours[d.key]);
    if (!hasWorkingDay) errs.workingHours = "يرجى تحديد يوم عمل واحد على الأقل";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => {
    return {
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
      governorate_ar: geo.governorate_ar || null,
      locality_level2_ar: geo.level2_ar || null,
      locality_level2_type: geo.level2_type || null,
      locality_level3_ar: (geo.level2_type === "MARKAZ" && geo.level3_ar) ? geo.level3_ar : null,
    };
  };

  const handleDraftSave = async () => {
    setSavingDraft(true);
    const { error } = await supabase
      .from("clinics")
      .update(buildPayload() as any)
      .eq("id", clinicId);
    setSavingDraft(false);
    if (error) {
      toast.error("فشل الحفظ: " + error.message);
    } else {
      toast.success("تم حفظ المسودة");
      onDraftSave?.();
    }
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("يرجى تصحيح الأخطاء قبل الحفظ");
      return;
    }
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("clinics")
      .update({ ...buildPayload(), profile_complete: true } as any)
      .eq("id", clinicId);
    setSaving(false);
    if (error) {
      toast.error("فشل الحفظ: " + error.message);
    } else {
      setSaved(true);
      toast.success("تم الحفظ بنجاح!");
      onSaved?.();
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
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
          <EgyptPhoneInput label="رقم واتساب ١" value10={whatsappLocal1} onChange10={setWhatsappLocal1} required error={errors.whatsappLocal1} />
          <EgyptPhoneInput label="رقم واتساب ٢ (اختياري)" value10={whatsappLocal2} onChange10={setWhatsappLocal2} error={errors.whatsappLocal2} />
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
          {/* Reusable GeoDropdown component */}
          <GeoDropdown
            value={geo}
            onChange={setGeo}
            showVillage={true}
            errors={{
              governorate_ar: errors.gov,
              level2_ar: errors.level2,
            }}
          />

          <div className="space-y-2">
            <Label>العنوان التفصيلي</Label>
            <Textarea value={addressText} onChange={(e) => setAddressText(e.target.value)} dir="rtl" rows={2} placeholder="الشارع، المبنى، الدور..." />
            {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
          </div>

          <div className="space-y-2">
            <Label>رابط Google Maps (اختياري)</Label>
            <Input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} dir="ltr" placeholder="https://maps.google.com/..." />
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
          {errors.workingHours && <p className="text-sm text-destructive">{errors.workingHours}</p>}
          {DAYS.map((day, idx) => {
            const hours = workingHours[day.key];
            const enabled = hours !== null && hours !== undefined;
            return (
              <div key={day.key} className="flex items-center gap-3">
                <label className="flex items-center gap-2 w-24 text-sm">
                  <input type="checkbox" checked={enabled} onChange={(e) => toggleDay(day.key, e.target.checked)} className="rounded" />
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

      <div className="flex flex-wrap items-center justify-end gap-3 pb-8">
        {showDraftSave && (
          <Button type="button" variant="outline" onClick={handleDraftSave} disabled={savingDraft || saving}>
            {savingDraft ? "جاري الحفظ..." : <><Save className="ml-2 h-4 w-4" />حفظ ومتابعة لاحقاً</>}
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving || savingDraft} className="min-w-32">
          {saving ? "جاري الحفظ..." : saved ? (
            <><Check className="ml-2 h-4 w-4" />تم الحفظ</>
          ) : (
            submitLabel || <><Save className="ml-2 h-4 w-4" />حفظ</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ClinicProfileForm;
