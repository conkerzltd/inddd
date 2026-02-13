import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowRight, Search, KeyRound, Loader2 } from "lucide-react";

interface FoundUser {
  id: string;
  email: string;
}

const UserManagement = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const { toast } = useToast();

  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const handleSearch = async () => {
    const trimmed = searchEmail.trim().toLowerCase();
    if (!trimmed) return;
    setSearching(true);
    setSearchError("");
    setFoundUser(null);

    // We query user_roles to find any user with that email indirectly
    // Actually we need an edge function or RPC for this too.
    // For simplicity, we'll use the admin-update-user edge function approach
    // But first let's search via auth.users through an RPC
    // Since superadmin can view all roles, let's search by matching
    // We'll call a simple lookup. For now, let the superadmin type the email
    // and we trust it exists.

    // Actually, let's just try to find the user via the edge function
    // Or we can let superadmin enter email and user_id manually.
    // Better: create a simple list from user_roles joined approach.

    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("user_id, role, clinic_id");

    if (error) {
      setSearchError("خطأ في البحث");
      setSearching(false);
      return;
    }

    // We don't have direct access to auth.users from client.
    // Let's just let the admin enter the email and we pass it through.
    // The edge function uses service_role to find and update.
    // For the UI, we'll show a simpler flow: enter email → change password.

    setFoundUser({ id: "", email: trimmed });
    setSearching(false);
  };

  const openPasswordDialog = () => {
    setNewPassword("");
    setConfirmPassword("");
    setDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "كلمة المرور قصيرة",
        description: "يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "كلمات المرور غير متطابقة",
        variant: "destructive",
      });
      return;
    }

    setChanging(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await supabase.functions.invoke("admin-update-user", {
        body: {
          target_email: foundUser?.email,
          new_password: newPassword,
        },
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      const resData = res.data as any;
      if (resData?.error) {
        throw new Error(resData.error);
      }

      toast({ title: "تم تغيير كلمة المرور بنجاح ✓" });
      setDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "فشل تغيير كلمة المرور",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">
              إدارة المستخدمين
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(localePath("/owner-portal"))}
          >
            <ArrowRight className="h-4 w-4 me-1" />
            العودة
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              تغيير كلمة مرور مستخدم
            </CardTitle>
            <CardDescription>
              أدخل البريد الإلكتروني للمستخدم لتغيير كلمة المرور
            </CardDescription>
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
              <Button
                onClick={openPasswordDialog}
                disabled={!searchEmail.trim()}
              >
                <KeyRound className="h-4 w-4 me-1" />
                تغيير كلمة المرور
              </Button>
            </div>

            {searchError && (
              <p className="text-sm text-destructive">{searchError}</p>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
            <DialogDescription>
              تغيير كلمة المرور للمستخدم:{" "}
              <span className="font-mono text-foreground" dir="ltr">
                {searchEmail.trim()}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>كلمة المرور الجديدة</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                dir="ltr"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>تأكيد كلمة المرور</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                dir="ltr"
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={changing}
            >
              إلغاء
            </Button>
            <Button onClick={handleChangePassword} disabled={changing}>
              {changing && <Loader2 className="h-4 w-4 me-1 animate-spin" />}
              تأكيد التغيير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
