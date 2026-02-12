import { useEffect, useState, useCallback } from "react";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Database, Power, Settings } from "lucide-react";
import logoSymbol from "@/assets/logo-symbol.png";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useClinicTickets } from "@/hooks/useClinicTickets";
import { useTicketActions } from "@/hooks/useTicketActions";
import { PreArrivalList } from "@/components/console/PreArrivalList";
import { WaitingList } from "@/components/console/WaitingList";
import { CalledList } from "@/components/console/CalledList";
import { InServiceList } from "@/components/console/InServiceList";
import { MissedList } from "@/components/console/MissedList";
import { ReturnedList } from "@/components/console/ReturnedList";
import { DoneList } from "@/components/console/DoneList";
import { CreateTicketDialog } from "@/components/console/CreateTicketDialog";

const Console = () => {
  const { user, userRoles, clinicId, loading, signOut } = useAuth();
  const [bootstrapping, setBootstrapping] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [clinicTimezone, setClinicTimezone] = useState<string>("UTC");
  const [clinicName, setClinicName] = useState("");
  const [clinicWhatsApp, setClinicWhatsApp] = useState("");
  const navigate = useNavigate();
  const [sessionPaused, setSessionPaused] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(true);

  const isOwnerOrAdmin = userRoles.some(
    (r) => r.role === "owner" || r.role === "admin"
  );

  const getClinicToday = (tz: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());

  useEffect(() => {
    if (!clinicId) return;
    supabase
      .from("clinics")
      .select("timezone, session_paused, intake_open, name, name_ar, whatsapp_e164_1, clinic_whatsapp_phone")
      .eq("id", clinicId)
      .single()
      .then(({ data }) => {
        if (data?.timezone) setClinicTimezone(data.timezone);
        if (data) {
          setSessionPaused(data.session_paused);
          setIntakeOpen(data.intake_open);
          setClinicName(data.name || (data as any).name_ar || "");
          setClinicWhatsApp((data as any).whatsapp_e164_1 || data.clinic_whatsapp_phone || "");
        }
      });
  }, [clinicId]);

  const {
    preArrival, waiting, called, inService, missed, returned, done, refresh, loading: ticketsLoading,
  } = useClinicTickets(clinicId, clinicTimezone);

  const actions = useTicketActions(clinicId, refresh);

  const handleSendLink = useCallback(async (ticketId: string) => {
    const popup = window.open("about:blank", "_blank");
    const data = await actions.sendLink(ticketId);
    if (!data) { if (popup) popup.close(); return; }
    const ticket = preArrival.find((t) => t.id === ticketId);
    const patientPhone = ticket?.patient_phone?.replace(/\D/g, "") || "";
    const token = (data as any)?.token || ticket?.token;
    if (!token) { if (popup) popup.close(); return; }
    const patientLink = `${PUBLIC_BASE_URL}/q/${token}`;
    if (/lovableproject\.com|lovable\.dev/i.test(patientLink)) {
      if (popup) popup.close();
      toast.error("خطأ في إعداد الرابط. روابط المرضى يجب أن تستخدم https://inddd.com");
      return;
    }
    const message = `اضغط على الرابط لمتابعة دورك ووقت الانتظار المتوقع في ${clinicName}: ${patientLink}`;
    const encodedMessage = encodeURIComponent(message);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const waUrl = isMobile
      ? `https://wa.me/${patientPhone}?text=${encodedMessage}`
      : `https://web.whatsapp.com/send?phone=${patientPhone}&text=${encodedMessage}`;
    if (popup) { popup.location.href = waUrl; } else { window.location.href = waUrl; }
  }, [actions, preArrival, clinicName]);

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      const { error } = await supabase.rpc("bootstrap_demo_clinic");
      if (error) throw error;
      toast.success("تم إنشاء عيادة تجريبية!");
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "فشل إنشاء العيادة التجريبية");
    } finally {
      setBootstrapping(false);
    }
  };

  const handleSeed = async () => {
    if (!clinicId) return;
    setSeeding(true);
    try {
      const { data, error } = await supabase.rpc("seed_demo_day", { p_clinic_id: clinicId });
      if (error) throw error;
      toast.success(`تم إضافة ${data} تذكرة تجريبية لليوم.`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "فشل إضافة البيانات التجريبية");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSymbol} alt="inddd" className="h-8 w-8" />
            <div>
              <h1 className="text-lg font-bold text-foreground">لوحة التحكم</h1>
              <p className="text-sm text-muted-foreground">
                {user?.email} · {userRoles.map((r) => r.role).join("، ") || "بدون صلاحية"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/clinic-profile")}>
              <Settings className="ml-2 h-4 w-4" />الملف الشخصي
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/queue-settings")}>
              إعدادات الطابور
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="ml-2 h-4 w-4" />تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-4">
        {!clinicId && !loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">لا توجد عيادة</h2>
            <p className="text-muted-foreground">أنشئ عيادة تجريبية للبدء.</p>
            <Button onClick={handleBootstrap} disabled={bootstrapping}>
              <Plus className="ml-2 h-4 w-4" />
              {bootstrapping ? "جاري الإنشاء…" : "إنشاء عيادة تجريبية"}
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">لوحة اليوم</h2>
                  <p className="text-sm text-muted-foreground">
                    {getClinicToday(clinicTimezone)} ({clinicTimezone})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {clinicId && <CreateTicketDialog clinicId={clinicId} onCreated={refresh} />}
                  {isOwnerOrAdmin && (
                    <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
                      <Database className="ml-2 h-4 w-4" />
                      {seeding ? "جاري الإضافة…" : "بيانات تجريبية"}
                    </Button>
                  )}
                  {isOwnerOrAdmin && (
                    <Button variant="destructive" size="sm" onClick={() => {
                      if (window.confirm("هل تريد إغلاق جميع التذاكر المتبقية لليوم؟ لا يمكن التراجع.")) {
                        actions.closeOutDay();
                      }
                    }}>
                      <Power className="ml-2 h-4 w-4" />إغلاق اليوم
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6 border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="pause-toggle"
                    checked={!sessionPaused}
                    onCheckedChange={async (checked) => {
                      const paused = !checked;
                      setSessionPaused(paused);
                      await actions.setSessionPaused(paused);
                    }}
                  />
                  <Label htmlFor="pause-toggle" className="text-sm">
                    {sessionPaused ? "الجلسة متوقفة" : "الجلسة نشطة"}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="intake-toggle"
                    checked={intakeOpen}
                    onCheckedChange={async (checked) => {
                      setIntakeOpen(checked);
                      await actions.setIntakeOpen(checked);
                    }}
                  />
                  <Label htmlFor="intake-toggle" className="text-sm">
                    {intakeOpen ? "الاستقبال مفتوح" : "الاستقبال مغلق"}
                  </Label>
                </div>
              </div>
            </div>

            <PreArrivalList
              tickets={preArrival}
              clinicTimezone={clinicTimezone}
              onSendLink={handleSendLink}
              onConfirmArrival={actions.confirmArrival}
              onSetUrgent={actions.setUrgentAndInsert}
              onCancel={actions.cancelTicket}
            />
            <WaitingList
              tickets={waiting}
              clinicTimezone={clinicTimezone}
              onCallNext={actions.callNext}
              onSetUrgent={actions.setUrgentAndInsert}
              onCancel={actions.cancelTicket}
            />
            <CalledList
              tickets={called}
              clinicTimezone={clinicTimezone}
              onStartService={actions.startService}
              onMarkMissed={actions.markMissed}
              onCancel={actions.cancelTicket}
            />
            <InServiceList
              tickets={inService}
              clinicTimezone={clinicTimezone}
              onComplete={actions.completeTicket}
            />
            <MissedList tickets={missed} onMarkReturned={actions.markReturned} />
            <ReturnedList
              tickets={returned}
              onReinsert={actions.reinsertReturned}
              onSetUrgent={actions.setUrgentAndInsert}
            />
            <DoneList tickets={done} />
          </>
        )}
      </main>
    </div>
  );
};

export default Console;
