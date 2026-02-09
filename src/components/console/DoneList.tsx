import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";

interface Props {
  tickets: TicketRow[];
}

export function DoneList({ tickets }: Props) {
  return (
    <TicketSection title="Done" count={tickets.length} collapsible defaultOpen={false}>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {tickets.map((t) => (
          <li key={t.id}>{t.patient_name || "Unknown"} — {t.type}</li>
        ))}
      </ul>
    </TicketSection>
  );
}
