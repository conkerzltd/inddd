import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Check } from "lucide-react";
import { toast } from "sonner";
import logoSymbol from "@/assets/logo-symbol.png";

const QueueSettings = () => {
  const { clinicId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [avgServiceMinutes, setAvgServiceMinutes] = useState(10);
  const [lateThreshold, setLateThreshold] = useState(10);
  const [allowUrgent, setAllowUrgent] = useState(true);
  const [allowPauseIntake, setAllowPauseIntake] = useState(true);

  useEffect(() => {
    if (!clinicId) return;
    supabase
      .from("clinics")
      .select("avg_service_time_seed_minutes, late_threshold_minutes, allow_urgent_insert, allow_pause_intake")
      .eq("id", clinicId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setAvgServiceMinutes((data as any).avg_service_time_seed_minutes ?? 10);
        setLateThreshold(data.late_threshold_minutes ?? 10);
        setAllowUrgent((data as any).allow_urgent_insert ?? true);
        setAllowPauseIntake((data as any).allow_pause_intake ?? true);
      });
  }, [clinicId]);

  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("clinics")
      .update({
        avg_service_time_seed_minutes: avgServiceMinutes,
        late_threshold_minutes: lateThreshold,
        allow_urgent_insert: allowUrgent,
        allow_pause_intake: allowPauseIntake,
      } as any)
      .eq("id", clinicId);

    setSaving(false);
    if (error) {
      toast.error("Save failed: " + error.message);
    } else {
      setSaved(true);
      toast.success("Settings saved!");
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  if (!clinicId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No clinic found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSymbol} alt="inddd" className="h-8 w-8" />
            <h1 className="text-lg font-bold text-foreground">Queue Settings</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/console")}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Console
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-2xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Timing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Average Service Time (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={avgServiceMinutes}
                onChange={(e) => setAvgServiceMinutes(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Used for ETA estimates shown to patients.</p>
            </div>
            <div className="space-y-2">
              <Label>Late Threshold (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={lateThreshold}
                onChange={(e) => setLateThreshold(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Patients arriving later than this after their appointment are demoted in queue priority.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Queue Controls</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Urgent Insert</Label>
                <p className="text-xs text-muted-foreground">Allow marking tickets as urgent and inserting them ahead in queue.</p>
              </div>
              <Switch checked={allowUrgent} onCheckedChange={setAllowUrgent} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Pause Intake</Label>
                <p className="text-xs text-muted-foreground">Allow pausing new patient intake from the console.</p>
              </div>
              <Switch checked={allowPauseIntake} onCheckedChange={setAllowPauseIntake} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} className="min-w-32">
            {saving ? "Saving..." : saved ? (
              <><Check className="mr-2 h-4 w-4" />Saved</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Save</>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default QueueSettings;
