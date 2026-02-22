import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/i18n/useLocale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowRight, KeyRound, Loader2, Users, Bell } from "lucide-react";
import { PasswordInput } from "@/components/inputs/PasswordInput";

interface FoundUser {
  id: string;
  email: string;
}

const UserManagement = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── User password reset ──
  const [searchEmail, setSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  // ── Marketer password reset ──
  const [marketerCode, setMarketerCode] = useState("");
  const [marketerPassword, setMarketerPassword] = useState("");
  const [marketerConfirm, setMarketerConfirm] = useState("");
  const [marketerChanging, setMarketerChanging] = useState(false);

  // ── Password reset requests ──
  const { data: resetRequests = [] } = useQuery({
    queryKey: ["marketer-reset-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketer_password_reset_requests")
        .select("*, marketer:marketers!marketer_password_reset_requests_marketer_id_fkey(name, referral_code)")
        .eq("status", "pending")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const openPasswordDialog = () => {
    if (!searchEmail.trim()) return;
    setFoundUser({ id: "", email: searchEmail.trim().toLowerCase() });
    setNewPassword("");
    setConfirmPassword("");
    setDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "كلمة المرور قصيرة", description: "يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "كلمات المرور غير متطابقة", variant: "destructive" });
      return;
    }
    setChanging(true);
    try {
      const res = await supabase.functions.invoke("admin-update-user", {
        body: { target_email: foundUser?.email, new_password: newPassword },
      });
      if (res.error) throw new Error(res.error.message);
      const resData = res.data as any;
      if (resData?.error) throw new Error(resData.error);
      toast({ title: "تم تغيير كلمة المرور بنجاح ✓" });
      setDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "فشل تغيير كلمة المرور", description: err.message, variant: "destructive" });
    } finally {
      setChanging(false);
    }
  };

  const handleMarketerReset = async () => {
    if (!marketerCode.trim()) {
      toast({ title: "يرجى إدخال كود المسوق", variant: "destructive" });
      return;
    }
    if (marketerPassword.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (marketerPassword !== marketerConfirm) {
      toast({ title: "كلمات المرور غير متطابقة", variant: "destructive" });
      return;
    }
    setMarketerChanging(true);
    try {
      const res = await supabase.functions.invoke("marketer-auth", {
        body: {
          action: "admin_reset",
          referral_code: marketerCode.trim(),
          new_password: marketerPassword,
        },
      });
      const resData = res.data as any;
      if (res.error || resData?.error) {
        throw new Error(resData?.error || res.error?.message);
      }
      toast({ title: "تم إعادة تعيين كلمة مرور المسوق بنجاح ✓" });
      setMarketerCode("");
      setMarketerPassword("");
      setMarketerConfirm("");
      queryClient.invalidateQueries({ queryKey: ["marketer-reset-requests"] });
    } catch (err: any) {
      toast({ title: "فشل إعادة التعيين", description: err.message, variant: "destructive" });
    } finally {
      setMarketerChanging(false);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">إدارة المستخدمين</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(localePath("/ad"))}>
            <ArrowRight className="h-4 w-4 me-1" />العودة
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* User password reset */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              تغيير كلمة مرور مستخدم
            </CardTitle>
            <CardDescription>أدخل البريد الإلكتروني للمستخدم لتغيير كلمة المرور</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="user@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                dir="ltr"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && openPasswordDialog()}
              />
              <Button onClick={openPasswordDialog} disabled={!searchEmail.trim()}>
                <KeyRound className="h-4 w-4 me-1" />تغيير كلمة المرور
              </Button>
            </div>
            {searchError && <p className="text-sm text-destructive">{searchError}</p>}
          </CardContent>
        </Card>

        <Separator />

        {/* Marketer password reset */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              إعادة تعيين كلمة مرور المسوق
            </CardTitle>
            <CardDescription>أدخل كود المسوق وكلمة المرور المؤقتة الجديدة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>كود المسوق</Label>
              <Input
                value={marketerCode}
                onChange={(e) => setMarketerCode(e.target.value.toUpperCase())}
                placeholder="مثال: IND-XXXX"
                dir="ltr"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور المؤقتة</Label>
              <PasswordInput
                value={marketerPassword}
                onChange={(e) => setMarketerPassword(e.target.value)}
                dir="ltr"
                placeholder="6 أحرف على الأقل"
              />
            </div>
            <div className="space-y-2">
              <Label>تأكيد كلمة المرور</Label>
              <PasswordInput
                value={marketerConfirm}
                onChange={(e) => setMarketerConfirm(e.target.value)}
                dir="ltr"
                placeholder="أعد كتابة كلمة المرور"
              />
            </div>
            <Button
              onClick={handleMarketerReset}
              disabled={marketerChanging || !marketerCode.trim() || !marketerPassword}
              className="w-full"
            >
              {marketerChanging && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              إعادة تعيين كلمة مرور المسوق
            </Button>
          </CardContent>
        </Card>

        {/* Pending reset requests */}
        {resetRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-5 w-5 text-destructive" />
                طلبات إعادة تعيين معلّقة ({resetRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {resetRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <p className="font-semibold text-sm">{req.marketer?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{req.marketer?.referral_code}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(req.requested_at)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMarketerCode(req.marketer?.referral_code || "");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    إعادة تعيين
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      {/* User password dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
            <DialogDescription>
              تغيير كلمة المرور للمستخدم: <span className="font-mono text-foreground" dir="ltr">{searchEmail.trim()}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>كلمة المرور الجديدة</Label>
              <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="ltr" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>تأكيد كلمة المرور</Label>
              <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} dir="ltr" placeholder="••••••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={changing}>إلغاء</Button>
            <Button onClick={handleChangePassword} disabled={changing}>
              {changing && <Loader2 className="h-4 w-4 me-1 animate-spin" />}تأكيد التغيير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
