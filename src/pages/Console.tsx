import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LogOut, Plus, Database, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface SeedTicket {
  id: string;
  status: string;
  type: string;
  patient_name: string | null;
  appointment_time: string | null;
  rank_key: number | null;
  token: string | null;
}

const Console = () => {
  const { user, userRoles, clinicId, loading, signOut } = useAuth();
  const [bootstrapping, setBootstrapping] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedTickets, setSeedTickets] = useState<SeedTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [clinicTimezone, setClinicTimezone] = useState<string>("UTC");

  const isOwnerOrAdmin = userRoles.some(
    (r) => r.role === "owner" || r.role === "admin"
  );

  // Compute today in clinic timezone
  const getClinicToday = (tz: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  // Format time in clinic timezone
  const formatClinicTime = (iso: string, tz: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));

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

  // Load tickets using clinic-timezone today
  const loadTickets = async () => {
    if (!clinicId) return;
    setLoadingTickets(true);
    try {
      const today = getClinicToday(clinicTimezone);
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select("id, status, type, patient_name, appointment_time, rank_key")
        .eq("clinic_id", clinicId)
        .eq("visit_date", today)
        .order("rank_key", { ascending: true, nullsFirst: false });

      if (error) throw error;
      if (!tickets || tickets.length === 0) {
        setSeedTickets([]);
        return;
      }

      const ticketIds = tickets.map((t) => t.id);
      const { data: links } = await supabase
        .from("patient_links")
        .select("ticket_id, token")
        .in("ticket_id", ticketIds)
        .is("revoked_at", null);

      const tokenMap = new Map(
        (links || []).map((l) => [l.ticket_id, l.token])
      );

      setSeedTickets(
        tickets.map((t) => ({
          ...t,
          token: tokenMap.get(t.id) || null,
        }))
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to load tickets");
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (clinicId && clinicTimezone) loadTickets();
  }, [clinicId, clinicTimezone]);

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      const { data, error } = await supabase.rpc("bootstrap_demo_clinic");
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
      const { data, error } = await supabase.rpc("seed_demo_day", {
        p_clinic_id: clinicId,
      });
      if (error) throw error;
      toast.success(`Seeded ${data} demo tickets for today.`);
      await loadTickets();
    } catch (e: any) {
      toast.error(e.message || "Failed to seed demo data");
    } finally {
      setSeeding(false);
    }
  };

  const formatRankKey = (rk: number | null) => {
    if (rk === null) return "—";
    if (rk >= 3_000_000_000) return `3B+${Math.round(rk - 3_000_000_000)}`;
    if (rk >= 2_000_000_000) return `2B+${Math.round(rk - 2_000_000_000)}`;
    if (rk >= 1_000_000_000) return `1B+${Math.round(rk - 1_000_000_000)}`;
    return String(rk);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              QueueLine Console
            </h1>
            <p className="text-sm text-muted-foreground">
              {user?.email} ·{" "}
              {userRoles.map((r) => r.role).join(", ") || "No role assigned"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {!clinicId && !loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              No Clinic Found
            </h2>
            <p className="text-muted-foreground">
              Create a demo clinic to get started. You'll be assigned as owner
              &amp; admin.
            </p>
            <Button onClick={handleBootstrap} disabled={bootstrapping}>
              <Plus className="mr-2 h-4 w-4" />
              {bootstrapping ? "Creating…" : "Create Demo Clinic"}
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Today's Dashboard
                </h2>
                <p className="text-sm text-muted-foreground">
                  {getClinicToday(clinicTimezone)} ({clinicTimezone}) · Dashboard
                  will be built in Step 3.
                </p>
              </div>
              {isOwnerOrAdmin && (
                <Button
                  variant="outline"
                  onClick={handleSeed}
                  disabled={seeding}
                >
                  <Database className="mr-2 h-4 w-4" />
                  {seeding ? "Seeding…" : "Seed Demo Day"}
                </Button>
              )}
            </div>

            {seedTickets.length > 0 && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">
                    Seeded Tickets ({seedTickets.length})
                  </h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Appointment</TableHead>
                      <TableHead>Rank Key</TableHead>
                      <TableHead>Patient Page</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seedTickets.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">
                          {t.patient_name || "—"}
                        </TableCell>
                        <TableCell>{t.status}</TableCell>
                        <TableCell>{t.type}</TableCell>
                        <TableCell>
                          {t.appointment_time
                            ? formatClinicTime(
                                t.appointment_time,
                                clinicTimezone
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatRankKey(t.rank_key)}
                        </TableCell>
                        <TableCell>
                          {t.token ? (
                            <a
                              href={`/q/${t.token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                            >
                              Open
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Console;
