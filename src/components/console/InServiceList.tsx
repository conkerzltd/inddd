import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  onComplete: (id: string) => void;
}

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

export function InServiceList({ tickets, clinicTimezone, onComplete }: Props) {
  return (
    <TicketSection title="In Service" count={tickets.length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Started At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.patient_name || "—"}</TableCell>
              <TableCell>{t.service_started_at ? fmtTime(t.service_started_at, clinicTimezone) : "—"}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => onComplete(t.id)}>
                  <CheckCircle className="h-3 w-3 mr-1" />Complete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TicketSection>
  );
}
