import { useState } from "react";
import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import { InsertPositionDialog } from "./InsertPositionDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Phone, Zap } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  onCallNext: () => void;
  onSetUrgent: (id: string, pos: string, n: number | null, note: string | null) => Promise<any>;
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

export function WaitingList({ tickets, clinicTimezone, onCallNext, onSetUrgent }: Props) {
  const [urgentTicketId, setUrgentTicketId] = useState<string | null>(null);

  return (
    <>
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
              <TableHead className="text-right">Actions</TableHead>
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
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setUrgentTicketId(t.id)}>
                    <Zap className="h-3 w-3 mr-1" />Set Urgent
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TicketSection>

      <InsertPositionDialog
        open={!!urgentTicketId}
        onOpenChange={(o) => { if (!o) setUrgentTicketId(null); }}
        title="Urgent Insert"
        onSubmit={async (pos, n, note) => {
          if (!urgentTicketId) return;
          await onSetUrgent(urgentTicketId, pos, n, note);
        }}
      />
    </>
  );
}
