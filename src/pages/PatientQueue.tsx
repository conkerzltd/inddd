import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Clock, RefreshCw, Users, Pause, XCircle, MapPin, Timer } from "lucide-react";
import logoSymbol from "@/assets/logo-symbol.png";
import { playQueueChime } from "@/utils/chimeSound";

/* ───── types ───── */
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
  clinic_name_ar: string | null;
  clinic_lat: number | null;
  clinic_lng: number | null;
  clinic_maps_url: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ───── helpers ───── */
function fmtTimeAr(iso: string): string {
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit", hour12: true });
}

function addMin(d: Date, m: number) {
  return new Date(d.getTime() + m * 60_000);
}

function calcRemaining(targetIso: string): string | null {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `${h} ساعة و ${m} دقيقة و ${s} ثانية`;
  if (m > 0) return `${m} دقيقة و ${s} ثانية`;
  return `${s} ثانية`;
}

/* ═══════════════ main component ═══════════════ */
export default function PatientQueue() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PatientQueueView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBadgeRef = useRef<string | null>(null);

  const isValidToken = token && UUID_RE.test(token);

  /* ── fetch ── */
  const fetchQueue = useCallback(async () => {
    if (!isValidToken) return;
    try {
      const { data: result, error: rpcError } = await supabase.rpc("get_patient_queue_view", { p_token: token! });
      if (rpcError) throw rpcError;
      const view = result as unknown as PatientQueueView;

      if (view.status_badge === "CALLED" && prevBadgeRef.current !== null && prevBadgeRef.current !== "CALLED") {
        playQueueChime();
      }
      prevBadgeRef.current = view.status_badge;
      setData(view);
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

  /* ── adaptive polling ── */
  useEffect(() => {
    if (!isValidToken) return;
    const ms = data?.status_badge === "WAITING" ? 10_000 : 25_000;
    const start = () => { if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = setInterval(fetchQueue, ms); };
    const stop = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
    const vis = () => { document.hidden ? stop() : start(); };
    document.addEventListener("visibilitychange", vis);
    start();
    return () => { stop(); document.removeEventListener("visibilitychange", vis); };
  }, [fetchQueue, isValidToken, data?.status_badge]);

  /* ── remaining‑time live countdown every 1s ── */
  const createdAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!data) return;
    // For WAITING: use ETA max as dynamic target; for BOOKED: use appointment_time
    let target = data.appointment_time || data.expected_window_start;
    if (!target && data.eta_max_minutes != null) {
      target = addMin(new Date(), data.eta_max_minutes).toISOString();
    }
    if (!target) { setRemaining(null); setProgress(0); return; }

    const targetMs = new Date(target).getTime();
    // Use created_at or first fetch time as the "start" anchor for progress
    if (!createdAtRef.current) createdAtRef.current = Date.now();
    const startMs = createdAtRef.current;
    const totalDuration = targetMs - startMs;

    const tick = () => {
      setRemaining(calcRemaining(target));
      if (totalDuration <= 0) { setProgress(100); return; }
      const elapsed = Date.now() - startMs;
      setProgress(Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)));
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [data]);

  /* ── RTL ── */
  useEffect(() => { document.documentElement.dir = "rtl"; document.documentElement.lang = "ar"; }, []);

  /* ── guards ── */
  if (!isValidToken) return <Centered><AlertCircle className="h-10 w-10 text-destructive mx-auto" /><p className="text-lg font-bold mt-3">رابط غير صالح</p><p className="text-sm text-muted-foreground">يرجى التواصل مع العيادة للحصول على رابط جديد.</p></Centered>;
  if (loading) return <Centered><Skeleton className="h-8 w-40 mx-auto" /><Skeleton className="h-6 w-64 mx-auto mt-3" /><Skeleton className="h-6 w-48 mx-auto mt-2" /></Centered>;
  if (error) return <Centered><AlertCircle className="h-10 w-10 text-destructive mx-auto" /><p className="text-muted-foreground mt-3">{error}</p><Button variant="outline" className="mt-3" onClick={() => { setLoading(true); setError(null); fetchQueue(); }}><RefreshCw className="h-4 w-4 ml-1" /> إعادة المحاولة</Button></Centered>;
  if (!data) return null;

  const badge = data.status_badge;
  const clinicName = data.clinic_name_ar;
  const mapsUrl = data.clinic_maps_url || (data.clinic_lat && data.clinic_lng ? `https://www.google.com/maps?q=${data.clinic_lat},${data.clinic_lng}` : null);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 pt-6" dir="rtl">
      {/* logo */}
      <img src={logoSymbol} alt="inddd" className="h-10 w-10 mb-4" />

      {/* banners */}
      {data.session_paused && <Banner icon={<Pause className="h-4 w-4 text-yellow-600 shrink-0" />} className="border-yellow-500/30 bg-yellow-500/10">الطبيب متوقف مؤقتاً — مكانك محفوظ في قائمة الانتظار.</Banner>}
      {data.intake_open === false && <Banner icon={<XCircle className="h-4 w-4 text-destructive shrink-0" />} className="border-destructive/30 bg-destructive/10">العيادة لم تعد تستقبل مرضى جدد اليوم.</Banner>}

      {/* main card */}
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 pb-5 space-y-5">
          {/* status badge */}
          <StatusChip badge={badge} />

          {/* per‑status body */}
          {badge === "BOOKED" && <BookedBody data={data} remaining={remaining} progress={progress} />}
          {badge === "WAITING" && <WaitingBody data={data} remaining={remaining} progress={progress} />}
          {badge === "CALLED" && <Msg icon="🔔" text="تم نداءك! توجّه إلى غرفة الكشف الآن." sub="يرجى الحضور فوراً حتى لا يُنادى مريض آخر." />}
          {badge === "IN_SERVICE" && <Msg icon="🩺" text="أنت داخل الكشف الآن." />}
          {badge === "DONE" && <Msg icon="✅" text="تمت زيارتك بنجاح. شكراً لك ونتمنى لك السلامة!" />}
          {badge === "MISSED" && <Msg icon="⚠️" text="تم نداءك ولم يتم العثور عليك." sub="يرجى التواصل مع السكرتارية لإعادة إدراجك." />}
          {badge === "RETURNED" && <Msg icon="🔄" text="يتم إعادة إدراجك في قائمة الانتظار." sub="انتظر من فضلك حتى يتم نداءك مرة أخرى." />}
          {(badge === "CANCELLED" || badge === "CLOSED") && <Msg icon="❌" text="تم إلغاء هذه الزيارة." sub="للاستفسار يرجى التواصل مع العيادة." />}
          {!badge && data.message && <Msg icon="ℹ️" text={data.message} />}

          {/* warning for active statuses */}
          {(badge === "BOOKED" || badge === "WAITING") && (
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              يرجى القدوم في الموعد المحدد لتجنب فقدان دورك في قائمة الانتظار.
            </p>
          )}

          {/* clinic footer */}
          {(clinicName || mapsUrl) && (
            <div className="border-t border-border pt-4 space-y-2 text-center">
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                  <MapPin className="h-4 w-4" /> موقع العيادة
                </a>
              )}
              {clinicName && <p className="text-sm text-muted-foreground">نشكركم — {clinicName}</p>}
            </div>
          )}

          {/* refresh */}
          <div className="flex justify-center pt-1">
            <Button variant="ghost" size="sm" onClick={() => { setLoading(true); fetchQueue(); }}>
              <RefreshCw className="h-4 w-4 ml-1" /> تحديث
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4 text-center">يتم تحديث البيانات تلقائياً</p>
    </div>
  );
}

