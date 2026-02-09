import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Play, XCircle } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  onStartService: (id: string) => void;
  onMarkMissed: (id: string) => void;
}

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

export function CalledList({ tickets, clinicTimezone, onStartService, onMarkMissed }: Props) {
  return (
    <TicketSection title="Called" count={tickets.length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Called At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.patient_name || "—"}</TableCell>
              <TableCell>{t.called_at ? fmtTime(t.called_at, clinicTimezone) : "—"}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="sm" onClick={() => onStartService(t.id)}>
                  <Play className="h-3 w-3 mr-1" />Start Service
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onMarkMissed(t.id)}>
                  <XCircle className="h-3 w-3 mr-1" />Missed
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TicketSection>
  );
}
