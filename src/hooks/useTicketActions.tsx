import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useTicketActions(clinicId: string | null, onDone: () => void) {
  const rpc = useCallback(
    async (fn: string, params: Record<string, unknown>, successMsg: string) => {
      try {
        const { data, error } = await supabase.rpc(fn as any, params as any);
        if (error) throw error;
        toast.success(successMsg);
        onDone();
        return data;
      } catch (e: any) {
        toast.error(e.message || `Failed: ${fn}`);
        return null;
      }
    },
    [onDone]
  );

  const sendLink = (ticketId: string) =>
    rpc("send_patient_link", { p_ticket_id: ticketId }, "Link sent!");

  const confirmArrival = (ticketId: string) =>
    rpc("confirm_arrival", { p_ticket_id: ticketId }, "Arrival confirmed!");

  const callNext = () => {
    if (!clinicId) return;
    return rpc("call_next", { p_clinic_id: clinicId }, "Patient called!");
  };

  const startService = (ticketId: string) =>
    rpc("start_service", { p_ticket_id: ticketId }, "Service started!");

  const completeTicket = (ticketId: string) =>
    rpc("complete_ticket", { p_ticket_id: ticketId }, "Visit completed!");

  const markMissed = (ticketId: string) =>
    rpc("mark_missed", { p_ticket_id: ticketId }, "Marked missed.");

  const markReturned = (ticketId: string) =>
    rpc("mark_returned", { p_ticket_id: ticketId }, "Marked returned.");

  const setSessionPaused = (paused: boolean) => {
    if (!clinicId) return;
    return rpc("set_session_paused", { p_clinic_id: clinicId, p_paused: paused },
      paused ? "Session paused" : "Session resumed");
  };

  const setIntakeOpen = (open: boolean) => {
    if (!clinicId) return;
    return rpc("set_intake_open", { p_clinic_id: clinicId, p_open: open },
      open ? "Intake opened" : "Intake closed");
  };

  const reinsertReturned = (ticketId: string, position: string, n: number | null, note: string | null) =>
    rpc("reinsert_returned", {
      p_ticket_id: ticketId,
      p_insert_position: position,
      p_insert_n: n,
      p_note: note,
    }, "Patient reinserted!");

  const setUrgentAndInsert = (ticketId: string, position: string, n: number | null, note: string | null) =>
    rpc("set_urgent_and_insert", {
      p_ticket_id: ticketId,
      p_insert_position: position,
      p_insert_n: n,
      p_note: note,
    }, "Urgent insert done!");

  const cancelTicket = (ticketId: string) =>
    rpc("cancel_ticket", { p_ticket_id: ticketId }, "Ticket cancelled.");

  const closeOutDay = () => {
    if (!clinicId) return;
    return rpc("close_out_day", { p_clinic_id: clinicId }, "Day closed out!");
  };

  return {
    sendLink, confirmArrival, callNext, startService, completeTicket,
    markMissed, markReturned, setSessionPaused, setIntakeOpen,
    reinsertReturned, setUrgentAndInsert, cancelTicket, closeOutDay,
  };
}
