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
      toast.error("فشل الحفظ: " + error.message);
    } else {
      setSaved(true);
      toast.success("تم حفظ الإعدادات!");
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background">جاري التحميل...</div>;
  if (!clinicId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">لا توجد عيادة.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSymbol} alt="inddd" className="h-8 w-8" />
            <h1 className="text-lg font-bold text-foreground">إعدادات الطابور</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/console")}>
            <ArrowLeft className="ml-2 h-4 w-4" />العودة للوحة التحكم
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-2xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">التوقيت</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>متوسط وقت الخدمة (دقائق)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={avgServiceMinutes}
                onChange={(e) => setAvgServiceMinutes(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">يُستخدم لتقدير وقت الانتظار المعروض للمرضى.</p>
            </div>
            <div className="space-y-2">
              <Label>حد التأخير (دقائق)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={lateThreshold}
                onChange={(e) => setLateThreshold(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">المرضى الذين يصلون متأخرين أكثر من هذا الحد يتم تأخيرهم في الطابور.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">إعدادات الطابور</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>السماح بالإدراج العاجل</Label>
                <p className="text-xs text-muted-foreground">السماح بتحديد التذاكر كعاجلة وإدراجها في مقدمة الطابور.</p>
              </div>
              <Switch checked={allowUrgent} onCheckedChange={setAllowUrgent} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>السماح بإيقاف الاستقبال</Label>
                <p className="text-xs text-muted-foreground">السماح بإيقاف استقبال مرضى جدد من لوحة التحكم.</p>
              </div>
              <Switch checked={allowPauseIntake} onCheckedChange={setAllowPauseIntake} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} className="min-w-32">
            {saving ? "جاري الحفظ..." : saved ? (
              <><Check className="ml-2 h-4 w-4" />تم الحفظ</>
            ) : (
              <><Save className="ml-2 h-4 w-4" />حفظ</>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default QueueSettings;
