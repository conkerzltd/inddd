import { useState } from "react";
import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import { InsertPositionDialog } from "./InsertPositionDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RotateCcw, Zap } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  onReinsert: (id: string, pos: string, n: number | null, note: string | null) => Promise<any>;
  onSetUrgent: (id: string, pos: string, n: number | null, note: string | null) => Promise<any>;
}

export function ReturnedList({ tickets, onReinsert, onSetUrgent }: Props) {
  const [dialogTicketId, setDialogTicketId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"reinsert" | "urgent">("reinsert");

  return (
    <>
      <TicketSection title="Returned" count={tickets.length}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.patient_name || "—"}</TableCell>
                <TableCell>{t.type}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => { setDialogTicketId(t.id); setDialogMode("reinsert"); }}>
                    <RotateCcw className="h-3 w-3 mr-1" />Reinsert
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setDialogTicketId(t.id); setDialogMode("urgent"); }}>
                    <Zap className="h-3 w-3 mr-1" />Set Urgent
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TicketSection>

      <InsertPositionDialog
        open={!!dialogTicketId}
        onOpenChange={(o) => { if (!o) setDialogTicketId(null); }}
        title={dialogMode === "reinsert" ? "Reinsert Patient" : "Urgent Insert"}
        onSubmit={async (pos, n, note) => {
          if (!dialogTicketId) return;
          if (dialogMode === "reinsert") {
            await onReinsert(dialogTicketId, pos, n, note);
          } else {
            await onSetUrgent(dialogTicketId, pos, n, note);
          }
        }}
      />
    </>
  );
}
