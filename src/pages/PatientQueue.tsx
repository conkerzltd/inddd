import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, RefreshCw, Users, Pause, XCircle } from "lucide-react";
import logoSymbol from "@/assets/logo-symbol.png";

interface PatientQueueView {
  status_badge: string | null;
  appointment_time: string | null;
  eligible_position: number | null;
  eta_min_minutes: number | null;
  eta_max_minutes: number | null;
  session_paused: boolean | null;
  intake_open: boolean | null;
  message: string | null;
  expected_window_start: string | null;
  expected_window_end: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatTimeAr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit", hour12: true });
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

export default function PatientQueue() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PatientQueueView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isValidToken = token && UUID_RE.test(token);

  const fetchQueue = useCallback(async () => {
    if (!isValidToken) return;
    try {
      const { data: result, error: rpcError } = await supabase.rpc("get_patient_queue_view", {
        p_token: token!,
      });
      if (rpcError) throw rpcError;
      setData(result as unknown as PatientQueueView);
      setError(null);
    } catch (e: any) {
      setError(e.message || "حدث خطأ. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }, [token, isValidToken]);

  useEffect(() => {
    if (!isValidToken) { setLoading(false); return; }
    fetchQueue();
  }, [fetchQueue, isValidToken]);

  useEffect(() => {
    if (!isValidToken) return;
    const start = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchQueue, 25_000);
    };
    const stop = () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
    const onVisibility = () => { document.hidden ? stop() : start(); };
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [fetchQueue, isValidToken]);

  // Set page direction to RTL
  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  }, []);

  if (!isValidToken) {
    return (
      <CenteredCard>
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-lg font-medium">رابط غير صالح</p>
          <p className="text-sm text-muted-foreground">يرجى التواصل مع العيادة للحصول على رابط جديد.</p>
        </div>
      </CenteredCard>
    );
  }

  if (loading) {
    return (
      <CenteredCard>
        <div className="space-y-4">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-6 w-64 mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
        </div>
      </CenteredCard>
    );
  }

  if (error) {
    return (
      <CenteredCard>
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => { setLoading(true); setError(null); fetchQueue(); }}>
            <RefreshCw className="h-4 w-4 ml-1" /> إعادة المحاولة
          </Button>
        </div>
      </CenteredCard>
    );
  }

  if (!data) return null;

  const badge = data.status_badge;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4" dir="rtl">
      <div className="w-full max-w-md mb-4 flex justify-center">
        <img src={logoSymbol} alt="inddd" className="h-10 w-10" />
      </div>

      {data.session_paused && (
        <div className="w-full max-w-md mb-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 flex items-center gap-2 text-sm">
          <Pause className="h-4 w-4 text-yellow-600 shrink-0" />
          <span>الطبيب متوقف مؤقتاً — مكانك محفوظ في قائمة الانتظار.</span>
        </div>
      )}
      {data.intake_open === false && (
        <div className="w-full max-w-md mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 flex items-center gap-2 text-sm">
          <XCircle className="h-4 w-4 text-destructive shrink-0" />
          <span>العيادة لم تعد تستقبل مرضى جدد اليوم.</span>
        </div>
      )}

      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <StatusBadge badge={badge} />
          <CardTitle className="text-xl mt-2">متابعة دورك</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {badge === "BOOKED" && <BookedView data={data} />}
          {badge === "WAITING" && <WaitingView data={data} />}
          {badge === "CALLED" && (
            <SimpleMessage
              text="تم نداءك! توجّه إلى غرفة الكشف الآن."
              icon="🔔"
              subtitle="يرجى الحضور فوراً حتى لا يُنادى مريض آخر."
            />
          )}
          {badge === "IN_SERVICE" && (
            <SimpleMessage text="أنت داخل الكشف الآن." icon="🩺" />
          )}
          {badge === "DONE" && (
            <SimpleMessage text="تمت زيارتك بنجاح. شكراً لك ونتمنى لك السلامة!" icon="✅" />
          )}
          {badge === "MISSED" && (
            <SimpleMessage
              text="تم نداءك ولم يتم العثور عليك."
              icon="⚠️"
              subtitle="يرجى التواصل مع السكرتارية لإعادة إدراجك."
            />
          )}
          {badge === "RETURNED" && (
            <SimpleMessage
              text="يتم إعادة إدراجك في قائمة الانتظار."
              icon="🔄"
              subtitle="انتظر من فضلك حتى يتم نداءك مرة أخرى."
            />
          )}
          {(badge === "CANCELLED" || badge === "CLOSED") && (
            <SimpleMessage
              text="تم إلغاء هذه الزيارة."
              icon="❌"
              subtitle="للاستفسار يرجى التواصل مع العيادة."
            />
          )}
          {!badge && data.message && <SimpleMessage text={data.message} icon="ℹ️" />}

