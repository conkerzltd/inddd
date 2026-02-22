import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Settings, LogOut, MapPin, Building2, ExternalLink, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import ClinicDetailDrawer from "@/components/marketer/ClinicDetailDrawer";
import AddLeadDrawer from "@/components/marketer/AddLeadDrawer";
import LeadCard from "@/components/marketer/LeadCard";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "مفعّلة", variant: "default" },
  pending: { label: "قيد المراجعة", variant: "secondary" },
  blocked: { label: "موقوفة", variant: "destructive" },
  draft: { label: "مسودة", variant: "outline" },
};

const MarketerDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);

  const { data: crm, isLoading } = useQuery({
    queryKey: ["marketer-crm"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_marketer_crm");
      if (error) throw error;
      return data as any;
    },
  });

  const { data: pipeline } = useQuery({
    queryKey: ["marketer-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_marketer_pipeline");
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (crm?.must_set_password) navigate("/m/settings", { replace: true });
  }, [crm?.must_set_password, navigate]);

  const clinics = crm?.clinics || [];
  const counts = crm?.counts || { total: 0, draft: 0, pending: 0, active: 0, blocked: 0 };
  const activeLeads = pipeline?.active || [];
  const archiveLeads = pipeline?.archive || [];

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "—";

  // Get marketer_id from crm for lead insertion
  const marketerId = crm ? (crm as any).marketer_id : null;

  // We need the marketer_id. Let's fetch it from marketer_users if not in CRM.
  const { data: marketerMapping } = useQuery({
    queryKey: ["marketer-mapping"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketer_users").select("marketer_id").limit(1).single();
      if (error) throw error;
      return data;
    },
  });

  const resolvedMarketerId = marketerId || marketerMapping?.marketer_id || "";

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

            {/* FAB: Add Lead */}
            <Button className="w-full" onClick={() => setShowAddLead(true)}>
              <Plus className="me-2 h-4 w-4" />إضافة عيادة محتملة
            </Button>

            {/* Tabs */}
            <Tabs defaultValue="tasks" className="w-full" dir="rtl">
              <TabsList className="w-full grid grid-cols-3" dir="rtl">
                <TabsTrigger value="tasks" className="text-xs">
                  المهام والزيارات ({activeLeads.length})
                </TabsTrigger>
                <TabsTrigger value="clinics" className="text-xs">
                  العيادات المسجلة ({clinics.length})
                </TabsTrigger>
                <TabsTrigger value="archive" className="text-xs">
                  الأرشيف ({archiveLeads.length})
                </TabsTrigger>
              </TabsList>

              {/* Tasks Tab */}
              <TabsContent value="tasks">
                {activeLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    لا توجد مهام حالية. أضف عيادة محتملة للبدء.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeLeads.map((lead: any) => (
                      <LeadCard key={lead.id} lead={lead} referralCode={crm?.referral_code || ""} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Clinics Tab */}
              <TabsContent value="clinics">
                {clinics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">لا توجد عيادات مسجلة بعد</div>
                ) : (
                  <div className="space-y-3">
                    {clinics.map((c: any) => {
                      const st = statusLabels[c.status] || statusLabels.draft;
                      const location = [c.governorate_ar, c.locality_level2_ar].filter(Boolean).join("، ");
                      return (
                        <Card key={c.id} className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => setSelectedClinicId(c.id)}>
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
                            <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Archive Tab */}
              <TabsContent value="archive">
                {archiveLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">الأرشيف فارغ</div>
                ) : (
                  <div className="space-y-3">
                    {archiveLeads.map((lead: any) => (
                      <LeadCard key={lead.id} lead={lead} referralCode={crm?.referral_code || ""} isArchive />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {/* Drawers */}
      <ClinicDetailDrawer
        clinicId={selectedClinicId}
        open={!!selectedClinicId}
        onOpenChange={(open) => { if (!open) setSelectedClinicId(null); }}
      />
      {resolvedMarketerId && (
        <AddLeadDrawer
          open={showAddLead}
          onOpenChange={setShowAddLead}
          marketerId={resolvedMarketerId}
        />
      )}
    </div>
  );
};

export default MarketerDashboard;
