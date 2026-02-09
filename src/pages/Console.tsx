import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Database } from "lucide-react";
import { toast } from "sonner";

const Console = () => {
  const { user, userRoles, clinicId, loading, signOut } = useAuth();
  const [bootstrapping, setBootstrapping] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      const { data, error } = await supabase.rpc("bootstrap_demo_clinic");
      if (error) throw error;
      toast.success(`Demo clinic created! ID: ${data}`);
      // Refresh roles by reloading
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
    } catch (e: any) {
      toast.error(e.message || "Failed to seed demo data");
    } finally {
      setSeeding(false);
    }
  };

  const isOwnerOrAdmin = userRoles.some(
    (r) => r.role === "owner" || r.role === "admin"
  );

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
      <main className="container mx-auto p-4">
        {!clinicId && !loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              No Clinic Found
            </h2>
            <p className="text-muted-foreground">
              Create a demo clinic to get started. You'll be assigned as
              owner &amp; admin.
            </p>
            <Button onClick={handleBootstrap} disabled={bootstrapping}>
              <Plus className="mr-2 h-4 w-4" />
              {bootstrapping ? "Creating…" : "Create Demo Clinic"}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Today's Dashboard
            </h2>
            <p className="text-muted-foreground">
              Console ready. Dashboard will be built in Step 3.
            </p>
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
        )}
      </main>
    </div>
  );
};

export default Console;
