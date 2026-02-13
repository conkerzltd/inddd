import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/inputs/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, clinicId, clinicStatus, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Referral code state
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [referralMarketerId, setReferralMarketerId] = useState<string | null>(null);
  const [referralError, setReferralError] = useState("");

  // Redirect already-logged-in users based on clinic state
  useEffect(() => {
    if (authLoading || !user) return;
    if (!clinicId) {
      navigate("/onboarding", { replace: true });
    } else if (clinicStatus === "active") {
      navigate("/console", { replace: true });
    } else {
      // pending or blocked → onboarding shows the right state
      navigate("/onboarding", { replace: true });
    }
  }, [authLoading, user, clinicId, clinicStatus, navigate]);

  const validateReferralCode = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setReferralStatus("idle");
      setReferralMarketerId(null);
      setReferralError("");
      return;
    }
    setReferralStatus("checking");
    const { data, error } = await supabase.rpc("validate_referral_code", { p_code: trimmed });
    if (error) {
      setReferralStatus("invalid");
      setReferralError("حدث خطأ أثناء التحقق");
      setReferralMarketerId(null);
      return;
    }
    const result = data as any;
    if (result?.valid) {
      setReferralStatus("valid");
      setReferralMarketerId(result.marketer_id);
      setReferralError("");
    } else {
      setReferralStatus("invalid");
      setReferralMarketerId(null);
      setReferralError(result?.message || "كود الإحالة غير صالح");
    }
  };

  const handleReferralBlur = () => {
    if (referralCode.trim()) {
      validateReferralCode(referralCode);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: "فشل تسجيل الدخول", description: error.message, variant: "destructive" });
    }
    // useEffect above handles redirect after auth state updates
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (referralStatus !== "valid" || !referralMarketerId) {
      toast({ title: "كود الإحالة مطلوب", description: "يرجى إدخال كود إحالة صالح", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: "فشل إنشاء الحساب", description: error.message, variant: "destructive" });
    } else {
      localStorage.setItem("pending_marketer_id", referralMarketerId);
      toast({ title: "تحقق من بريدك الإلكتروني", description: "أرسلنا لك رابط التحقق." });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <CardDescription>نظام إدارة قائمة الانتظار</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">البريد الإلكتروني</Label>
                  <Input id="signin-email" type="email" placeholder="you@clinic.com" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">كلمة المرور</Label>
                  <PasswordInput id="signin-password" value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "جاري الدخول…" : "تسجيل الدخول"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-referral">كود الإحالة *</Label>
                  <div className="relative">
                    <Input
                      id="signup-referral" type="text" placeholder="مثال: IND-XXXX"
                      value={referralCode}
                      onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); if (referralStatus !== "idle") setReferralStatus("idle"); }}
                      onBlur={handleReferralBlur} required dir="ltr" className="pe-10"
                    />
                    <div className="absolute end-3 top-1/2 -translate-y-1/2">
                      {referralStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {referralStatus === "valid" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      {referralStatus === "invalid" && <XCircle className="h-4 w-4 text-destructive" />}
                    </div>
                  </div>
                  {referralStatus === "invalid" && <p className="text-xs text-destructive">{referralError}</p>}
                  {referralStatus === "valid" && <p className="text-xs text-primary">✓ كود الإحالة صالح</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                  <Input id="signup-email" type="email" placeholder="you@clinic.com" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">كلمة المرور</Label>
                  <PasswordInput id="signup-password" placeholder="٦ أحرف على الأقل" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} dir="ltr" />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || referralStatus !== "valid"}>
                  {isLoading ? "جاري الإنشاء…" : "إنشاء حساب"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