/* ═══════════════ sub‑components ═══════════════ */

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md"><CardContent className="pt-6 text-center">{children}</CardContent></Card>
    </div>
  );
}

function Banner({ children, icon, className }: { children: React.ReactNode; icon: React.ReactNode; className: string }) {
  return <div className={`w-full max-w-md mb-3 rounded-lg border p-3 flex items-center gap-2 text-sm ${className}`}>{icon}<span>{children}</span></div>;
}

function StatusChip({ badge }: { badge: string | null }) {
  if (!badge) return null;
  const labels: Record<string, string> = { BOOKED: "تم تأكيد الحجز", WAITING: "في قائمة الانتظار", CALLED: "تم النداء", IN_SERVICE: "داخل الكشف", DONE: "مكتمل", MISSED: "غير متواجد", RETURNED: "تم إعادة الإدراج", CANCELLED: "ملغي", CLOSED: "مغلق" };
  const styles: Record<string, string> = { BOOKED: "bg-blue-500/15 text-blue-700 border-blue-500/30", WAITING: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30", CALLED: "bg-green-500/15 text-green-700 border-green-500/30", IN_SERVICE: "bg-purple-500/15 text-purple-700 border-purple-500/30", DONE: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", MISSED: "bg-red-500/15 text-red-700 border-red-500/30", RETURNED: "bg-orange-500/15 text-orange-700 border-orange-500/30", CANCELLED: "bg-muted text-muted-foreground border-border", CLOSED: "bg-muted text-muted-foreground border-border" };
  return <div className="flex justify-center"><span className={`inline-flex items-center rounded-full border px-4 py-1 text-sm font-semibold ${styles[badge] || ""}`}>{labels[badge] || badge}</span></div>;
}

