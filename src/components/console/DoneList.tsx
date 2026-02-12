import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";

interface Props {
  tickets: TicketRow[];
}

export function DoneList({ tickets }: Props) {
  return (
    <TicketSection title="مكتمل" count={tickets.length} collapsible defaultOpen={false}>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {tickets.map((t) => (
          <li key={t.id}>{t.patient_name || "غير معروف"} — {t.type === "NORMAL" ? "عادي" : t.type === "SCHEDULED" ? "مجدول" : t.type === "URGENT" ? "عاجل" : t.type}</li>
        ))}
      </ul>
    </TicketSection>
  );
}
