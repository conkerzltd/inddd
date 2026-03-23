import { useEffect, useState, useCallback, useMemo } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TicketRow } from "@/hooks/useClinicTickets";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Database, Power, Menu, Search } from "lucide-react";
import { ScrollFabs } from "@/components/console/ScrollFabs";
import logoSymbol from "@/assets/logo-symbol.png";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useClinicTickets } from "@/hooks/useClinicTickets";
import { useTicketActions } from "@/hooks/useTicketActions";
import { useTicketHighlight } from "@/hooks/useTicketHighlight";
import { PreArrivalList } from "@/components/console/PreArrivalList";
import { WaitingList } from "@/components/console/WaitingList";
import { CalledList } from "@/components/console/CalledList";
import { InServiceList } from "@/components/console/InServiceList";
import { NotPresentList } from "@/components/console/NotPresentList";
import { DoneList } from "@/components/console/DoneList";
import { CreateTicketDialog } from "@/components/console/CreateTicketDialog";
import { consoleNavItems } from "@/config/navItems";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

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
          setClinicName((data as any).name_ar || data.name || "");
          setClinicWhatsApp((data as any).whatsapp_e164_1 || data.clinic_whatsapp_phone || "");
        }
      });
  }, [clinicId]);

  const {
    preArrival, waiting, called, inService, missed, returned, done, refresh, loading: ticketsLoading,
  } = useClinicTickets(clinicId, clinicTimezone);

  const actions = useTicketActions(clinicId, refresh);
  const { highlightId, highlight } = useTicketHighlight();
  const [searchQuery, setSearchQuery] = useState("");

  /** Enrich tickets with original position then filter by search */
  const enrichAndFilter = useCallback((tickets: TicketRow[]) => {
    const enriched = tickets.map((t, i) => ({ ...t, _pos: i + 1 }));
    if (!searchQuery.trim()) return enriched;
    const q = searchQuery.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return enriched.filter((t) =>
      (t.patient_name && t.patient_name.toLowerCase().includes(q)) ||
      (qDigits.length >= 3 && t.patient_phone && t.patient_phone.replace(/\D/g, "").includes(qDigits))
    );
  }, [searchQuery]);

  /** Wrap an action to highlight the affected ticket after success */
  const withHighlight = useCallback(
    (fn: (...args: any[]) => Promise<any> | void) =>
      async (ticketId: string, ...rest: any[]) => {
        const result = await fn(ticketId, ...rest);
        if (result !== null) highlight(ticketId);
        return result;
      },
    [highlight]
  );

  /** For callNext — extract ticketId from the RPC response */
  const handleCallNextHighlight = useCallback(async () => {
    const result = await actions.callNext();
    if (result && typeof result === "object" && (result as any).ticket_id) {
      highlight((result as any).ticket_id);
    }
    return result;
  }, [actions, highlight]);

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
      <header className="border-b border-border bg-card px-4 py-3 sticky top-0 z-20">
        <div className="container mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoSymbol} alt="inddd" className="h-8 w-8 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground">لوحة التحكم</h1>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Desktop nav links */}
            {consoleNavItems.map((item) => (
              <Button key={item.path} variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => navigate(item.path)}>
                <item.icon className="h-4 w-4 me-2" />{item.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={signOut}>
              <LogOut className="h-4 w-4 me-2" />تسجيل الخروج
            </Button>

            {/* Mobile hamburger menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>القائمة</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 space-y-1">
                  {consoleNavItems.map((item) => (
                    <Button key={item.path} variant="ghost" className="w-full justify-start min-h-[44px]" onClick={() => navigate(item.path)}>
                      <item.icon className="h-4 w-4 me-2" />{item.label}
                    </Button>
                  ))}
                  <Button variant="ghost" className="w-full justify-start min-h-[44px] text-destructive" onClick={signOut}>
                    <LogOut className="h-4 w-4 me-2" />تسجيل الخروج
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <ScrollFabs />

      <main className="container mx-auto p-4 space-y-4">
        {!clinicId && !loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">لا توجد عيادة</h2>
            <p className="text-muted-foreground">أنشئ عيادة تجريبية للبدء.</p>
            <Button onClick={handleBootstrap} disabled={bootstrapping}>
              <Plus className="me-2 h-4 w-4" />
              {bootstrapping ? "جاري الإنشاء…" : "إنشاء عيادة تجريبية"}
            </Button>
          </div>
        ) : (
          <>
              <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">لوحة اليوم</h2>
                  <p className="text-sm text-muted-foreground">
                    {getClinicToday(clinicTimezone)} ({clinicTimezone})
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {clinicId && <CreateTicketDialog clinicId={clinicId} clinicName={clinicName} onCreated={(ticketId) => { refresh(); if (ticketId) highlight(ticketId); }} />}
                  {isOwnerOrAdmin && (
                    <Button variant="outline" size="sm" className="min-h-[44px] md:min-h-0" onClick={handleSeed} disabled={seeding}>
                      <Database className="me-2 h-4 w-4" />
                      {seeding ? "جاري…" : "تجريبي"}
                    </Button>
                  )}
                  {isOwnerOrAdmin && (
                    <Button variant="destructive" size="sm" className="min-h-[44px] md:min-h-0" onClick={() => {
                      if (window.confirm("هل تريد إغلاق جميع التذاكر المتبقية لليوم؟ لا يمكن التراجع.")) {
                        actions.closeOutDay();
                      }
                    }}>
                      <Power className="me-2 h-4 w-4" />إغلاق اليوم
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3">
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

            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو رقم الهاتف…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>

            <PreArrivalList
              tickets={enrichAndFilter(preArrival)}
              clinicTimezone={clinicTimezone}
              highlightId={highlightId}
              onSendLink={handleSendLink}
              onConfirmArrival={withHighlight(actions.confirmArrival)}
              onCancel={withHighlight(actions.cancelTicket)}
            />
            <WaitingList
              tickets={enrichAndFilter(waiting)}
              clinicTimezone={clinicTimezone}
              highlightId={highlightId}
              onSendLink={handleSendLink}
              onSetUrgent={async (id, pos, n, note) => {
                const r = await actions.setUrgentAndInsert(id, pos, n, note);
                if (r !== null) highlight(id);
                return r;
              }}
              onCancel={withHighlight(actions.cancelTicket)}
            />
            <CalledList
              tickets={enrichAndFilter(called)}
              clinicTimezone={clinicTimezone}
              highlightId={highlightId}
              onStartService={withHighlight(actions.startService)}
              onMarkMissed={withHighlight(actions.markMissed)}
              onSendLink={handleSendLink}
              onCancel={withHighlight(actions.cancelTicket)}
            />
            <InServiceList
              tickets={enrichAndFilter(inService)}
              clinicTimezone={clinicTimezone}
              highlightId={highlightId}
              onComplete={withHighlight(actions.completeTicket)}
              onCallNext={handleCallNextHighlight}
            />
            <NotPresentList
              missedTickets={enrichAndFilter(missed)}
              returnedTickets={enrichAndFilter(returned)}
              clinicTimezone={clinicTimezone}
              highlightId={highlightId}
              onReinsertMissed={async (id, pos, n, note) => {
                await actions.markReturned(id);
                const r = await actions.reinsertReturned(id, pos, n, note);
                if (r !== null) highlight(id);
                return r;
              }}
              onReinsert={async (id, pos, n, note) => {
                const r = await actions.reinsertReturned(id, pos, n, note);
                if (r !== null) highlight(id);
                return r;
              }}
            />
            <DoneList tickets={enrichAndFilter(done)} clinicTimezone={clinicTimezone} highlightId={highlightId} />
          </>
        )}
      </main>
    </div>
  );
};

export default Console;
