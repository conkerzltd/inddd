import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/i18n/useLocale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
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
} from "lucide-react";

/* ── helpers ── */
const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "مفعّل", variant: "default" },
  pending: { label: "قيد المراجعة", variant: "secondary" },
  blocked: { label: "محظور", variant: "destructive" },
  draft: { label: "مسودة", variant: "outline" },
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

  // Attendance dialog
  const [attDialogOpen, setAttDialogOpen] = useState(false);
  const [attDate, setAttDate] = useState<Date | undefined>(undefined);
  const [attStatus, setAttStatus] = useState<string>("present");
  const [attNotes, setAttNotes] = useState("");

  // Ledger dialog
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [txType, setTxType] = useState<string>("payout");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txDate, setTxDate] = useState<Date | undefined>(new Date());

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

  const { data: clinics = [] } = useQuery({
    queryKey: ["marketer-clinics", id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, name, name_ar, serial_id, governorate_ar, locality_level2_ar, status, created_at")
        .eq("marketer_id", id!)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: allClinics = [] } = useQuery({
    queryKey: ["marketer-all-clinics", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, status")
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

  /* ── computed stats ── */
  const stats = useMemo(() => {
    const totalClinicsMonth = clinics.length;
    const activeClinicsMonth = clinics.filter((c) => c.status === "active").length;
    const absences = attendance.filter((a) => a.status !== "present").length;

    const commissions = ledger.filter((t) => ["commission", "bonus"].includes(t.tx_type)).reduce((s, t) => s + Number(t.amount), 0);
    const deductions = ledger.filter((t) => ["deduction", "penalty"].includes(t.tx_type)).reduce((s, t) => s + Number(t.amount), 0);
    const paid = ledger.filter((t) => ["payout", "salary"].includes(t.tx_type)).reduce((s, t) => s + Number(t.amount), 0);
    const balance = commissions - deductions - paid;

    return { totalClinicsMonth, activeClinicsMonth, absences, commissions, deductions, paid, balance };
  }, [clinics, attendance, ledger]);

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

          {/* Tab 1: Overview */}
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

            {/* Monthly stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <Building2 className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold text-foreground">{stats.totalClinicsMonth}</p>
                  <p className="text-xs text-muted-foreground">عيادات مسجلة</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Users className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold text-foreground">{stats.activeClinicsMonth}</p>
                  <p className="text-xs text-muted-foreground">عيادات مفعّلة</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <ClipboardList className="h-5 w-5 mx-auto text-destructive mb-1" />
                  <p className="text-2xl font-bold text-foreground">{stats.absences}</p>
                  <p className="text-xs text-muted-foreground">غيابات</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Banknote className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className={cn("text-2xl font-bold", stats.balance >= 0 ? "text-primary" : "text-destructive")}>
                    {stats.balance.toLocaleString("ar-EG")}
                  </p>
                  <p className="text-xs text-muted-foreground">الرصيد المستحق</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Clinics */}
          <TabsContent value="clinics" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">العيادات المسجلة — {monthLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                {clinics.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">لا توجد عيادات مسجلة في هذا الشهر</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>رقم</TableHead>
                          <TableHead>الاسم</TableHead>
                          <TableHead>الموقع</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clinics.map((c) => {
                          const cst = statusMap[c.status] || statusMap.draft;
                          return (
                            <TableRow key={c.id}>
                              <TableCell className="font-mono text-xs">{c.serial_id || "—"}</TableCell>
                              <TableCell>{c.name_ar || c.name}</TableCell>
                              <TableCell className="text-xs">{[c.governorate_ar, c.locality_level2_ar].filter(Boolean).join("، ") || "—"}</TableCell>
                              <TableCell className="text-xs">{format(new Date(c.created_at), "dd/MM")}</TableCell>
                              <TableCell><Badge variant={cst.variant}>{cst.label}</Badge></TableCell>
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

          {/* Tab 3: HR & Attendance */}
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

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{attendance.filter((a) => a.status === "present").length}</p>
                  <p className="text-xs text-muted-foreground">حضور</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{attendance.filter((a) => a.status === "absent").length}</p>
                  <p className="text-xs text-muted-foreground">غياب</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{attendance.filter((a) => a.status === "sick_leave").length}</p>
                  <p className="text-xs text-muted-foreground">إجازة مرضية</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 4: Financials */}
          <TabsContent value="finance" className="space-y-4 mt-4">
            {/* Summary card */}
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ملخص مالي — {monthLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                  <div>
                    <p className="text-lg font-bold text-primary">{stats.commissions.toLocaleString("ar-EG")}</p>
                    <p className="text-xs text-muted-foreground">عمولات + مكافآت</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-destructive">{stats.deductions.toLocaleString("ar-EG")}</p>
                    <p className="text-xs text-muted-foreground">خصومات + غرامات</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-muted-foreground">{stats.paid.toLocaleString("ar-EG")}</p>
                    <p className="text-xs text-muted-foreground">مدفوعات</p>
                  </div>
                  <div>
                    <p className={cn("text-lg font-bold", stats.balance >= 0 ? "text-primary" : "text-destructive")}>
                      {stats.balance.toLocaleString("ar-EG")}
                    </p>
                    <p className="text-xs text-muted-foreground">الرصيد المستحق</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  <Button variant="outline" className={cn("w-full justify-start text-right font-normal", !attDate && "text-muted-foreground")}>
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
                  <Button variant="outline" className={cn("w-full justify-start text-right font-normal", !txDate && "text-muted-foreground")}>
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
    </div>
  );
};

export default MarketerProfile;
