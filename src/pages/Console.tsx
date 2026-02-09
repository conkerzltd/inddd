import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Database } from "lucide-react";
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

  const isOwnerOrAdmin = userRoles.some(
    (r) => r.role === "owner" || r.role === "admin"
  );

  const getClinicToday = (tz: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());

  // Fetch clinic timezone
  useEffect(() => {
    if (!clinicId) return;
    supabase
      .from("clinics")
      .select("timezone")
      .eq("id", clinicId)
      .single()
      .then(({ data }) => {
        if (data?.timezone) setClinicTimezone(data.timezone);
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
          <div>
            <h1 className="text-lg font-bold text-foreground">QueueLine Console</h1>
            <p className="text-sm text-muted-foreground">
              {user?.email} · {userRoles.map((r) => r.role).join(", ") || "No role"}
            </p>
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
            <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
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
              </div>
            </div>

            {/* Dashboard sections */}
            <PreArrivalList
              tickets={preArrival}
              clinicTimezone={clinicTimezone}
              onSendLink={actions.sendLink}
              onConfirmArrival={actions.confirmArrival}
            />
            <WaitingList
              tickets={waiting}
              clinicTimezone={clinicTimezone}
              onCallNext={actions.callNext}
            />
            <CalledList
              tickets={called}
              clinicTimezone={clinicTimezone}
              onStartService={actions.startService}
              onMarkMissed={actions.markMissed}
            />
            <InServiceList
              tickets={inService}
              clinicTimezone={clinicTimezone}
              onComplete={actions.completeTicket}
            />
            <MissedList tickets={missed} onMarkReturned={actions.markReturned} />
            <ReturnedList tickets={returned} />
            <DoneList tickets={done} />
          </>
        )}
      </main>
    </div>
  );
};

export default Console;
