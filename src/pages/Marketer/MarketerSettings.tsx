import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/inputs/PasswordInput";
import { Users, ArrowRight, Loader2, AlertTriangle, Settings } from "lucide-react";

const MarketerSettings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const { data: crm } = useQuery({
    queryKey: ["marketer-crm"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_marketer_crm");
      if (error) throw error;
      return data as any;
    },
  });

  const mustSetPassword = crm?.must_set_password === true;

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "كلمات المرور غير متطابقة", variant: "destructive" });
      return;
    }
    setChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Clear must_set_password flag
      if (mustSetPassword) {
        await supabase.rpc("marketer_clear_must_set_password");
        queryClient.invalidateQueries({ queryKey: ["marketer-crm"] });
      }

      toast({ title: "تم تغيير كلمة المرور بنجاح ✓" });
      setNewPassword("");
      setConfirmPassword("");

      if (mustSetPassword) {
        navigate("/m/dashboard", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "فشل تغيير كلمة المرور", description: err.message, variant: "destructive" });
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">الإعدادات</h1>
          </div>
          {!mustSetPassword && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/m/dashboard")}>
              <ArrowRight className="h-4 w-4 me-1" />العودة
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {mustSetPassword && (
          <Card className="border-destructive">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">يجب تغيير كلمة المرور</p>
                <p className="text-sm text-muted-foreground">
                  تم إعادة تعيين كلمة المرور بواسطة الإدارة. يرجى إنشاء كلمة مرور جديدة للمتابعة.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">تغيير كلمة المرور</CardTitle>
            <CardDescription>أدخل كلمة مرور جديدة (6 أحرف على الأقل)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>كلمة المرور الجديدة</Label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                dir="ltr"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>تأكيد كلمة المرور</Label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                dir="ltr"
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              />
            </div>
            <Button onClick={handleChangePassword} disabled={changing} className="w-full">
              {changing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {mustSetPassword ? "تعيين كلمة المرور والمتابعة" : "تغيير كلمة المرور"}
            </Button>
          </CardContent>
        </Card>

        {!mustSetPassword && (
          <Button variant="outline" className="w-full" onClick={signOut}>
            تسجيل الخروج
          </Button>
        )}
      </main>
    </div>
  );
};

export default MarketerSettings;
