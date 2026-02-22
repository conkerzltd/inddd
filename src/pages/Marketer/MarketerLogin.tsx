import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/inputs/PasswordInput";
import { Users, Loader2, ArrowRight } from "lucide-react";

function deriveSyntheticEmail(code: string): string {
  return `mkt_${code.toLowerCase().trim()}@inddd.local`;
}

type Step = "code" | "login" | "setup" | "forgot";

const MarketerLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCheckCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_marketer_login_state", {
        p_referral_code: code.trim(),
      });
      if (error) throw error;
      const result = data as any;
      if (!result.valid) {
        toast({ title: "كود المسوق غير صالح", variant: "destructive" });
        return;
      }
      if (result.status === "blocked") {
        toast({ title: "هذا الحساب موقوف", description: "يرجى التواصل مع الإدارة", variant: "destructive" });
        return;
      }
      if (result.status !== "active") {
        toast({ title: "حساب المسوق غير مفعّل بعد", variant: "destructive" });
        return;
      }
      setStep(result.has_account ? "login" : "setup");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    try {
      const email = deriveSyntheticEmail(code);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "خطأ في تسجيل الدخول", description: "كلمة المرور غير صحيحة", variant: "destructive" });
        return;
      }
      navigate("/m/dashboard");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    if (password.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "كلمات المرور غير متطابقة", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("marketer-auth", {
        body: { action: "setup", referral_code: code.trim(), new_password: password },
      });
      const resData = res.data as any;
      if (res.error || resData?.error) {
        throw new Error(resData?.error || res.error?.message);
      }
      // Now sign in
      const email = deriveSyntheticEmail(code);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/m/dashboard");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!code.trim()) {
      toast({ title: "يرجى إدخال كود المسوق أولاً", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("request_marketer_password_reset", {
        p_referral_code: code.trim(),
      });
      if (error) throw error;
      const result = data as any;
      toast({ title: result.message || "تم إرسال طلب إعادة التعيين للإدارة." });
      setStep("code");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">لوحة المسوق</CardTitle>
          <CardDescription>
            {step === "code" && "أدخل كود المسوق الخاص بك"}
            {step === "login" && "أدخل كلمة المرور لتسجيل الدخول"}
            {step === "setup" && "إنشاء كلمة مرور لأول مرة"}
            {step === "forgot" && "طلب إعادة تعيين كلمة المرور"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Code input - always visible */}
          <div className="space-y-2">
            <Label>كود المسوق</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="مثال: IND-XXXX"
              dir="ltr"
              className="text-center font-mono tracking-wider"
              disabled={step !== "code" && step !== "forgot"}
              onKeyDown={(e) => e.key === "Enter" && step === "code" && handleCheckCode()}
            />
          </div>

          {step === "code" && (
            <Button className="w-full" onClick={handleCheckCode} disabled={loading || !code.trim()}>
              {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              متابعة
            </Button>
          )}

          {step === "login" && (
            <>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={loading || !password}>
                {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                تسجيل الدخول
              </Button>
              <div className="flex justify-between">
                <Button variant="link" size="sm" className="px-0 text-xs" onClick={() => { setStep("code"); setPassword(""); }}>
                  <ArrowRight className="h-3 w-3 me-1" />تغيير الكود
                </Button>
                <Button variant="link" size="sm" className="px-0 text-xs" onClick={() => setStep("forgot")}>
                  نسيت كلمة المرور؟
                </Button>
              </div>
            </>
          )}

          {step === "setup" && (
            <>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  placeholder="6 أحرف على الأقل"
                />
              </div>
              <div className="space-y-2">
                <Label>تأكيد كلمة المرور</Label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  dir="ltr"
                  placeholder="أعد كتابة كلمة المرور"
                  onKeyDown={(e) => e.key === "Enter" && handleSetup()}
                />
              </div>
              <Button className="w-full" onClick={handleSetup} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                إنشاء الحساب والدخول
              </Button>
              <Button variant="link" size="sm" className="px-0 text-xs" onClick={() => { setStep("code"); setPassword(""); setConfirmPassword(""); }}>
                <ArrowRight className="h-3 w-3 me-1" />تغيير الكود
              </Button>
            </>
          )}

          {step === "forgot" && (
            <>
              <p className="text-sm text-muted-foreground">
                سيتم إرسال طلب إعادة تعيين كلمة المرور للإدارة. بعد الموافقة ستتمكن من إنشاء كلمة مرور جديدة.
              </p>
              <Button className="w-full" onClick={handleForgotPassword} disabled={loading || !code.trim()}>
                {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                إرسال طلب إعادة التعيين
              </Button>
              <Button variant="link" size="sm" className="px-0 text-xs" onClick={() => setStep("code")}>
                <ArrowRight className="h-3 w-3 me-1" />العودة
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketerLogin;