function BookedBody({ data, remaining, progress }: { data: PatientQueueView; remaining: string | null; progress: number }) {
  return (
    <div className="space-y-3 text-center">
      {data.appointment_time && (
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground mb-1">الوقت المتوقع للكشف</p>
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-bold text-2xl">{fmtTimeAr(data.appointment_time)}</span>
          </div>
        </div>
      )}
      {data.expected_window_start && data.expected_window_end && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm text-muted-foreground mb-1">الفترة المتوقعة</p>
          <p className="font-medium">{fmtTimeAr(data.expected_window_start)} – {fmtTimeAr(data.expected_window_end)}</p>
        </div>
      )}
      {remaining && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <p className="text-sm"><span className="text-muted-foreground">الوقت المتبقي: </span><span className="font-semibold">{remaining}</span></p>
          </div>
          <Progress value={progress} className="h-2 [direction:ltr]" />
          <p className="text-xs text-muted-foreground">{Math.round(progress)}٪ من الوقت انقضى</p>
        </div>
      )}
      {data.eligible_position != null && (
        <p className="text-sm text-muted-foreground">رقم الحجز: <span className="font-bold text-foreground">{data.eligible_position}</span></p>
      )}
    </div>
  );
}

function WaitingBody({ data, remaining, progress }: { data: PatientQueueView; remaining: string | null; progress: number }) {
  const etaTime = (() => {
    if (data.eta_min_minutes != null && data.eta_max_minutes != null) {
      const now = new Date();
      return { min: addMin(now, data.eta_min_minutes), max: addMin(now, data.eta_max_minutes) };
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
          <p className="text-sm text-muted-foreground">الوقت المتوقع للكشف</p>
          <p className="font-bold text-lg">{data.eta_min_minutes} – {data.eta_max_minutes} دقيقة</p>
          {etaTime && (
            <div className="border-t border-border pt-2">
              <p className="text-sm text-muted-foreground">الفترة المتوقعة</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {etaTime.min.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit", hour12: true })}
                  {" – "}
                  {etaTime.max.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit", hour12: true })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      {remaining && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <p className="text-sm"><span className="text-muted-foreground">الوقت المتبقي: </span><span className="font-semibold">{remaining}</span></p>
          </div>
          <Progress value={progress} className="h-2 [direction:ltr]" />
          <p className="text-xs text-muted-foreground">{Math.round(progress)}٪ من الوقت انقضى</p>
        </div>
      )}
    </div>
  );
}

function Msg({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="text-center py-2">
      <span className="text-3xl">{icon}</span>
      <p className="mt-2 text-lg font-medium">{text}</p>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}
