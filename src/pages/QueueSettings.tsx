import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Check, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logoSymbol from "@/assets/logo-symbol.png";
import { PasswordInput } from "@/components/inputs/PasswordInput";
import { cn } from "@/lib/utils";

const QueueSettings = () => {
  const { clinicId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [serialId, setSerialId] = useState<string | null>(null);

  const [avgServiceMinutes, setAvgServiceMinutes] = useState(10);
  const [lateThreshold, setLateThreshold] = useState(10);
  const [allowUrgent, setAllowUrgent] = useState(true);
  const [allowPauseIntake, setAllowPauseIntake] = useState(true);

  useEffect(() => {
    if (!clinicId) return;
    supabase
      .from("clinics")
      .select("avg_service_time_seed_minutes, late_threshold_minutes, allow_urgent_insert, allow_pause_intake, serial_id")
      .eq("id", clinicId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setAvgServiceMinutes((data as any).avg_service_time_seed_minutes ?? 10);
        setLateThreshold(data.late_threshold_minutes ?? 10);
        setAllowUrgent((data as any).allow_urgent_insert ?? true);
        setAllowPauseIntake((data as any).allow_pause_intake ?? true);
        setSerialId((data as any).serial_id ?? null);
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
            <h1 className="text-lg font-bold text-foreground">إعدادات قائمة الانتظار</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/console")}>
            <ArrowLeft className="ml-2 h-4 w-4" />العودة للوحة التحكم
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-2xl space-y-6">
        {serialId && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">رقم العيادة</p>
                <p className="text-lg font-mono font-bold text-foreground">{serialId}</p>
              </div>
              <Badge variant="outline" className="text-xs">للقراءة فقط</Badge>
            </CardContent>
          </Card>
        )}
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
              <p className="text-xs text-muted-foreground">المرضى الذين يصلون متأخرين أكثر من هذا الحد يتم تأخيرهم في قائمة الانتظار.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">إعدادات قائمة الانتظار</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>السماح بالإدراج العاجل</Label>
                <p className="text-xs text-muted-foreground">السماح بتحديد التذاكر كعاجلة وإدراجها في مقدمة قائمة الانتظار.</p>
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

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="min-w-32">
            {saving ? "جاري الحفظ..." : saved ? (
              <><Check className="ml-2 h-4 w-4" />تم الحفظ</>
            ) : (
              <><Save className="ml-2 h-4 w-4" />حفظ</>
            )}
          </Button>
        </div>

        <ChangePasswordCard />
      </main>
    </div>
  );
};

/* ─── Password Strength ─── */
const getPasswordStrength = (pw: string): { level: number; label: string; color: string } => {
  if (!pw) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { level: 1, label: "ضعيفة", color: "bg-destructive" };
  if (score <= 3) return { level: 2, label: "متوسطة", color: "bg-warning" };
  return { level: 3, label: "قوية", color: "bg-primary" };
};

/* ─── Change Password Card ─── */
const ChangePasswordCard = () => {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const strength = getPasswordStrength(newPw);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      toast.error("كلمة المرور الجديدة يجب أن تكون ٨ أحرف على الأقل");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقتين");
      return;
    }

    setChangingPw(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast.error("تعذر التحقق من المستخدم الحالي");
      setChangingPw(false);
      return;
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    });

    if (signInErr) {
      toast.error("كلمة المرور الحالية غير صحيحة");
      setChangingPw(false);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    setChangingPw(false);

    if (updateErr) {
      toast.error("فشل تحديث كلمة المرور: " + updateErr.message);
    } else {
      toast.success("تم تغيير كلمة المرور بنجاح");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          الأمان — تغيير كلمة المرور
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label>كلمة المرور الحالية</Label>
            <PasswordInput value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>كلمة المرور الجديدة</Label>
            <PasswordInput value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} placeholder="٨ أحرف على الأقل" dir="ltr" />
            {newPw && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        i <= strength.level ? strength.color : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  قوة كلمة المرور: <span className="font-medium text-foreground">{strength.label}</span>
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>تأكيد كلمة المرور الجديدة</Label>
            <PasswordInput value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={8} dir="ltr" />
          </div>
          <div className="flex justify-end pb-2">
            <Button type="submit" disabled={changingPw} className="min-w-32">
              {changingPw ? "جاري التحديث..." : "تغيير كلمة المرور"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default QueueSettings;
