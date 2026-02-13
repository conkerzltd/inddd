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
  Clock,
  TrendingUp,
  MapPin,
  BarChart3,
  Award,
} from "lucide-react";

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
        .select("clinic_id, status");
      if (error) throw error;
      return data as TicketRow[];
    },
  });

  // Unique governorates & cities for filters
  const governorates = useMemo(() => {
    const set = new Set<string>();
    clinics.forEach((c) => c.governorate_ar && set.add(c.governorate_ar));
    return Array.from(set).sort();
  }, [clinics]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    clinics
      .filter((c) => govFilter === "all" || c.governorate_ar === govFilter)
      .forEach((c) => c.locality_level2_ar && set.add(c.locality_level2_ar));
    return Array.from(set).sort();
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
            onClick={() => navigate(localePath("/owner-portal"))}
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
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">فلتر حسب الموقع</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={govFilter} onValueChange={handleGovChange}>
                <SelectTrigger>
                  <SelectValue placeholder="المحافظة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المحافظات</SelectItem>
                  {governorates.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="المدينة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المدن</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {/* Marketer Stats */}
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
