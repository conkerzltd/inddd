import { useEffect, useState } from "react";
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

  // Fetch clinic timezone and flags
  useEffect(() => {
    if (!clinicId) return;
    supabase
      .from("clinics")
      .select("timezone, session_paused, intake_open")
      .eq("id", clinicId)
      .single()
      .then(({ data }) => {
        if (data?.timezone) setClinicTimezone(data.timezone);
        if (data) {
          setSessionPaused(data.session_paused);
          setIntakeOpen(data.intake_open);
        }
      });
  }, [clinicId]);

  const {
    preArrival, waiting, called, inService, missed, returned, done, refresh, loading: ticketsLoading,
  } = useClinicTickets(clinicId, clinicTimezone);

  const actions = useTicketActions(clinicId, refresh);

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      const { error } = await supabase.rpc("bootstrap_demo_clinic");
      if (error) throw error;
      toast.success("Demo clinic created!");
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to create demo clinic");
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
      toast.success(`Seeded ${data} demo tickets for today.`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to seed demo data");
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
              <h1 className="text-lg font-bold text-foreground">inddd Console</h1>
              <p className="text-sm text-muted-foreground">
              {user?.email} · {userRoles.map((r) => r.role).join(", ") || "No role"}
            </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-4">
        {!clinicId && !loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">No Clinic Found</h2>
            <p className="text-muted-foreground">Create a demo clinic to get started.</p>
            <Button onClick={handleBootstrap} disabled={bootstrapping}>
              <Plus className="mr-2 h-4 w-4" />
              {bootstrapping ? "Creating…" : "Create Demo Clinic"}
            </Button>
          </div>
        ) : (
          <>
            {/* Header bar */}
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Today's Dashboard</h2>
                  <p className="text-sm text-muted-foreground">
                    {getClinicToday(clinicTimezone)} ({clinicTimezone})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {clinicId && <CreateTicketDialog clinicId={clinicId} onCreated={refresh} />}
                  {isOwnerOrAdmin && (
                    <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
                      <Database className="mr-2 h-4 w-4" />
                      {seeding ? "Seeding…" : "Seed Demo Day"}
                    </Button>
                  )}
                  {isOwnerOrAdmin && (
                    <Button variant="destructive" size="sm" onClick={() => {
                      if (window.confirm("Close out all remaining tickets for today? This cannot be undone.")) {
                        actions.closeOutDay();
                      }
                    }}>
                      <Power className="mr-2 h-4 w-4" />Close Out Day
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6 border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="pause-toggle"
                    checked={sessionPaused}
                    onCheckedChange={async (checked) => {
                      setSessionPaused(checked);
                      await actions.setSessionPaused(checked);
                    }}
                  />
                  <Label htmlFor="pause-toggle" className="text-sm">
                    {sessionPaused ? "Session Paused" : "Session Active"}
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
                    {intakeOpen ? "Intake Open" : "Intake Closed"}
                  </Label>
                </div>
              </div>
            </div>

            {/* Dashboard sections */}
            <PreArrivalList
              tickets={preArrival}
              clinicTimezone={clinicTimezone}
              onSendLink={actions.sendLink}
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
