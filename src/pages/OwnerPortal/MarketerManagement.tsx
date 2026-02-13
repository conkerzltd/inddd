import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/i18n/useLocale";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  ArrowRight,
  Plus,
  Phone,
  MapPin,
  Copy,
  Users,
  Search,
  Trash2,
} from "lucide-react";
import { EgyptPhoneInput } from "@/components/inputs/EgyptPhoneInput";
import { GeoDropdown, type GeoValue } from "@/components/inputs/GeoDropdown";
import { storedToInput10, toEgE164Digits, isValidEg10 } from "@/utils/phoneEG";

type Marketer = {
  id: string;
  name: string;
  primary_phone: string;
  whatsapp_link: string | null;
  secondary_phone: string | null;
  governorate_ar: string | null;
  city_ar: string | null;
  detailed_address: string | null;
  target_areas: string[] | null;
  referral_code: string;
  status: "pending" | "active" | "blocked";
  created_at: string;
};

type TargetArea = {
  id?: string;
  governorate_ar: string;
  level2_ar: string;
  level2_type: string;
};

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "مفعّل", variant: "default" },
  pending: { label: "قيد المراجعة", variant: "secondary" },
  blocked: { label: "محظور", variant: "destructive" },
};

const EMPTY_GEO: GeoValue = {
  governorate_ar: "",
  level2_ar: "",
  level2_type: "",
  level3_ar: "",
};

