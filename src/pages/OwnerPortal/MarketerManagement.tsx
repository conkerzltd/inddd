import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/i18n/useLocale";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

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

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "مفعّل", variant: "default" },
  pending: { label: "قيد المراجعة", variant: "secondary" },
  blocked: { label: "محظور", variant: "destructive" },
};

const emptyForm = {
  name: "",
  primary_phone: "",
  whatsapp_link: "",
  secondary_phone: "",
  governorate_ar: "",
  city_ar: "",
  detailed_address: "",
  target_areas: "",
};

const MarketerManagement = () => {
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Fetch marketers
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
      const { error } = await supabase.from("marketers").insert({
        name: form.name.trim(),
        primary_phone: form.primary_phone.trim(),
        whatsapp_link: form.whatsapp_link.trim() || null,
        secondary_phone: form.secondary_phone.trim() || null,
        governorate_ar: form.governorate_ar.trim() || null,
        city_ar: form.city_ar.trim() || null,
        detailed_address: form.detailed_address.trim() || null,
        target_areas: form.target_areas
          ? form.target_areas.split("،").map((a) => a.trim()).filter(Boolean)
          : null,
        referral_code: "", // trigger will auto-generate
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketers"] });
      setDialogOpen(false);
      setForm(emptyForm);
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
    if (!form.name.trim() || !form.primary_phone.trim()) return;
    addMarketer.mutate();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "تم نسخ الكود", description: code });
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
              onClick={() => navigate(localePath("/owner-portal"))}
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
                <div className="space-y-2">
                  <Label>الاسم *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="اسم المسوق"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف الأساسي *</Label>
                  <Input
                    value={form.primary_phone}
                    onChange={(e) => setForm({ ...form, primary_phone: e.target.value })}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>رابط واتساب</Label>
                  <Input
                    value={form.whatsapp_link}
                    onChange={(e) => setForm({ ...form, whatsapp_link: e.target.value })}
                    placeholder="wa.me/201xxxxxxxxx"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم هاتف ثانوي</Label>
                  <Input
                    value={form.secondary_phone}
                    onChange={(e) => setForm({ ...form, secondary_phone: e.target.value })}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>المحافظة</Label>
                    <Input
                      value={form.governorate_ar}
                      onChange={(e) => setForm({ ...form, governorate_ar: e.target.value })}
                      placeholder="القاهرة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المدينة</Label>
                    <Input
                      value={form.city_ar}
                      onChange={(e) => setForm({ ...form, city_ar: e.target.value })}
                      placeholder="مدينة نصر"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>العنوان التفصيلي</Label>
                  <Input
                    value={form.detailed_address}
                    onChange={(e) => setForm({ ...form, detailed_address: e.target.value })}
                    placeholder="شارع، مبنى..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>المناطق المستهدفة (مفصولة بفاصلة ،)</Label>
                  <Input
                    value={form.target_areas}
                    onChange={(e) => setForm({ ...form, target_areas: e.target.value })}
                    placeholder="مدينة نصر، الشروق، العبور"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={addMarketer.isPending}>
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
              <p className="text-2xl font-bold text-foreground">{marketers.length}</p>
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
          <div className="text-center py-10 text-muted-foreground">جاري التحميل…</div>
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
                    {/* Top row: name + status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{m.name}</h3>
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
                          <span dir="ltr" className="text-muted-foreground/60">
                            | {m.secondary_phone}
                          </span>
                        )}
                      </div>
                      {(m.governorate_ar || m.city_ar) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {[m.governorate_ar, m.city_ar].filter(Boolean).join("، ")}
                          </span>
                        </div>
                      )}
                      {m.target_areas && m.target_areas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.target_areas.map((area, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
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
