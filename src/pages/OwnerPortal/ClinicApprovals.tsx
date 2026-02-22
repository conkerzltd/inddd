import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/i18n/useLocale";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  ArrowRight,
  CheckCircle,
  XCircle,
  Building2,
  MapPin,
  Stethoscope,
  Users,
  Clock,
  Search,
  Banknote,
  FilterX,
  CreditCard,
  Eye,
} from "lucide-react";
import ClinicDetailsDialog from "@/components/admin/ClinicDetailsDialog";

/* ── types ── */
type ClinicRow = {
  id: string;
  name_ar: string | null;
  name: string;
  serial_id: string | null;
  governorate_ar: string | null;
  locality_level2_ar: string | null;
  locality_level3_ar: string | null;
  phone: string | null;
  created_at: string;
  status: string;
  financial_status: string;
  next_billing_date: string | null;
  subscription_fee: number;
  approved_at: string | null;
  primary_specialty_id: string | null;
  marketer_id: string | null;
  specialty?: { specialty_ar: string } | null;
  marketer?: { id: string; name: string; referral_code: string } | null;
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "مفعّلة", variant: "default" },
  pending: { label: "قيد المراجعة", variant: "secondary" },
  blocked: { label: "موقوفة", variant: "destructive" },
  draft: { label: "مسودة", variant: "outline" },
};

const financialLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  trial: { label: "تجريبية", variant: "outline" },
  paid: { label: "مدفوعة", variant: "default" },
  overdue: { label: "متأخرة", variant: "destructive" },
};

