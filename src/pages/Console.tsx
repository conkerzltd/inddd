import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Console = () => {
  const { user, userRoles, clinicId, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">QueueLine Console</h1>
            <p className="text-sm text-muted-foreground">
              {user?.email} · {userRoles.map((r) => r.role).join(", ") || "No role assigned"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold text-foreground">Today's Dashboard</h2>
          <p className="mt-2 text-muted-foreground">
            {clinicId
              ? "Console ready. Dashboard will be built in Step 3."
              : "No clinic assigned yet. Ask an admin to add you to a clinic."}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Console;
