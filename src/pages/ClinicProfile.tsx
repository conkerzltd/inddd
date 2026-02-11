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
import { ArrowLeft, Save, Check, MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import logoSymbol from "@/assets/logo-symbol.png";

const DAYS = [
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
];

type WorkingHours = Record<string, { open: string; close: string } | null>;

function toE164(local: string | null | undefined): string | null {
  if (!local) return null;
  if (local.startsWith("0")) return "20" + local.slice(1);
  return "20" + local;
}

function stripNonDigits(val: string): string {
  return val.replace(/\D/g, "");
}

const ClinicProfile = () => {
  const { clinicId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Clinic fields
  const [clinicName, setClinicName] = useState("");
  const [clinicNameAr, setClinicNameAr] = useState("");
  const [whatsappLocal1, setWhatsappLocal1] = useState("");
  const [whatsappLocal2, setWhatsappLocal2] = useState("");
  const [addressText, setAddressText] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
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

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Geolocation
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
        setWhatsappLocal1((data as any).whatsapp_local_1 || "");
        setWhatsappLocal2((data as any).whatsapp_local_2 || "");
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
          // If no villages found, auto-show manual input
          if (villages.length === 0) {
            setShowVillageOther(true);
          }
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
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGeoLoading(false);
        toast.success("Location captured!");
      },
      (err) => {
        setGeoLoading(false);
        toast.error("Failed to get location: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!clinicName.trim()) errs.clinicName = "Clinic Name (English) is required";
    if (!clinicNameAr.trim()) errs.clinicNameAr = "Clinic Name (Arabic) is required";
    if (!whatsappLocal1 || !/^01\d{9}$/.test(whatsappLocal1)) errs.whatsappLocal1 = "Must be 11 digits starting with 01";
    if (whatsappLocal2 && !/^01\d{9}$/.test(whatsappLocal2)) errs.whatsappLocal2 = "Must be 11 digits starting with 01";
    if (!selectedSpecialtyId) errs.specialty = "Specialty is required";
    if (!selectedGov) errs.gov = "Governorate is required";
    if (!selectedLevel2) errs.level2 = "District / City / Markaz is required";
    if (!addressText.trim()) errs.address = "Detailed address is required";
    if (selectedLevel2Type === "MARKAZ" && showVillageOther && !villageOther.trim()) {
      errs.villageOther = "Please enter the village name";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!clinicId) return;
    if (!validate()) {
      toast.error("Please fix the errors before saving");
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
        whatsapp_local_1: whatsappLocal1 || null,
        whatsapp_e164_1: toE164(whatsappLocal1),
        whatsapp_local_2: whatsappLocal2 || null,
        whatsapp_e164_2: toE164(whatsappLocal2),
        clinic_whatsapp_phone: toE164(whatsappLocal1),
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
      toast.error("Save failed: " + error.message);
    } else {
      setSaved(true);
      toast.success("Saved successfully!");
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

  const typeLabel = (t: string) => t === "MARKAZ" ? "Markaz" : t === "CITY" ? "City" : "District";

  return (
    <div className="min-h-screen bg-background">
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
        {/* Clinic Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Clinic Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Clinic Name (English)</Label>
              <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} dir="ltr" placeholder="e.g. Cairo Heart Clinic" />
              {errors.clinicName && <p className="text-sm text-destructive">{errors.clinicName}</p>}
            </div>
            <div className="space-y-2">
              <Label>Clinic Name (Arabic)</Label>
              <Input value={clinicNameAr} onChange={(e) => setClinicNameAr(e.target.value)} dir="rtl" placeholder="مثال: عيادة القلب" />
              {errors.clinicNameAr && <p className="text-sm text-destructive">{errors.clinicNameAr}</p>}
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Number 1</Label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-input bg-muted px-3 h-10 text-sm text-muted-foreground">+20</span>
                <Input
                  value={whatsappLocal1}
                  onChange={(e) => setWhatsappLocal1(stripNonDigits(e.target.value).slice(0, 11))}
                  placeholder="01XXXXXXXXX"
                  dir="ltr"
                  maxLength={11}
                  className="flex-1"
                />
              </div>
              {errors.whatsappLocal1 && <p className="text-sm text-destructive">{errors.whatsappLocal1}</p>}
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Number 2 (Optional)</Label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-input bg-muted px-3 h-10 text-sm text-muted-foreground">+20</span>
                <Input
                  value={whatsappLocal2}
                  onChange={(e) => setWhatsappLocal2(stripNonDigits(e.target.value).slice(0, 11))}
                  placeholder="01XXXXXXXXX"
                  dir="ltr"
                  maxLength={11}
                  className="flex-1"
                />
              </div>
              {errors.whatsappLocal2 && <p className="text-sm text-destructive">{errors.whatsappLocal2}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Specialty */}
        <Card>
          <CardHeader><CardTitle className="text-base">Specialty</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedSpecialtyId} onValueChange={setSelectedSpecialtyId}>
              <SelectTrigger dir="rtl"><SelectValue placeholder="Select specialty" /></SelectTrigger>
              <SelectContent dir="rtl">
                {specialties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.specialty_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.specialty && <p className="text-sm text-destructive mt-1">{errors.specialty}</p>}
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Governorate</Label>
              <Select value={selectedGov} onValueChange={handleGovChange}>
                <SelectTrigger dir="rtl"><SelectValue placeholder="Select governorate" /></SelectTrigger>
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
                <Label>District / City / Markaz</Label>
                <Select
                  value={selectedLevel2 ? `${selectedLevel2}|${selectedLevel2Type}` : ""}
                  onValueChange={handleLevel2Change}
                >
                  <SelectTrigger dir="rtl"><SelectValue placeholder="Select" /></SelectTrigger>
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

            {/* Village: only for MARKAZ */}
            {selectedLevel2 && selectedLevel2Type === "MARKAZ" && (
              <div className="space-y-2">
                <Label>Village (Optional)</Label>
                {villageOptions.length > 0 ? (
                  <Select value={showVillageOther ? "__other__" : selectedVillage} onValueChange={handleVillageChange}>
                    <SelectTrigger dir="rtl"><SelectValue placeholder="Select village (optional)" /></SelectTrigger>
                    <SelectContent dir="rtl">
                      {villageOptions.map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                      <SelectItem value="__other__">Other / Not listed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">No villages found. Enter manually below:</p>
                )}
                {(showVillageOther || villageOptions.length === 0) && (
                  <Input
                    value={villageOther}
                    onChange={(e) => setVillageOther(e.target.value)}
                    placeholder="Enter village name"
                    dir="rtl"
                    className="mt-2"
                  />
                )}
                {errors.villageOther && <p className="text-sm text-destructive">{errors.villageOther}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label>Detailed Address</Label>
              <Textarea value={addressText} onChange={(e) => setAddressText(e.target.value)} dir="rtl" rows={2} placeholder="Street, building, floor..." />
              {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
            </div>

            <div className="space-y-2">
              <Label>Google Maps Link (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." dir="ltr" className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={() => window.open("https://www.google.com/maps", "_blank")}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={handleGetLocation} disabled={geoLoading}>
                <MapPin className="mr-2 h-4 w-4" />
                {geoLoading ? "Getting location..." : "Use my current location"}
              </Button>
              {lat !== null && lng !== null && (
                <span className="text-sm text-muted-foreground">
                  Lat/Lng captured ({lat.toFixed(4)}, {lng.toFixed(4)})
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card>
          <CardHeader><CardTitle className="text-base">Working Hours</CardTitle></CardHeader>
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
                      <Input type="time" value={hours?.open || "09:00"} onChange={(e) => updateWorkingHour(day.key, "open", e.target.value)} className="w-28" />
                      <span className="text-muted-foreground text-sm">→</span>
                      <Input type="time" value={hours?.close || "17:00"} onChange={(e) => updateWorkingHour(day.key, "close", e.target.value)} className="w-28" />
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
            {saving ? "Saving..." : saved ? (
              <><Check className="mr-2 h-4 w-4" />Saved</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Save</>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ClinicProfile;
