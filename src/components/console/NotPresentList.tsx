import { useState } from "react";
import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import { InsertPositionDialog } from "./InsertPositionDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface Props {
  missedTickets: TicketRow[];
  returnedTickets: TicketRow[];
  clinicTimezone: string;
  onMarkReturned: (id: string) => void;
  onReinsert: (id: string, pos: string, n: number | null, note: string | null) => Promise<any>;
}

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

export function NotPresentList({ missedTickets, returnedTickets, clinicTimezone, onMarkReturned, onReinsert }: Props) {
  const [dialogTicketId, setDialogTicketId] = useState<string | null>(null);

  // Combine missed + returned, show all as "not present"
  const allTickets = [
    ...missedTickets.map((t) => ({ ...t, _subStatus: "MISSED" as const })),
    ...returnedTickets.map((t) => ({ ...t, _subStatus: "RETURNED" as const })),
  ];

  const totalCount = allTickets.length;

  return (
    <>
      <TicketSection title="غير متواجد" count={totalCount}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">الرقم</TableHead>
              <TableHead>اسم المريض</TableHead>
              <TableHead>توقيت عدم التواجد</TableHead>
              <TableHead className="text-left w-[160px]">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allTickets.map((t, i) => (
              <TableRow key={t.id} className="animate-fade-in">
                <TableCell className="font-mono">{i + 1}</TableCell>
                <TableCell>
                  <span className="font-medium truncate max-w-[200px] inline-block align-middle">{t.patient_name || "—"}</span>
                </TableCell>
                <TableCell>
                  {t.called_at ? fmtTime(t.called_at, clinicTimezone) : "—"}
                </TableCell>
                <TableCell className="text-left w-[160px]">
                  {t._subStatus === "MISSED" ? (
                    <Button size="sm" variant="outline" onClick={() => onMarkReturned(t.id)}>
                      <RotateCcw className="h-3 w-3 ml-1" />تسجيل عودة
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setDialogTicketId(t.id)}>
                      <RotateCcw className="h-3 w-3 ml-1" />إعادة إدراج
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TicketSection>

      <InsertPositionDialog
        open={!!dialogTicketId}
        onOpenChange={(o) => { if (!o) setDialogTicketId(null); }}
        title="إعادة إدراج المريض"
        onSubmit={async (pos, n, note) => {
          if (!dialogTicketId) return;
          await onReinsert(dialogTicketId, pos, n, note);
        }}
      />
    </>
  );
}
