import { useState, useEffect, useCallback } from "react";
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
import { ArrowLeft, Save, Check } from "lucide-react";
import { toast } from "sonner";
import logoSymbol from "@/assets/logo-symbol.png";

const DAYS = [
  { key: "sat", label: "السبت" },
  { key: "sun", label: "الأحد" },
  { key: "mon", label: "الإثنين" },
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

  // Clinic fields
  const [clinicName, setClinicName] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [addressText, setAddressText] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});

  // Specialty
  const [specialties, setSpecialties] = useState<{ id: string; specialty_ar: string }[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>("");

  // Location cascade
  const [governorates, setGovernorates] = useState<string[]>([]);
  const [selectedGov, setSelectedGov] = useState("");
  const [level2Options, setLevel2Options] = useState<{ level2_ar: string; level2_type: string }[]>([]);
  const [selectedLevel2, setSelectedLevel2] = useState("");
  const [selectedLevel2Type, setSelectedLevel2Type] = useState("");
  const [villageOptions, setVillageOptions] = useState<string[]>([]);
  const [selectedVillage, setSelectedVillage] = useState("");
  const [villageOther, setVillageOther] = useState("");
  const [showVillageOther, setShowVillageOther] = useState(false);

  // Load specialties + governorates
  useEffect(() => {
    supabase
      .from("specialties")
      .select("id, specialty_ar")
      .order("sort_order")
      .then(({ data }) => {
        if (data) setSpecialties(data);
      });

    supabase
      .from("geo_localities")
      .select("governorate_ar")
      .then(({ data }) => {
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
      .select("name, clinic_whatsapp_phone, address_text, maps_url, working_hours_json, primary_specialty_id, governorate_ar, locality_level2_ar, locality_level2_type, locality_level3_ar")
      .eq("id", clinicId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setClinicName(data.name || "");
        setWhatsappPhone(data.clinic_whatsapp_phone || "");
        setAddressText(data.address_text || "");
        setMapsUrl(data.maps_url || "");
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
    if (!selectedGov) {
      setLevel2Options([]);
      return;
    }
    supabase
      .from("geo_localities")
      .select("level2_ar, level2_type")
      .eq("governorate_ar", selectedGov)
      .is("level3_ar", null)
      .then(({ data }) => {
        if (data) {
          // Deduplicate
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
          const villages = data
            .map((r) => r.level3_ar!)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "ar"));
          setVillageOptions(villages);
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
    // val is "level2_ar|level2_type"
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

  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true);
    setSaved(false);

    const finalVillage = showVillageOther ? villageOther : selectedVillage;

    const { error } = await supabase
      .from("clinics")
      .update({
        name: clinicName,
        clinic_whatsapp_phone: whatsappPhone || null,
        address_text: addressText || null,
        maps_url: mapsUrl || null,
        working_hours_json: workingHours,
        primary_specialty_id: selectedSpecialtyId || null,
        governorate_ar: selectedGov || null,
        locality_level2_ar: selectedLevel2 || null,
        locality_level2_type: selectedLevel2Type || null,
        locality_level3_ar: (selectedLevel2Type === "MARKAZ" && finalVillage) ? finalVillage : null,
      })
      .eq("id", clinicId);

    setSaving(false);
    if (error) {
      toast.error("فشل الحفظ: " + error.message);
    } else {
      setSaved(true);
      toast.success("تم الحفظ بنجاح");
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  if (!clinicId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No clinic found. Please set up a clinic first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSymbol} alt="inddd" className="h-8 w-8" />
            <h1 className="text-lg font-bold text-foreground">Clinic Profile</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/console")}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Console
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-2xl space-y-6">
        {/* Clinic Basics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">بيانات العيادة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>اسم العيادة</Label>
              <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label>رقم واتساب العيادة</Label>
              <Input value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} placeholder="201XXXXXXXXX" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Textarea value={addressText} onChange={(e) => setAddressText(e.target.value)} dir="rtl" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>رابط خرائط Google</Label>
              <Input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." dir="ltr" />
            </div>
          </CardContent>
        </Card>

        {/* Specialty */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">التخصص</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSpecialtyId} onValueChange={setSelectedSpecialtyId}>
              <SelectTrigger dir="rtl">
                <SelectValue placeholder="اختر التخصص" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {specialties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.specialty_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Location Cascade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الموقع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Governorate */}
            <div className="space-y-2">
              <Label>المحافظة</Label>
              <Select value={selectedGov} onValueChange={handleGovChange}>
                <SelectTrigger dir="rtl">
                  <SelectValue placeholder="اختر المحافظة" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {governorates.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level 2 */}
            {selectedGov && (
              <div className="space-y-2">
                <Label>المركز / المدينة / الحي</Label>
                <Select
                  value={selectedLevel2 ? `${selectedLevel2}|${selectedLevel2Type}` : ""}
                  onValueChange={handleLevel2Change}
                >
                  <SelectTrigger dir="rtl">
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {level2Options.map((opt) => (
                      <SelectItem key={`${opt.level2_ar}|${opt.level2_type}`} value={`${opt.level2_ar}|${opt.level2_type}`}>
                        <span className="flex items-center gap-2">
                          {opt.level2_ar}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {opt.level2_type === "MARKAZ" ? "مركز" : opt.level2_type === "CITY" ? "مدينة" : "حي"}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Village (only for MARKAZ) */}
            {selectedLevel2 && selectedLevel2Type === "MARKAZ" && villageOptions.length > 0 && (
              <div className="space-y-2">
                <Label>القرية</Label>
                <Select value={showVillageOther ? "__other__" : selectedVillage} onValueChange={handleVillageChange}>
                  <SelectTrigger dir="rtl">
                    <SelectValue placeholder="اختر القرية (اختياري)" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {villageOptions.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                    <SelectItem value="__other__">أخرى / غير مدرجة</SelectItem>
                  </SelectContent>
                </Select>
                {showVillageOther && (
                  <Input
                    value={villageOther}
                    onChange={(e) => setVillageOther(e.target.value)}
                    placeholder="اكتب اسم القرية"
                    dir="rtl"
                    className="mt-2"
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مواعيد العمل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((day) => {
              const hours = workingHours[day.key];
              const enabled = hours !== null && hours !== undefined;
              return (
                <div key={day.key} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-20 text-sm">
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
                      <Input
                        type="time"
                        value={hours?.open || "09:00"}
                        onChange={(e) => updateWorkingHour(day.key, "open", e.target.value)}
                        className="w-28"
                      />
                      <span className="text-muted-foreground text-sm">→</span>
                      <Input
                        type="time"
                        value={hours?.close || "17:00"}
                        onChange={(e) => updateWorkingHour(day.key, "close", e.target.value)}
                        className="w-28"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} className="min-w-32">
            {saving ? "جاري الحفظ..." : saved ? (
              <><Check className="mr-2 h-4 w-4" />تم الحفظ</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />حفظ</>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ClinicProfile;
