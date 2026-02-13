import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/i18n/useLocale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Shield,
  Phone,
  MapPin,
  CalendarIcon,
  Plus,
  Building2,
  Users,
  Banknote,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Target,
  Calculator,
  Pencil,
} from "lucide-react";

/* ── helpers ── */
const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "مفعّل", variant: "default" },
  pending: { label: "قيد المراجعة", variant: "secondary" },
  blocked: { label: "محظور", variant: "destructive" },
  draft: { label: "مسودة", variant: "outline" },
};

const financialLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  trial: { label: "تجريبية", variant: "outline" },
  paid: { label: "مدفوعة", variant: "default" },
  overdue: { label: "متأخرة", variant: "destructive" },
};

const attendanceLabels: Record<string, string> = {
  present: "حضور",
  absent: "غياب",
  sick_leave: "إجازة مرضية",
};

const txTypeLabels: Record<string, string> = {
  commission: "عمولة",
  bonus: "مكافأة",
  salary: "راتب",
  deduction: "خصم",
  penalty: "غرامة",
  payout: "دفعة",
};

const commissionStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending_trial: { label: "معلقة (تجريبي)", variant: "outline" },
  earned: { label: "مستحقة", variant: "default" },
  paid: { label: "مدفوعة", variant: "secondary" },
};

const MarketerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Month/Year filter
  const [filterDate, setFilterDate] = useState(() => new Date());
  const monthStart = startOfMonth(filterDate);
  const monthEnd = endOfMonth(filterDate);
  const monthLabel = format(filterDate, "MMMM yyyy", { locale: ar });

  const prevMonth = () => setFilterDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setFilterDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Dialogs
  const [attDialogOpen, setAttDialogOpen] = useState(false);
  const [attDate, setAttDate] = useState<Date | undefined>(undefined);
  const [attStatus, setAttStatus] = useState<string>("present");
  const [attNotes, setAttNotes] = useState("");

  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [txType, setTxType] = useState<string>("payout");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txDate, setTxDate] = useState<Date | undefined>(new Date());

  // HR Settings dialog
  const [hrDialogOpen, setHrDialogOpen] = useState(false);
  const [hrBaseSalary, setHrBaseSalary] = useState("");
  const [hrWorkingDays, setHrWorkingDays] = useState("");
  const [hrPenaltyMultiplier, setHrPenaltyMultiplier] = useState("");
  const [hrTargetClinics, setHrTargetClinics] = useState("");
  const [hrCommission, setHrCommission] = useState("");

  /* ── queries ── */
  const { data: marketer, isLoading } = useQuery({
    queryKey: ["marketer", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketers").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: targetAreas = [] } = useQuery({
    queryKey: ["marketer-target-areas", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketer_target_areas").select("*").eq("marketer_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Clinics approved in selected month (by approved_at, not created_at)
  const { data: clinicsMonth = [] } = useQuery({
    queryKey: ["marketer-clinics-month", id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, name, name_ar, serial_id, governorate_ar, locality_level2_ar, status, financial_status, approved_at, created_at")
        .eq("marketer_id", id!)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // All clinics for this marketer (for total active count)
  const { data: allClinics = [] } = useQuery({
    queryKey: ["marketer-all-clinics", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, status, approved_at")
        .eq("marketer_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["marketer-attendance", id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketer_attendance")
        .select("*")
        .eq("marketer_id", id!)
        .gte("attendance_date", format(monthStart, "yyyy-MM-dd"))
        .lte("attendance_date", format(monthEnd, "yyyy-MM-dd"))
        .order("attendance_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["marketer-ledger", id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketer_ledger")
        .select("*")
        .eq("marketer_id", id!)
        .gte("tx_date", format(monthStart, "yyyy-MM-dd"))
        .lte("tx_date", format(monthEnd, "yyyy-MM-dd"))
        .order("tx_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Commissions for this marketer (month-filtered by earned_date)
  const { data: commissions = [] } = useQuery({
    queryKey: ["marketer-commissions", id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("*, clinic:clinics!commissions_clinic_id_fkey(name_ar, name, serial_id)")
        .eq("marketer_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  /* ── mutations ── */
  const addAttendance = useMutation({
    mutationFn: async () => {
      if (!attDate) throw new Error("التاريخ مطلوب");
      const { error } = await supabase.from("marketer_attendance").upsert(
        {
          marketer_id: id!,
          attendance_date: format(attDate, "yyyy-MM-dd"),
          status: attStatus as any,
          notes: attNotes.trim() || null,
          recorded_by: user?.id || null,
        },
        { onConflict: "marketer_id,attendance_date" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketer-attendance", id] });
      setAttDialogOpen(false);
      setAttDate(undefined);
      setAttStatus("present");
      setAttNotes("");
      toast({ title: "تم تسجيل الحضور" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const addLedgerEntry = useMutation({
    mutationFn: async () => {
      if (!txAmount || isNaN(Number(txAmount))) throw new Error("المبلغ مطلوب");
      if (!txDate) throw new Error("التاريخ مطلوب");
      const { error } = await supabase.from("marketer_ledger").insert({
        marketer_id: id!,
        tx_type: txType as any,
        amount: Number(txAmount),
        description: txDesc.trim() || null,
        tx_date: format(txDate, "yyyy-MM-dd"),
        recorded_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketer-ledger", id] });
      setLedgerDialogOpen(false);
      setTxAmount("");
      setTxDesc("");
      setTxType("payout");
      toast({ title: "تم تسجيل المعاملة" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const openHrDialog = () => {
    if (!marketer) return;
    setHrBaseSalary(String(marketer.base_salary ?? 2000));
    setHrWorkingDays(String(marketer.working_days_per_month ?? 24));
    setHrPenaltyMultiplier(String(marketer.absence_penalty_multiplier ?? 1.5));
    setHrTargetClinics(String(marketer.monthly_target_clinics ?? 120));
    setHrCommission(String(marketer.commission_per_clinic ?? 100));
    setHrDialogOpen(true);
  };

  const updateHrSettings = useMutation({
    mutationFn: async () => {
      const updates: Record<string, number> = {};
      const val = (v: string) => { const n = Number(v); if (isNaN(n) || n < 0) throw new Error("قيمة غير صالحة"); return n; };
      updates.base_salary = val(hrBaseSalary);
      updates.working_days_per_month = Math.max(1, Math.round(val(hrWorkingDays)));
      updates.absence_penalty_multiplier = val(hrPenaltyMultiplier);
      updates.monthly_target_clinics = Math.max(1, Math.round(val(hrTargetClinics)));
      updates.commission_per_clinic = val(hrCommission);
      const { error } = await supabase.from("marketers").update(updates).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketer", id] });
      setHrDialogOpen(false);
      toast({ title: "تم تحديث إعدادات HR" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  /* ── payroll math engine ── */
  const payroll = useMemo(() => {
    if (!marketer) return null;

    const baseSalary = Number(marketer.base_salary) || 2000;
    const workingDays = Number(marketer.working_days_per_month) || 24;
    const penaltyMultiplier = Number(marketer.absence_penalty_multiplier) || 1.5;
    const targetClinics = Number(marketer.monthly_target_clinics) || 120;
    const commissionPerClinic = Number(marketer.commission_per_clinic) || 100;

    // Attendance
    const daysAbsent = attendance.filter((a) => a.status === "absent").length;
    const daysSick = attendance.filter((a) => a.status === "sick_leave").length;
    const daysPresent = attendance.filter((a) => a.status === "present").length;

    // Salary calculation
    const dailyRate = baseSalary / workingDays;
    const absenceDeduction = daysAbsent * (dailyRate * penaltyMultiplier);
    const netBase = Math.max(0, baseSalary - absenceDeduction);

    // Achievement
    const clinicsActivatedMonth = allClinics.filter((c) => {
      if (c.status !== "active" || !c.approved_at) return false;
      const approvedDate = new Date(c.approved_at);
      return approvedDate >= monthStart && approvedDate <= monthEnd;
    }).length;
    const achievementPct = targetClinics > 0 ? Math.min(100, (clinicsActivatedMonth / targetClinics) * 100) : 0;

    // Adjusted salary based on achievement
    const adjustedSalary = achievementPct >= 70 ? netBase : netBase * (achievementPct / 100);

    // Commissions earned this month
    const earnedCommissionsMonth = commissions.filter((c) => {
      if (c.status !== "earned" && c.status !== "paid") return false;
      if (!c.earned_date) return false;
      const d = new Date(c.earned_date);
      return d >= monthStart && d <= monthEnd;
    }).reduce((sum: number, c: any) => sum + Number(c.amount), 0);

    // Ledger-based calculations for display
    const ledgerCommissions = ledger.filter((t) => ["commission", "bonus"].includes(t.tx_type)).reduce((s, t) => s + Number(t.amount), 0);
    const ledgerDeductions = ledger.filter((t) => ["deduction", "penalty"].includes(t.tx_type)).reduce((s, t) => s + Number(t.amount), 0);
    const ledgerPaid = ledger.filter((t) => ["payout", "salary"].includes(t.tx_type)).reduce((s, t) => s + Number(t.amount), 0);

    const totalPayout = adjustedSalary + earnedCommissionsMonth;

    return {
      baseSalary,
      workingDays,
      penaltyMultiplier,
      targetClinics,
      commissionPerClinic,
      daysPresent,
      daysAbsent,
      daysSick,
      dailyRate,
      absenceDeduction,
      netBase,
      clinicsActivatedMonth,
      achievementPct,
      adjustedSalary,
      earnedCommissionsMonth,
      totalPayout,
      ledgerCommissions,
      ledgerDeductions,
      ledgerPaid,
      ledgerBalance: ledgerCommissions - ledgerDeductions - ledgerPaid,
    };
  }, [marketer, attendance, allClinics, commissions, ledger, monthStart, monthEnd]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">جاري التحميل…</p>
      </div>
    );
  }

  if (!marketer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-destructive">المسوق غير موجود</p>
      </div>
    );
  }

  const st = statusMap[marketer.status] || statusMap.pending;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(localePath("/ad/marketers"))}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground truncate">{marketer.name}</h1>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 space-y-4">
        {/* Month/Year Filter */}
        <Card>
          <CardContent className="p-3 flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
            <span className="text-base font-semibold text-foreground min-w-[140px] text-center">
              {monthLabel}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" dir="rtl">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">نظرة عامة</TabsTrigger>
            <TabsTrigger value="clinics" className="text-xs sm:text-sm">سجل العيادات</TabsTrigger>
            <TabsTrigger value="hr" className="text-xs sm:text-sm">HR</TabsTrigger>
            <TabsTrigger value="finance" className="text-xs sm:text-sm">الحسابات</TabsTrigger>
          </TabsList>

          {/* ═══ Tab 1: Overview & Payroll ═══ */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Personal info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">المعلومات الشخصية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span dir="ltr">{marketer.primary_phone}</span>
                  {marketer.secondary_phone && <span dir="ltr" className="text-muted-foreground/60">| {marketer.secondary_phone}</span>}
                </div>
                {(marketer.governorate_ar || marketer.city_ar) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{[marketer.governorate_ar, marketer.city_ar].filter(Boolean).join("، ")}</span>
                  </div>
                )}
                {marketer.detailed_address && (
                  <p className="text-muted-foreground ps-6">{marketer.detailed_address}</p>
                )}
                <p className="text-xs font-mono bg-muted px-2 py-1 rounded inline-block">{marketer.referral_code}</p>
              </CardContent>
            </Card>

            {/* Target areas */}
            {targetAreas.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">المناطق المستهدفة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {targetAreas.map((ta) => (
                      <Badge key={ta.id} variant="outline" className="text-xs">
                        {[ta.governorate_ar, ta.level2_ar].filter(Boolean).join(" — ")}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* HR Constants */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  إعدادات الراتب والعمولات
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={openHrDialog} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" />
                  تعديل
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">الراتب الأساسي:</span> <span className="font-semibold">{payroll?.baseSalary.toLocaleString("ar-EG")} ج.م</span></div>
                  <div><span className="text-muted-foreground">أيام العمل/شهر:</span> <span className="font-semibold">{payroll?.workingDays}</span></div>
                  <div><span className="text-muted-foreground">مضاعف خصم الغياب:</span> <span className="font-semibold">×{payroll?.penaltyMultiplier}</span></div>
                  <div><span className="text-muted-foreground">الهدف الشهري:</span> <span className="font-semibold">{payroll?.targetClinics} عيادة</span></div>
                  <div><span className="text-muted-foreground">العمولة/عيادة:</span> <span className="font-semibold">{payroll?.commissionPerClinic} ج.م</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Payroll Summary */}
            {payroll && (
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    كشف الراتب — {monthLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Attendance row */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-primary/5">
                      <p className="text-lg font-bold text-primary">{payroll.daysPresent}</p>
                      <p className="text-xs text-muted-foreground">حضور</p>
                    </div>
                    <div className="p-2 rounded-lg bg-destructive/5">
                      <p className="text-lg font-bold text-destructive">{payroll.daysAbsent}</p>
                      <p className="text-xs text-muted-foreground">غياب</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted">
                      <p className="text-lg font-bold text-muted-foreground">{payroll.daysSick}</p>
                      <p className="text-xs text-muted-foreground">إجازة مرضية</p>
                    </div>
                  </div>

                  {/* Achievement */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Target className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>الإنجاز: {payroll.clinicsActivatedMonth} / {payroll.targetClinics} عيادة</span>
                        <Badge variant={payroll.achievementPct >= 70 ? "default" : "secondary"}>
                          {payroll.achievementPct.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, payroll.achievementPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Salary breakdown */}
                  <div className="space-y-2 text-sm border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الراتب الأساسي</span>
                      <span>{payroll.baseSalary.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>خصم الغياب ({payroll.daysAbsent} يوم × {payroll.dailyRate.toFixed(0)} × {payroll.penaltyMultiplier})</span>
                      <span>-{payroll.absenceDeduction.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">صافي الراتب</span>
                      <span>{payroll.netBase.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    {payroll.achievementPct < 70 && (
                      <div className="flex justify-between text-destructive">
                        <span>تعديل الإنجاز ({payroll.achievementPct.toFixed(1)}% &lt; 70%)</span>
                        <span>{payroll.adjustedSalary.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    )}
                    <div className="flex justify-between text-primary">
                      <span>عمولات مستحقة هذا الشهر</span>
                      <span>+{payroll.earnedCommissionsMonth.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>إجمالي المستحق</span>
                      <span className="text-primary">{payroll.totalPayout.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ Tab 2: Clinics Roster ═══ */}
          <TabsContent value="clinics" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">العيادات المسجلة — {monthLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                {clinicsMonth.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">لا توجد عيادات مسجلة في هذا الشهر</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الكود</TableHead>
                          <TableHead>الاسم</TableHead>
                          <TableHead>الموقع</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>الحساب</TableHead>
                          <TableHead>المالية</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clinicsMonth.map((c) => {
                          const cst = statusMap[c.status] || statusMap.draft;
                          const fst = financialLabels[c.financial_status] || financialLabels.trial;
                          return (
                            <TableRow key={c.id}>
                              <TableCell className="font-mono text-xs">{c.serial_id || "—"}</TableCell>
                              <TableCell>{c.name_ar || c.name}</TableCell>
                              <TableCell className="text-xs">{[c.governorate_ar, c.locality_level2_ar].filter(Boolean).join("، ") || "—"}</TableCell>
                              <TableCell className="text-xs">{format(new Date(c.created_at), "dd/MM")}</TableCell>
                              <TableCell><Badge variant={cst.variant}>{cst.label}</Badge></TableCell>
                              <TableCell><Badge variant={fst.variant}>{fst.label}</Badge></TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ Tab 3: HR & Attendance ═══ */}
          <TabsContent value="hr" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">سجل الحضور — {monthLabel}</h3>
              <Button size="sm" onClick={() => setAttDialogOpen(true)}>
                <Plus className="h-4 w-4 me-1" />
                تسجيل حضور/غياب
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {attendance.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">لا توجد سجلات حضور لهذا الشهر</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{format(new Date(a.attendance_date + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : "secondary"}>
                              {attendanceLabels[a.status] || a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{a.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{attendance.filter((a) => a.status === "present").length}</p>
                <p className="text-xs text-muted-foreground">حضور</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{attendance.filter((a) => a.status === "absent").length}</p>
                <p className="text-xs text-muted-foreground">غياب</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{attendance.filter((a) => a.status === "sick_leave").length}</p>
                <p className="text-xs text-muted-foreground">إجازة مرضية</p>
              </CardContent></Card>
            </div>
          </TabsContent>

          {/* ═══ Tab 4: Financials & Commissions ═══ */}
          <TabsContent value="finance" className="space-y-4 mt-4">
            {/* Ledger Summary */}
            {payroll && (
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">ملخص مالي — {monthLabel}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                    <div>
                      <p className="text-lg font-bold text-primary">{payroll.ledgerCommissions.toLocaleString("ar-EG")}</p>
                      <p className="text-xs text-muted-foreground">عمولات + مكافآت</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-destructive">{payroll.ledgerDeductions.toLocaleString("ar-EG")}</p>
                      <p className="text-xs text-muted-foreground">خصومات + غرامات</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-muted-foreground">{payroll.ledgerPaid.toLocaleString("ar-EG")}</p>
                      <p className="text-xs text-muted-foreground">مدفوعات</p>
                    </div>
                    <div>
                      <p className={cn("text-lg font-bold", payroll.ledgerBalance >= 0 ? "text-primary" : "text-destructive")}>
                        {payroll.ledgerBalance.toLocaleString("ar-EG")}
                      </p>
                      <p className="text-xs text-muted-foreground">الرصيد المستحق</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Commissions from commissions table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  العمولات (نظام مكافآت العيادات)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {commissions.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground">لا توجد عمولات</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>العيادة</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>تاريخ الاستحقاق</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((c: any) => {
                        const cs = commissionStatusLabels[c.status] || commissionStatusLabels.pending_trial;
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="text-xs">{c.clinic?.name_ar || c.clinic?.name || "—"}</TableCell>
                            <TableCell className="font-semibold">{Number(c.amount).toLocaleString("ar-EG")} ج.م</TableCell>
                            <TableCell><Badge variant={cs.variant}>{cs.label}</Badge></TableCell>
                            <TableCell className="text-xs">{c.earned_date ? format(new Date(c.earned_date), "dd/MM/yyyy") : "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Manual Ledger */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">سجل المعاملات</h3>
              <Button size="sm" onClick={() => setLedgerDialogOpen(true)}>
                <Plus className="h-4 w-4 me-1" />
                تسجيل دفعة/خصم
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {ledger.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">لا توجد معاملات مالية لهذا الشهر</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الوصف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.map((tx) => {
                        const isCredit = ["commission", "bonus"].includes(tx.tx_type);
                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs">{format(new Date(tx.tx_date + "T00:00:00"), "dd/MM")}</TableCell>
                            <TableCell>
                              <Badge variant={isCredit ? "default" : "secondary"}>
                                {txTypeLabels[tx.tx_type] || tx.tx_type}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("font-semibold", isCredit ? "text-primary" : "text-destructive")}>
                              {isCredit ? "+" : "-"}{Number(tx.amount).toLocaleString("ar-EG")}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{tx.description || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Attendance Dialog */}
      <Dialog open={attDialogOpen} onOpenChange={setAttDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تسجيل حضور / غياب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>التاريخ *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-end font-normal", !attDate && "text-muted-foreground")}>
                    <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                    {attDate ? format(attDate, "dd/MM/yyyy") : "اختر التاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={attDate} onSelect={setAttDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>الحالة *</Label>
              <Select value={attStatus} onValueChange={setAttStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">حضور</SelectItem>
                  <SelectItem value="absent">غياب</SelectItem>
                  <SelectItem value="sick_leave">إجازة مرضية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea value={attNotes} onChange={(e) => setAttNotes(e.target.value)} placeholder="ملاحظات اختيارية..." />
            </div>
            <Button className="w-full" onClick={() => addAttendance.mutate()} disabled={addAttendance.isPending}>
              {addAttendance.isPending ? "جاري الحفظ…" : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ledger Dialog */}
      <Dialog open={ledgerDialogOpen} onOpenChange={setLedgerDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة / خصم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>النوع *</Label>
              <Select value={txType} onValueChange={setTxType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="commission">عمولة</SelectItem>
                  <SelectItem value="bonus">مكافأة</SelectItem>
                  <SelectItem value="salary">راتب</SelectItem>
                  <SelectItem value="deduction">خصم</SelectItem>
                  <SelectItem value="penalty">غرامة</SelectItem>
                  <SelectItem value="payout">دفعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المبلغ (ج.م) *</Label>
              <Input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>التاريخ *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-end font-normal", !txDate && "text-muted-foreground")}>
                    <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                    {txDate ? format(txDate, "dd/MM/yyyy") : "اختر التاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={txDate} onSelect={setTxDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={txDesc} onChange={(e) => setTxDesc(e.target.value)} placeholder="وصف اختياري…" />
            </div>
            <Button className="w-full" onClick={() => addLedgerEntry.mutate()} disabled={addLedgerEntry.isPending}>
              {addLedgerEntry.isPending ? "جاري الحفظ…" : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* HR Settings Dialog */}
      <Dialog open={hrDialogOpen} onOpenChange={setHrDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل إعدادات HR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الراتب الأساسي (ج.م)</Label>
              <Input type="number" min="0" value={hrBaseSalary} onChange={(e) => setHrBaseSalary(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>أيام العمل / شهر</Label>
              <Input type="number" min="1" max="31" value={hrWorkingDays} onChange={(e) => setHrWorkingDays(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>مضاعف خصم الغياب</Label>
              <Input type="number" min="0" step="0.1" value={hrPenaltyMultiplier} onChange={(e) => setHrPenaltyMultiplier(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الهدف الشهري (عدد العيادات)</Label>
              <Input type="number" min="1" value={hrTargetClinics} onChange={(e) => setHrTargetClinics(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>العمولة لكل عيادة (ج.م)</Label>
              <Input type="number" min="0" value={hrCommission} onChange={(e) => setHrCommission(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => updateHrSettings.mutate()} disabled={updateHrSettings.isPending}>
              {updateHrSettings.isPending ? "جاري الحفظ…" : "حفظ التعديلات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketerProfile;
