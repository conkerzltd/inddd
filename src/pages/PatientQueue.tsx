import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, RefreshCw, Users, Pause, XCircle } from "lucide-react";

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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
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

  if (!isValidToken) {
    return (
      <CenteredCard>
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-lg font-medium">رابط غير صالح. يرجى التواصل مع العيادة.</p>
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
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      {data.session_paused && (
        <div className="w-full max-w-md mb-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 flex items-center gap-2 text-sm">
          <Pause className="h-4 w-4 text-yellow-600 shrink-0" />
          <span>الطبيب متوقف مؤقتاً. مكانك محفوظ.</span>
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
          <CardTitle className="text-xl mt-2">حالة الطابور</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(badge === "BOOKED") && <BookedView data={data} />}
          {badge === "WAITING" && <WaitingView data={data} />}
          {badge === "CALLED" && <SimpleMessage text="تم نداءك — توجه الآن من فضلك." icon="🔔" />}
          {badge === "IN_SERVICE" && <SimpleMessage text="أنت في الخدمة الآن." icon="🩺" />}
          {badge === "DONE" && <SimpleMessage text="تمت زيارتك. شكراً لك!" icon="✅" />}
          {badge === "MISSED" && <SimpleMessage text="تم نداءك ولم يتم العثور عليك. تواصل مع السكرتارية." icon="⚠️" />}
          {badge === "RETURNED" && <SimpleMessage text="يتم إعادة إدراجك في الطابور. انتظر من فضلك." icon="🔄" />}
          {(badge === "CANCELLED" || badge === "CLOSED") && (
            <SimpleMessage text="تم إلغاء/إغلاق هذه الزيارة. تواصل مع العيادة." icon="❌" />
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
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
    WAITING: "منتظر",
    CALLED: "تم النداء",
    IN_SERVICE: "في الخدمة",
    DONE: "مكتمل",
    MISSED: "لم يحضر",
    RETURNED: "عاد",
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
        <div className="flex items-center justify-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{formatTime(data.appointment_time)}</span>
        </div>
      )}
      {data.expected_window_start && data.expected_window_end && (
        <p className="text-sm text-muted-foreground">
          الفترة المتوقعة: {formatTime(data.expected_window_start)} – {formatTime(data.expected_window_end)}
        </p>
      )}
    </div>
  );
}

function WaitingView({ data }: { data: PatientQueueView }) {
  return (
    <div className="space-y-3 text-center">
      {data.eligible_position != null && (
        <div className="flex items-center justify-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-3xl font-bold">#{data.eligible_position}</span>
          <span className="text-sm text-muted-foreground">في الطابور</span>
        </div>
      )}
      {data.eta_min_minutes != null && data.eta_max_minutes != null && (
        <p className="text-sm text-muted-foreground">
          وقت الانتظار المتوقع: {data.eta_min_minutes}–{data.eta_max_minutes} دقيقة
        </p>
      )}
    </div>
  );
}

function SimpleMessage({ text, icon }: { text: string; icon: string }) {
  return (
    <div className="text-center py-2">
      <span className="text-3xl">{icon}</span>
      <p className="mt-2 text-lg font-medium">{text}</p>
    </div>
  );
}
