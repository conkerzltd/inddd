import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  onCallNext: () => void;
}

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

const laneLabel = (rk: number | null) => {
  if (rk === null) return "—";
  if (rk >= 3_000_000_000) return "NORMAL";
  if (rk >= 2_000_000_000) return "SCHED";
  if (rk >= 1_000_000_000) return "URGENT";
  return "—";
};

export function WaitingList({ tickets, clinicTimezone, onCallNext }: Props) {
  return (
    <TicketSection
      title="Waiting Queue"
      count={tickets.length}
      action={
        <Button size="sm" onClick={onCallNext} disabled={tickets.length === 0}>
          <Phone className="h-3 w-3 mr-1" />Call Next
        </Button>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Arrival</TableHead>
            <TableHead>Lane</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t, i) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono">{i + 1}</TableCell>
              <TableCell className="font-medium">{t.patient_name || "—"}</TableCell>
              <TableCell>{t.type}</TableCell>
              <TableCell>
                {t.arrival_confirmed_at ? fmtTime(t.arrival_confirmed_at, clinicTimezone) : "—"}
              </TableCell>
              <TableCell>{laneLabel(t.rank_key)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TicketSection>
  );
}