const ClinicApprovals = () => {
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFinancial, setFilterFinancial] = useState<string>("all");
  const [filterGov, setFilterGov] = useState<string>("all");
  const [filterMarketer, setFilterMarketer] = useState<string>("all");

  // Dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    clinicId: string;
    clinicName: string;
    action: "approve" | "suspend";
  } | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    clinicId: string;
    clinicName: string;
    defaultAmount: number;
  } | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [detailsClinicId, setDetailsClinicId] = useState<string | null>(null);

  /* ── queries ── */
  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ["admin-clinics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("*, specialty:specialties!clinics_primary_specialty_id_fkey(specialty_ar), marketer:marketers!clinics_marketer_id_fkey(id, name, referral_code)")
        .neq("status", "draft" as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ClinicRow[];
    },
  });

  /* ── mutations ── */
  const approveClinic = useMutation({
    mutationFn: async (clinicId: string) => {
      const { data, error } = await supabase.rpc("approve_clinic", { p_clinic_id: clinicId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clinics"] });
      toast({ title: "تم تفعيل العيادة بنجاح" });
      setConfirmDialog(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const suspendClinic = useMutation({
    mutationFn: async (clinicId: string) => {
      const { data, error } = await supabase.rpc("suspend_clinic", { p_clinic_id: clinicId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clinics"] });
      toast({ title: "تم تعطيل العيادة" });
      setConfirmDialog(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const logPayment = useMutation({
    mutationFn: async ({ clinicId, amount, note }: { clinicId: string; amount?: number; note?: string }) => {
      const { data, error } = await supabase.rpc("log_clinic_payment", {
        p_clinic_id: clinicId,
        p_amount: amount || null,
        p_note: note || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clinics"] });
      toast({ title: "تم تسجيل الدفع بنجاح" });
      setPaymentDialog(null);
      setPaymentNote("");
      setPaymentAmount("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteClinic = useMutation({
    mutationFn: async (clinicId: string) => {
      const { data, error } = await supabase.rpc("delete_clinic", { p_clinic_id: clinicId } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clinics"] });
      toast({ title: "تم حذف العيادة نهائيًا" });
      setDetailsClinicId(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  /* ── computed: smart filters ── */
  const { govOptions, marketerOptions } = useMemo(() => {
    const govs = new Set<string>();
    const mkts = new Map<string, string>();
    clinics.forEach((c) => {
      if (c.governorate_ar) govs.add(c.governorate_ar);
      if (c.marketer) mkts.set(c.marketer.id, c.marketer.name);
    });
    return {
      govOptions: Array.from(govs).sort(),
      marketerOptions: Array.from(mkts.entries()).map(([id, name]) => ({ id, name })),
    };
  }, [clinics]);

  const filtered = useMemo(() => {
    return clinics.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterFinancial !== "all" && c.financial_status !== filterFinancial) return false;
      if (filterGov !== "all" && c.governorate_ar !== filterGov) return false;
      if (filterMarketer !== "all" && c.marketer?.id !== filterMarketer) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (c.name_ar || c.name || "").toLowerCase();
        const serial = (c.serial_id || "").toLowerCase();
        const phone = (c.phone || "");
        if (!name.includes(q) && !serial.includes(q) && !phone.includes(q)) return false;
      }
      return true;
    });
  }, [clinics, filterStatus, filterFinancial, filterGov, filterMarketer, search]);

  const hasFilters = filterStatus !== "all" || filterFinancial !== "all" || filterGov !== "all" || filterMarketer !== "all" || search !== "";

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterFinancial("all");
    setFilterGov("all");
    setFilterMarketer("all");
  };

  /* ── stats ── */
  const pending = clinics.filter((c) => c.status === "pending").length;
  const active = clinics.filter((c) => c.status === "active").length;
  const blocked = clinics.filter((c) => c.status === "blocked").length;
  const overdue = clinics.filter((c) => c.financial_status === "overdue").length;

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(localePath("/ad"))}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">إدارة العيادات</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-secondary-foreground">{pending}</p>
            <p className="text-xs text-muted-foreground">قيد المراجعة</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{active}</p>
            <p className="text-xs text-muted-foreground">مفعّلة</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{blocked}</p>
            <p className="text-xs text-muted-foreground">موقوفة</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{overdue}</p>
            <p className="text-xs text-muted-foreground">متأخرة الدفع</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم أو الهاتف..." className="ps-9" />
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                  <FilterX className="h-4 w-4 me-1" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="حالة الحساب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="pending">قيد المراجعة</SelectItem>
                  <SelectItem value="active">مفعّلة</SelectItem>
                  <SelectItem value="blocked">موقوفة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterFinancial} onValueChange={setFilterFinancial}>
                <SelectTrigger><SelectValue placeholder="الحالة المالية" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات المالية</SelectItem>
                  <SelectItem value="trial">تجريبية</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                  <SelectItem value="overdue">متأخرة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterGov} onValueChange={setFilterGov}>
                <SelectTrigger><SelectValue placeholder="المحافظة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المحافظات</SelectItem>
                  {govOptions.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterMarketer} onValueChange={setFilterMarketer}>
                <SelectTrigger><SelectValue placeholder="المسوق" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المسوقين</SelectItem>
                  {marketerOptions.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Table (desktop) / Cards (mobile) */}
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">جاري التحميل…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-2 text-muted-foreground">{hasFilters ? "لا توجد نتائج" : "لا توجد عيادات مسجلة بعد"}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الكود</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الموقع</TableHead>
                        <TableHead>المسوق</TableHead>
                        <TableHead>الحساب</TableHead>
                        <TableHead>المالية</TableHead>
                        <TableHead>الاستحقاق</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((c) => {
                        const st = statusLabels[c.status] || statusLabels.pending;
                        const fs = financialLabels[c.financial_status] || financialLabels.trial;
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-mono text-xs">{c.serial_id || "—"}</TableCell>
                            <TableCell className="font-semibold">
                              {c.name_ar || c.name}
                              {c.specialty && <span className="block text-xs text-muted-foreground">{c.specialty.specialty_ar}</span>}
                            </TableCell>
                            <TableCell className="text-xs">
                              {[c.governorate_ar, c.locality_level2_ar].filter(Boolean).join("، ") || "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {c.marketer ? (
                                <button
                                  onClick={() => navigate(localePath(`/ad/marketers/${c.marketer!.id}`))}
                                  className="text-primary hover:underline"
                                >
                                  {c.marketer.name}
                                </button>
                              ) : "—"}
                            </TableCell>
                            <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                            <TableCell><Badge variant={fs.variant}>{fs.label}</Badge></TableCell>
                            <TableCell className="text-xs">{formatDate(c.next_billing_date)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setDetailsClinicId(c.id)} title="عرض التفاصيل">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {c.status === "pending" && (
                                  <Button size="sm" variant="default" onClick={() => setConfirmDialog({ open: true, clinicId: c.id, clinicName: c.name_ar || c.name, action: "approve" })}>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {c.status === "active" && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => {
                                      setPaymentAmount(String(c.subscription_fee || 100));
                                      setPaymentDialog({ open: true, clinicId: c.id, clinicName: c.name_ar || c.name, defaultAmount: c.subscription_fee || 100 });
                                    }}>
                                      <CreditCard className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => setConfirmDialog({ open: true, clinicId: c.id, clinicName: c.name_ar || c.name, action: "suspend" })}>
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {c.status === "blocked" && (
                                  <Button size="sm" variant="outline" onClick={() => setConfirmDialog({ open: true, clinicId: c.id, clinicName: c.name_ar || c.name, action: "approve" })}>
                                    إعادة تفعيل
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((c) => {
                const st = statusLabels[c.status] || statusLabels.pending;
                const fs = financialLabels[c.financial_status] || financialLabels.trial;
                return (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{c.name_ar || c.name}</h3>
                          {c.serial_id && <p className="text-xs font-mono text-muted-foreground">{c.serial_id}</p>}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge variant={st.variant}>{st.label}</Badge>
                            <Badge variant={fs.variant}>{fs.label}</Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => setDetailsClinicId(c.id)}>
                            <Eye className="h-4 w-4 me-1" />تفاصيل
                          </Button>
                          {c.status === "pending" && (
                            <Button size="sm" onClick={() => setConfirmDialog({ open: true, clinicId: c.id, clinicName: c.name_ar || c.name, action: "approve" })}>
                              <CheckCircle className="h-4 w-4 me-1" />قبول
                            </Button>
                          )}
                          {c.status === "active" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => {
                                setPaymentAmount(String(c.subscription_fee || 100));
                                setPaymentDialog({ open: true, clinicId: c.id, clinicName: c.name_ar || c.name, defaultAmount: c.subscription_fee || 100 });
                              }}>
                                <CreditCard className="h-4 w-4 me-1" />دفع
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setConfirmDialog({ open: true, clinicId: c.id, clinicName: c.name_ar || c.name, action: "suspend" })}>
                                <XCircle className="h-4 w-4 me-1" />تعطيل
                              </Button>
                            </>
                          )}
                          {c.status === "blocked" && (
                            <Button size="sm" variant="outline" onClick={() => setConfirmDialog({ open: true, clinicId: c.id, clinicName: c.name_ar || c.name, action: "approve" })}>
                              إعادة تفعيل
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-1.5 text-sm text-muted-foreground">
                        {c.specialty && (
                          <div className="flex items-center gap-2"><Stethoscope className="h-3.5 w-3.5 shrink-0" /><span>{c.specialty.specialty_ar}</span></div>
                        )}
                        {c.governorate_ar && (
                          <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /><span>{[c.governorate_ar, c.locality_level2_ar].filter(Boolean).join("، ")}</span></div>
                        )}
                        {c.marketer && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            <button onClick={() => navigate(localePath(`/ad/marketers/${c.marketer!.id}`))} className="text-primary hover:underline text-xs">{c.marketer.name}</button>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs">الاستحقاق: {formatDate(c.next_billing_date)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Approve/Suspend Dialog */}
      <Dialog open={!!confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog?.action === "approve" ? "تأكيد التفعيل" : "تأكيد التعطيل"}</DialogTitle>
            <DialogDescription>
              {confirmDialog?.action === "approve"
                ? `هل تريد تفعيل عيادة "${confirmDialog?.clinicName}"؟ سيتم بدء فترة تجريبية 30 يوم وإنشاء عمولة معلقة للمسوق.`
                : `هل تريد تعطيل عيادة "${confirmDialog?.clinicName}"؟`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>إلغاء</Button>
            <Button
              variant={confirmDialog?.action === "approve" ? "default" : "destructive"}
              disabled={approveClinic.isPending || suspendClinic.isPending}
              onClick={() => {
                if (!confirmDialog) return;
                if (confirmDialog.action === "approve") approveClinic.mutate(confirmDialog.clinicId);
                else suspendClinic.mutate(confirmDialog.clinicId);
              }}
            >
              {(approveClinic.isPending || suspendClinic.isPending)
                ? "جاري التحديث…"
                : confirmDialog?.action === "approve" ? "تأكيد التفعيل" : "تأكيد التعطيل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog?.open} onOpenChange={(open) => !open && setPaymentDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تسجيل دفع الاشتراك</DialogTitle>
            <DialogDescription>عيادة: {paymentDialog?.clinicName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>المبلغ (ج.م)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="ملاحظات اختيارية…" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>إلغاء</Button>
            <Button
              disabled={logPayment.isPending}
              onClick={() => {
                if (!paymentDialog) return;
                logPayment.mutate({
                  clinicId: paymentDialog.clinicId,
                  amount: paymentAmount ? Number(paymentAmount) : undefined,
                  note: paymentNote || undefined,
                });
              }}
            >
              {logPayment.isPending ? "جاري التسجيل…" : "تأكيد الدفع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clinic Details Dialog */}
      <ClinicDetailsDialog
        clinicId={detailsClinicId}
        open={!!detailsClinicId}
        onOpenChange={(open) => { if (!open) setDetailsClinicId(null); }}
        showApproval
        showDelete
        onApprove={(id) => {
          approveClinic.mutate(id);
          setDetailsClinicId(null);
        }}
        onSuspend={(id) => {
          suspendClinic.mutate(id);
          setDetailsClinicId(null);
        }}
        onDelete={(id) => deleteClinic.mutate(id)}
        approving={approveClinic.isPending}
        suspending={suspendClinic.isPending}
        deleting={deleteClinic.isPending}
      />
    </div>
  );
};

export default ClinicApprovals;
