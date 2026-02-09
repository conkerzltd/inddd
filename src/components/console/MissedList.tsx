import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  onMarkReturned: (id: string) => void;
}

export function MissedList({ tickets, onMarkReturned }: Props) {
  return (
    <TicketSection title="Missed" count={tickets.length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Miss Count</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.patient_name || "—"}</TableCell>
              <TableCell>{t.miss_count}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => onMarkReturned(t.id)}>
                  <RotateCcw className="h-3 w-3 mr-1" />Mark Returned
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TicketSection>
  );
}
