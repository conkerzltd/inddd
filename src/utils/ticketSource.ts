/**
 * Shared source-label constants — the SINGLE SOURCE OF TRUTH.
 * These exact strings are used in CreateTicketDialog <SelectItem>s
 * and must be reused everywhere source labels appear.
 */

import { TicketRow } from "@/hooks/useClinicTickets";

/** Source-code → Arabic label map (matches CreateTicketDialog options) */
export const SOURCE_LABELS: Record<string, string> = {
  WALK_IN: "حضور مباشر",
  PHONE_CALL: "تليفون",
  EXTERNAL: "خارجي",
} as const;

/**
 * Returns a human-readable Arabic source label for a ticket.
 * For EXTERNAL tickets with an app label, appends it in parentheses.
 */
export function formatTicketSourceLabel(ticket: Pick<TicketRow, "source" | "external_booking_app_label" | "external_booking_app_code" | "external_booking_app_other">): string {
  const base = SOURCE_LABELS[ticket.source] ?? ticket.source;

  if (ticket.source !== "EXTERNAL") return base;

  if (ticket.external_booking_app_code === "OTHER" && ticket.external_booking_app_other) {
    return `${base} (أخرى: ${ticket.external_booking_app_other})`;
  }

  if (ticket.external_booking_app_label) {
    return `${base} (${ticket.external_booking_app_label})`;
  }

  return base;
}
