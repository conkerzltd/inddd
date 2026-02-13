import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/i18n/useLocale";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const { toast } = useToast();
  const [appleLoading, setAppleLoading] = useState(false);

  // Referral code state
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [referralMarketerId, setReferralMarketerId] = useState<string | null>(null);
  const [referralError, setReferralError] = useState("");

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


  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (result?.error) {
      toast({ title: "فشل تسجيل الدخول بـ Apple", description: String(result.error), variant: "destructive" });
      setAppleLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: "فشل تسجيل الدخول", description: error.message, variant: "destructive" });
    } else {
      navigate(localePath("/console"));
    }
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
      // Store marketer_id in localStorage for onboarding
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
          <Button
            variant="outline"
            className="w-full gap-2 min-h-[44px] mt-2"
            onClick={handleAppleSignIn}
            disabled={appleLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            {appleLoading ? "جاري الدخول…" : "تسجيل الدخول بـ Apple"}
          </Button>

          <div className="flex items-center gap-3 my-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">أو</span>
            <Separator className="flex-1" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">البريد الإلكتروني</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">كلمة المرور</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    dir="ltr"
                  />
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
                      id="signup-referral"
                      type="text"
                      placeholder="مثال: IND-XXXX"
                      value={referralCode}
                      onChange={(e) => {
                        setReferralCode(e.target.value.toUpperCase());
                        if (referralStatus !== "idle") setReferralStatus("idle");
                      }}
                      onBlur={handleReferralBlur}
                      required
                      dir="ltr"
                      className="pe-10"
                    />
                    <div className="absolute end-3 top-1/2 -translate-y-1/2">
                      {referralStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {referralStatus === "valid" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      {referralStatus === "invalid" && <XCircle className="h-4 w-4 text-destructive" />}
                    </div>
                  </div>
                  {referralStatus === "invalid" && (
                    <p className="text-xs text-destructive">{referralError}</p>
                  )}
                  {referralStatus === "valid" && (
                    <p className="text-xs text-primary">✓ كود الإحالة صالح</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">كلمة المرور</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="٦ أحرف على الأقل"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    dir="ltr"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || referralStatus !== "valid"}
                >
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