          {data.message && badge && (
            <p className="text-sm text-muted-foreground text-center">{data.message}</p>
          )}

          <div className="flex justify-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => { setLoading(true); fetchQueue(); }}>
              <RefreshCw className="h-4 w-4 ml-1" /> تحديث
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        يتم تحديث البيانات تلقائياً كل ٢٥ ثانية
      </p>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ badge }: { badge: string | null }) {
  if (!badge) return null;
  const labels: Record<string, string> = {
    BOOKED: "محجوز",
    WAITING: "في قائمة الانتظار",
    CALLED: "تم النداء",
    IN_SERVICE: "داخل الكشف",
    DONE: "مكتمل",
    MISSED: "غير متواجد",
    RETURNED: "تم إعادة الإدراج",
    CANCELLED: "ملغي",
    CLOSED: "مغلق",
  };
  const variants: Record<string, string> = {
    BOOKED: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    WAITING: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
    CALLED: "bg-green-500/15 text-green-700 border-green-500/30",
    IN_SERVICE: "bg-purple-500/15 text-purple-700 border-purple-500/30",
    DONE: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    MISSED: "bg-red-500/15 text-red-700 border-red-500/30",
    RETURNED: "bg-orange-500/15 text-orange-700 border-orange-500/30",
    CANCELLED: "bg-muted text-muted-foreground border-border",
    CLOSED: "bg-muted text-muted-foreground border-border",
  };
  return (
    <div className="flex justify-center">
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${variants[badge] || ""}`}>
        {labels[badge] || badge}
      </span>
    </div>
  );
}

function BookedView({ data }: { data: PatientQueueView }) {
  return (
    <div className="space-y-3 text-center">
      {data.appointment_time && (
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground mb-1">موعد الحجز</p>
          <div className="flex items-center justify-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-bold text-xl">{formatTimeAr(data.appointment_time)}</span>
          </div>
        </div>
      )}
      {data.expected_window_start && data.expected_window_end && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm text-muted-foreground mb-1">الوقت المتوقع للحضور</p>
          <p className="font-medium">
            {formatTimeAr(data.expected_window_start)} – {formatTimeAr(data.expected_window_end)}
          </p>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        يرجى الحضور في الوقت المحدد لضمان مكانك في قائمة الانتظار.
      </p>
    </div>
  );
}

function WaitingView({ data }: { data: PatientQueueView }) {
  // Compute expected arrival time
  const etaTime = (() => {
    if (data.eta_min_minutes != null && data.eta_max_minutes != null) {
      const now = new Date();
      const minTime = addMinutes(now, data.eta_min_minutes);
      const maxTime = addMinutes(now, data.eta_max_minutes);
      return { min: minTime, max: maxTime };
    }
    return null;
  })();

  return (
    <div className="space-y-4 text-center">
      {data.eligible_position != null && (
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground mb-1">ترتيبك في قائمة الانتظار</p>
          <div className="flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-4xl font-bold text-primary">{data.eligible_position}</span>
          </div>
        </div>
      )}

      {data.eta_min_minutes != null && data.eta_max_minutes != null && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-sm text-muted-foreground">وقت الانتظار المتوقع</p>
          <p className="font-bold text-lg">
            {data.eta_min_minutes} – {data.eta_max_minutes} دقيقة
          </p>
          {etaTime && (
            <>
              <div className="border-t border-border pt-2">
                <p className="text-sm text-muted-foreground">الوقت المتوقع للدخول</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {etaTime.min.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit", hour12: true })}
                    {" – "}
                    {etaTime.max.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        يرجى البقاء في منطقة الانتظار حتى يتم نداءك.
      </p>
    </div>
  );
}

function SimpleMessage({ text, icon, subtitle }: { text: string; icon: string; subtitle?: string }) {
  return (
    <div className="text-center py-2">
      <span className="text-3xl">{icon}</span>
      <p className="mt-2 text-lg font-medium">{text}</p>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