const MarketerManagement = () => {
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [personalGeo, setPersonalGeo] = useState<GeoValue>({ ...EMPTY_GEO });
  const [detailedAddress, setDetailedAddress] = useState("");
  const [targetAreas, setTargetAreas] = useState<TargetArea[]>([
    { governorate_ar: "", level2_ar: "", level2_type: "" },
  ]);

  const resetForm = () => {
    setName("");
    setPrimaryPhone("");
    setWhatsappPhone("");
    setSecondaryPhone("");
    setPersonalGeo({ ...EMPTY_GEO });
    setDetailedAddress("");
    setTargetAreas([{ governorate_ar: "", level2_ar: "", level2_type: "" }]);
  };

  // Fetch marketers with target areas
  const { data: marketers = [], isLoading } = useQuery({
    queryKey: ["marketers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Marketer[];
    },
  });

  // Add marketer mutation
  const addMarketer = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("الاسم مطلوب");
      if (!isValidEg10(primaryPhone)) throw new Error("رقم الهاتف الأساسي غير صحيح");

      const { data, error } = await supabase
        .from("marketers")
        .insert({
          name: name.trim(),
          primary_phone: "0" + primaryPhone,
          whatsapp_link: whatsappPhone
            ? `https://wa.me/20${whatsappPhone}`
            : null,
          secondary_phone: secondaryPhone ? "0" + secondaryPhone : null,
          governorate_ar: personalGeo.governorate_ar || null,
          city_ar: personalGeo.level2_ar || null,
          detailed_address: detailedAddress.trim() || null,
          target_areas: null, // We use the normalized table now
          referral_code: "", // trigger auto-generates
        })
        .select("id")
        .single();
      if (error) throw error;

      // Insert target areas
      const validAreas = targetAreas.filter((a) => a.governorate_ar);
      if (validAreas.length > 0 && data) {
        const { error: taError } = await supabase
          .from("marketer_target_areas")
          .insert(
            validAreas.map((a) => ({
              marketer_id: data.id,
              governorate_ar: a.governorate_ar,
              level2_ar: a.level2_ar || null,
              level2_type: a.level2_type || null,
            }))
          );
        if (taError) throw taError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketers"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "تم إضافة المسوق بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  // Toggle status mutation
  const toggleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from("marketers")
        .update({ status: newStatus as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketers"] });
      toast({ title: "تم تحديث الحالة" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMarketer.mutate();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "تم نسخ الكود", description: code });
  };

  const addTargetArea = () => {
    setTargetAreas((prev) => [
      ...prev,
      { governorate_ar: "", level2_ar: "", level2_type: "" },
    ]);
  };

  const removeTargetArea = (idx: number) => {
    setTargetAreas((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTargetArea = (idx: number, geo: GeoValue) => {
    setTargetAreas((prev) =>
      prev.map((a, i) =>
        i === idx
          ? {
              governorate_ar: geo.governorate_ar,
              level2_ar: geo.level2_ar,
              level2_type: geo.level2_type,
            }
          : a
      )
    );
  };

  const filtered = marketers.filter(
    (m) =>
      m.name.includes(search) ||
      m.referral_code.toLowerCase().includes(search.toLowerCase()) ||
      m.primary_phone.includes(search)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(localePath("/ad"))}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">إدارة المسوقين</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 me-1" />
                إضافة مسوق
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إضافة مسوق جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {/* Name */}
                <div className="space-y-2">
                  <Label>الاسم *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اسم المسوق"
                    required
                  />
                </div>

                {/* Phone inputs using reusable component */}
                <EgyptPhoneInput
                  label="رقم الهاتف الأساسي *"
                  value10={primaryPhone}
                  onChange10={setPrimaryPhone}
                  required
                />

                <EgyptPhoneInput
                  label="رقم واتساب"
                  value10={whatsappPhone}
                  onChange10={setWhatsappPhone}
                  helperText="سيتم إنشاء رابط واتساب تلقائياً"
                />

                <EgyptPhoneInput
                  label="رقم هاتف ثانوي"
                  value10={secondaryPhone}
                  onChange10={setSecondaryPhone}
                />

                {/* Personal Address - Geo Dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">العنوان الشخصي</Label>
                  <GeoDropdown
                    value={personalGeo}
                    onChange={setPersonalGeo}
                    showVillage={false}
                  />
                  <Input
                    value={detailedAddress}
                    onChange={(e) => setDetailedAddress(e.target.value)}
                    placeholder="العنوان التفصيلي (شارع، مبنى...)"
                  />
                </div>

                {/* Dynamic Target Areas */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    المناطق المستهدفة
                  </Label>
                  {targetAreas.map((area, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-lg border border-border p-3 space-y-2"
                    >
                      {targetAreas.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 start-1 h-7 w-7 text-destructive"
                          onClick={() => removeTargetArea(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        منطقة {idx + 1}
                      </p>
                      <GeoDropdown
                        value={{
                          governorate_ar: area.governorate_ar,
                          level2_ar: area.level2_ar,
                          level2_type: area.level2_type,
                          level3_ar: "",
                        }}
                        onChange={(geo) => updateTargetArea(idx, geo)}
                        showVillage={false}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTargetArea}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 me-1" />
                    إضافة منطقة جديدة
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={addMarketer.isPending}
                >
                  {addMarketer.isPending ? "جاري الإضافة…" : "إضافة المسوق"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الكود أو الهاتف..."
            className="ps-9"
          />
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {marketers.length}
              </p>
              <p className="text-xs text-muted-foreground">الإجمالي</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {marketers.filter((m) => m.status === "active").length}
              </p>
              <p className="text-xs text-muted-foreground">مفعّل</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-destructive">
                {marketers.filter((m) => m.status === "blocked").length}
              </p>
              <p className="text-xs text-muted-foreground">محظور</p>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">
            جاري التحميل…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-2 text-muted-foreground">
              {search ? "لا توجد نتائج" : "لم يتم إضافة مسوقين بعد"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((m) => {
              const st = statusMap[m.status] || statusMap.pending;
              return (
                <Card key={m.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3
                          className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors"
                          onClick={() => navigate(localePath(`/ad/marketers/${m.id}`))}
                        >
                          {m.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => copyCode(m.referral_code)}
                            className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-0.5 rounded hover:bg-muted/80 transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                            {m.referral_code}
                          </button>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {m.status === "active" ? "مفعّل" : "معطّل"}
                        </span>
                        <Switch
                          checked={m.status === "active"}
                          onCheckedChange={(checked) =>
                            toggleStatus.mutate({
                              id: m.id,
                              newStatus: checked ? "active" : "blocked",
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span dir="ltr">{m.primary_phone}</span>
                        {m.secondary_phone && (
                          <span
                            dir="ltr"
                            className="text-muted-foreground/60"
                          >
                            | {m.secondary_phone}
                          </span>
                        )}
                      </div>
                      {(m.governorate_ar || m.city_ar) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {[m.governorate_ar, m.city_ar]
                              .filter(Boolean)
                              .join("، ")}
                          </span>
                        </div>
                      )}
                      {m.target_areas && m.target_areas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.target_areas.map((area, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs"
                            >
                              {area}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MarketerManagement;
