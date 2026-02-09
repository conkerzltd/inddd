import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TicketRow {
  id: string;
  status: string;
  type: string;
  source: string;
  visit_type: string;
  patient_name: string | null;
  patient_phone: string;
  appointment_time: string | null;
  arrival_confirmed_at: string | null;
  called_at: string | null;
  service_started_at: string | null;
  completed_at: string | null;
  rank_key: number | null;
  miss_count: number;
  token: string | null;
}

export function useClinicTickets(clinicId: string | null, clinicTimezone: string) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(false);

  const getClinicToday = useCallback(
    (tz: string) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    []
  );

  const refresh = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const today = getClinicToday(clinicTimezone);
      const { data: raw, error } = await supabase
        .from("tickets")
        .select("id, status, type, source, visit_type, patient_name, patient_phone, appointment_time, arrival_confirmed_at, called_at, service_started_at, completed_at, rank_key, miss_count")
        .eq("clinic_id", clinicId)
        .eq("visit_date", today)
        .order("rank_key", { ascending: true, nullsFirst: false });

      if (error) throw error;
      if (!raw || raw.length === 0) { setTickets([]); return; }

      const ids = raw.map((t) => t.id);
      const { data: links } = await supabase
        .from("patient_links")
        .select("ticket_id, token")
        .in("ticket_id", ids)
        .is("revoked_at", null);

      const tokenMap = new Map((links || []).map((l) => [l.ticket_id, l.token]));

      setTickets(
        raw.map((t) => ({ ...t, token: tokenMap.get(t.id) || null }))
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [clinicId, clinicTimezone, getClinicToday]);

  useEffect(() => {
    if (clinicId && clinicTimezone) refresh();
  }, [clinicId, clinicTimezone, refresh]);

  // Realtime subscriptions
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!clinicId) return;

    const channel = supabase
      .channel(`console-${clinicId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `clinic_id=eq.${clinicId}` },
        () => refreshRef.current()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clinics', filter: `id=eq.${clinicId}` },
        () => refreshRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  // Grouped tickets
  const preArrival = tickets
    .filter((t) => t.status === "REMOTE_BOOKED" || t.status === "LINK_SENT")
    .sort((a, b) => {
      if (!a.appointment_time && !b.appointment_time) return 0;
      if (!a.appointment_time) return 1;
      if (!b.appointment_time) return -1;
      return a.appointment_time.localeCompare(b.appointment_time);
    });

  const waiting = tickets
    .filter((t) => t.status === "INSIDE_WAITING")
    .sort((a, b) => (a.rank_key ?? Infinity) - (b.rank_key ?? Infinity));

  const called = tickets
    .filter((t) => t.status === "CALLED")
    .sort((a, b) => (a.called_at || "").localeCompare(b.called_at || ""));

  const inService = tickets.filter((t) => t.status === "IN_SERVICE");

  const missed = tickets
    .filter((t) => t.status === "MISSED")
    .sort((a, b) => (b.called_at || "").localeCompare(a.called_at || ""));

  const returned = tickets.filter((t) => t.status === "RETURNED");

  const done = tickets.filter((t) => t.status === "DONE");

  return {
    tickets,
    loading,
    refresh,
    preArrival,
    waiting,
    called,
    inService,
    missed,
    returned,
    done,
    getClinicToday,
  };
}
