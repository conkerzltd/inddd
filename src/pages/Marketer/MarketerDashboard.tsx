import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Settings, LogOut, MapPin, Building2, ExternalLink } from "lucide-react";
import { useEffect } from "react";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "مفعّلة", variant: "default" },
  pending: { label: "قيد المراجعة", variant: "secondary" },
  blocked: { label: "موقوفة", variant: "destructive" },
  draft: { label: "مسودة", variant: "outline" },
};

const MarketerDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const { data: crm, isLoading } = useQuery({
    queryKey: ["marketer-crm"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_marketer_crm");
      if (error) throw error;
      return data as any;
    },
  });

  // Force password change if needed
  useEffect(() => {
    if (crm?.must_set_password) {
      navigate("/m/settings", { replace: true });
    }
  }, [crm?.must_set_password, navigate]);

  const clinics = crm?.clinics || [];
  const counts = crm?.counts || { total: 0, draft: 0, pending: 0, active: 0, blocked: 0 };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">لوحة المسوق</h1>
            {crm && (
              <Badge variant="outline" className="font-mono text-xs">{crm.referral_code}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/m/settings")}>
              <Settings className="h-4 w-4 me-1" />الإعدادات
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 me-1" />خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">جاري التحميل…</div>
        ) : (
          <>
            {/* Welcome */}
            <Card>
              <CardContent className="p-4">
                <p className="text-lg font-semibold">مرحباً {crm?.marketer_name}</p>
                <p className="text-sm text-muted-foreground">إليك ملخص أداءك والعيادات المسجلة تحت كودك.</p>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{counts.total}</p>
                <p className="text-xs text-muted-foreground">الإجمالي</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{counts.active}</p>
                <p className="text-xs text-muted-foreground">مفعّلة</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-secondary-foreground">{counts.pending}</p>
                <p className="text-xs text-muted-foreground">قيد المراجعة</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{counts.draft}</p>
                <p className="text-xs text-muted-foreground">مسودة</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{counts.blocked}</p>
                <p className="text-xs text-muted-foreground">موقوفة</p>
              </CardContent></Card>
            </div>

            {/* Clinics Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />العيادات المسجلة ({clinics.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {clinics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا توجد عيادات مسجلة بعد</div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>الاسم</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>الموقع</TableHead>
                            <TableHead>تاريخ التسجيل</TableHead>
                            <TableHead>الخريطة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clinics.map((c: any) => {
                            const st = statusLabels[c.status] || statusLabels.draft;
                            const location = [c.governorate_ar, c.locality_level2_ar].filter(Boolean).join("، ");
                            const mapLink = c.maps_url || (c.lat && c.lng ? `https://www.google.com/maps?q=${c.lat},${c.lng}` : null);
                            return (
                              <TableRow key={c.id}>
                                <TableCell className="font-semibold">{c.name_ar || c.name || "—"}</TableCell>
                                <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                                <TableCell className="text-sm">
                                  {location ? (
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{location}</span>
                                  ) : "—"}
                                </TableCell>
                                <TableCell className="text-xs">{formatDate(c.created_at)}</TableCell>
                                <TableCell>
                                  {mapLink ? (
                                    <a href={mapLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                                      <ExternalLink className="h-3 w-3" />خريطة
                                    </a>
                                  ) : "—"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3 p-3">
                      {clinics.map((c: any) => {
                        const st = statusLabels[c.status] || statusLabels.draft;
                        const location = [c.governorate_ar, c.locality_level2_ar].filter(Boolean).join("، ");
                        const mapLink = c.maps_url || (c.lat && c.lng ? `https://www.google.com/maps?q=${c.lat},${c.lng}` : null);
                        return (
                          <Card key={c.id}>
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm">{c.name_ar || c.name || "—"}</p>
                                <Badge variant={st.variant}>{st.label}</Badge>
                              </div>
                              {location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />{location}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{formatDate(c.created_at)}</span>
                                {mapLink && (
                                  <a href={mapLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" />خريطة
                                  </a>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default MarketerDashboard;
