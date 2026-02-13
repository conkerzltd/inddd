import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/i18n/useLocale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ArrowRight,
  Building2,
  Users,
  MapPin,
  BarChart3,
  Award,
  CalendarDays,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ClinicRow = {
  id: string;
  name_ar: string | null;
  name: string;
  status: string;
  governorate_ar: string | null;
  locality_level2_ar: string | null;
  created_at: string;
  marketer_id: string | null;
};

type MarketerRow = {
  id: string;
  name: string;
  referral_code: string;
  primary_phone: string;
  status: string;
  governorate_ar: string | null;
  city_ar: string | null;
};

type TicketRow = {
  clinic_id: string;
  status: string;
  created_at: string;
};

const OwnerAnalytics = () => {
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const [govFilter, setGovFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  const { data: clinics = [] } = useQuery({
    queryKey: ["analytics-clinics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, name_ar, name, status, governorate_ar, locality_level2_ar, created_at, marketer_id");
      if (error) throw error;
      return data as ClinicRow[];
    },
  });

  const { data: marketers = [] } = useQuery({
    queryKey: ["analytics-marketers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketers")
        .select("id, name, referral_code, primary_phone, status, governorate_ar, city_ar");
      if (error) throw error;
      return data as MarketerRow[];
    },
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["analytics-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("clinic_id, status, created_at");
      if (error) throw error;
      return data as TicketRow[];
    },
  });

  const BLOCKED_GEO = new Set(["placeholder", "test", "testing", "temp", "tmp", "n/a", "na", "none", "null", ""]);
  const isValidGeo = (v: string | null): v is string =>
    !!v && !BLOCKED_GEO.has(v.toLowerCase().trim());

  // Unique governorates & cities for filters (only those with real clinics)
  const governorates = useMemo(() => {
    const set = new Set<string>();
    clinics.forEach((c) => isValidGeo(c.governorate_ar) && set.add(c.governorate_ar));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [clinics]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    clinics
      .filter((c) => govFilter === "all" || c.governorate_ar === govFilter)
      .forEach((c) => isValidGeo(c.locality_level2_ar) && set.add(c.locality_level2_ar));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [clinics, govFilter]);

  // Filtered clinics
  const filtered = useMemo(() => {
    return clinics.filter((c) => {
      if (govFilter !== "all" && c.governorate_ar !== govFilter) return false;
      if (cityFilter !== "all" && c.locality_level2_ar !== cityFilter) return false;
      return true;
    });
  }, [clinics, govFilter, cityFilter]);

  const filteredIds = useMemo(() => new Set(filtered.map((c) => c.id)), [filtered]);

  // Stats
  const totalClinics = filtered.length;
  const pendingClinics = filtered.filter((c) => c.status === "pending").length;
  const activeClinics = filtered.filter((c) => c.status === "active").length;
  const blockedClinics = filtered.filter((c) => c.status === "blocked").length;

  const filteredTickets = useMemo(
    () => tickets.filter((t) => filteredIds.has(t.clinic_id)),
    [tickets, filteredIds]
  );
  const totalTickets = filteredTickets.length;
  const doneTickets = filteredTickets.filter((t) => t.status === "DONE").length;

  // Marketer performance
  const marketerRanking = useMemo(() => {
    return marketers
      .map((m) => {
        const mClinics = filtered.filter((c) => c.marketer_id === m.id);
        const mClinicIds = new Set(mClinics.map((c) => c.id));
        const mTickets = tickets.filter((t) => mClinicIds.has(t.clinic_id));
        const mDone = mTickets.filter((t) => t.status === "DONE").length;
        return {
          ...m,
          clinicCount: mClinics.length,
          activeClinics: mClinics.filter((c) => c.status === "active").length,
          ticketCount: mTickets.length,
          doneCount: mDone,
        };
      })
      .sort((a, b) => b.clinicCount - a.clinicCount || b.doneCount - a.doneCount);
  }, [marketers, filtered, tickets]);

  // Recent clinics (last 7 days)
  const recentClinics = useMemo(() => {
    const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return filtered.filter((c) => new Date(c.created_at).getTime() > week).length;
  }, [filtered]);

  // Monthly clinic registrations chart data
  const monthlyClinicData = useMemo(() => {
    const months: Record<string, number> = {};
    filtered.forEach((c) => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => {
        const [y, m] = month.split("-");
        const label = new Date(+y, +m - 1).toLocaleDateString("ar-EG", {
          month: "short",
          year: "2-digit",
        });
        return { month: label, count };
      });
  }, [filtered]);

  // Daily ticket volume chart data (last 30 days)
  const dailyTicketData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    filteredTickets.forEach((t) => {
      const ts = new Date(t.created_at).getTime();
      if (now - ts > thirtyDays) return;
      const key = new Date(t.created_at).toISOString().slice(0, 10);
      days[key] = (days[key] || 0) + 1;
    });
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => {
        const label = new Date(day).toLocaleDateString("ar-EG", {
          month: "short",
          day: "numeric",
        });
        return { day: label, count };
      });
  }, [filteredTickets]);

  const handleGovChange = (v: string) => {
    setGovFilter(v);
    setCityFilter("all");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(localePath("/ad"))}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">التحليلات</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 space-y-5">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">فلتر حسب الموقع</span>
              </div>
              {(govFilter !== "all" || cityFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => { setGovFilter("all"); setCityFilter("all"); }}
                >
                  مسح الفلاتر
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">المحافظة</label>
                <Select value={govFilter} onValueChange={handleGovChange}>
                  <SelectTrigger dir="rtl">
                    <SelectValue placeholder="اختر المحافظة" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كل المحافظات</SelectItem>
                    {governorates.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">المدينة / المركز</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger dir="rtl">
                    <SelectValue placeholder="اختر المدينة" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كل المدن</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clinic Stats */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">إحصائيات العيادات</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{totalClinics}</p>
                <p className="text-xs text-muted-foreground">إجمالي</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{activeClinics}</p>
                <p className="text-xs text-muted-foreground">مفعّلة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-secondary-foreground">{pendingClinics}</p>
                <p className="text-xs text-muted-foreground">قيد المراجعة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{blockedClinics}</p>
                <p className="text-xs text-muted-foreground">معطّلة</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ticket Stats */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">إحصائيات التذاكر</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{totalTickets}</p>
                <p className="text-xs text-muted-foreground">إجمالي التذاكر</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{doneTickets}</p>
                <p className="text-xs text-muted-foreground">مكتملة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{recentClinics}</p>
                <p className="text-xs text-muted-foreground">عيادات جديدة (٧ أيام)</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                العيادات المسجلة شهرياً
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {monthlyClinicData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">لا توجد بيانات</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyClinicData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Bar dataKey="count" name="عيادات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                التذاكر اليومية (٣٠ يوم)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {dailyTicketData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">لا توجد بيانات</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyTicketData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="تذاكر"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">إحصائيات المسوقين</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{marketers.length}</p>
                <p className="text-xs text-muted-foreground">إجمالي المسوقين</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {marketers.filter((m) => m.status === "active").length}
                </p>
                <p className="text-xs text-muted-foreground">نشط</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-destructive">
                  {marketers.filter((m) => m.status === "blocked").length}
                </p>
                <p className="text-xs text-muted-foreground">معطّل</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Marketer Ranking Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              ترتيب أداء المسوقين
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {marketerRanking.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                لا يوجد مسوقون بعد
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>المسوق</TableHead>
                    <TableHead>الكود</TableHead>
                    <TableHead className="text-center">العيادات</TableHead>
                    <TableHead className="text-center">المفعّلة</TableHead>
                    <TableHead className="text-center">التذاكر</TableHead>
                    <TableHead className="text-center">المكتملة</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketerRanking.map((m, i) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {i < 3 ? (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              i === 0
                                ? "bg-yellow-100 text-yellow-700"
                                : i === 1
                                ? "bg-gray-100 text-gray-600"
                                : "bg-orange-100 text-orange-600"
                            }`}
                          >
                            {i + 1}
                          </span>
                        ) : (
                          i + 1
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="font-mono text-xs">{m.referral_code}</TableCell>
                      <TableCell className="text-center">{m.clinicCount}</TableCell>
                      <TableCell className="text-center">{m.activeClinics}</TableCell>
                      <TableCell className="text-center">{m.ticketCount}</TableCell>
                      <TableCell className="text-center">{m.doneCount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={m.status === "active" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {m.status === "active" ? "نشط" : "معطّل"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default OwnerAnalytics;
