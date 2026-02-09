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

  return { sendLink, confirmArrival, callNext, startService, completeTicket, markMissed, markReturned };
}
