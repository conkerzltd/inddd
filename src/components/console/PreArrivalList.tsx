import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Send, ExternalLink, UserCheck } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  onSendLink: (id: string) => void;
  onConfirmArrival: (id: string) => void;
}

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

export function PreArrivalList({ tickets, clinicTimezone, onSendLink, onConfirmArrival }: Props) {
  return (
    <TicketSection title="Pre-Arrival" count={tickets.length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Appointment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.patient_name || "—"}</TableCell>
              <TableCell>{t.source}</TableCell>
              <TableCell>{t.type}</TableCell>
              <TableCell>
                {t.appointment_time ? fmtTime(t.appointment_time, clinicTimezone) : "—"}
              </TableCell>
              <TableCell>{t.status}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="sm" variant="outline" onClick={() => onSendLink(t.id)}>
                  <Send className="h-3 w-3 mr-1" />Send Link
                </Button>
                <Button size="sm" variant="outline" onClick={() => onConfirmArrival(t.id)}>
                  <UserCheck className="h-3 w-3 mr-1" />Confirm Arrival
                </Button>
                {t.token && (
                  <a href={`/q/${t.token}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TicketSection>
  );
}
