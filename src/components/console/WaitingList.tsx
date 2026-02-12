import { useState } from "react";
import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import { InsertPositionDialog } from "./InsertPositionDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Phone, Zap, Ban } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  onCallNext: () => void;
  onSetUrgent: (id: string, pos: string, n: number | null, note: string | null) => Promise<any>;
  onCancel: (id: string) => void;
}

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

const visitTypeLabel = (v: string) => {
  if (v === "NEW") return "كشف جديد";
  if (v === "CONSULTATION") return "استشارة";
  return v;
};

export function WaitingList({ tickets, clinicTimezone, onCallNext, onSetUrgent, onCancel }: Props) {
  const [urgentTicketId, setUrgentTicketId] = useState<string | null>(null);

  return (
    <>
      <TicketSection
        title="قائمة الانتظار"
        count={tickets.length}
        action={
          <Button size="sm" onClick={onCallNext} disabled={tickets.length === 0}>
            <Phone className="h-3 w-3 ml-1" />نداء التالي
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">الرقم</TableHead>
              <TableHead>اسم المريض</TableHead>
              <TableHead>نوع الزيارة</TableHead>
              <TableHead>الوصول</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((t, i) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono">{i + 1}</TableCell>
                <TableCell>
                  <span className="font-medium truncate max-w-[200px] inline-block align-middle">{t.patient_name || "—"}</span>
                </TableCell>
                <TableCell>{visitTypeLabel(t.visit_type)}</TableCell>
                <TableCell>
                  {t.arrival_confirmed_at ? fmtTime(t.arrival_confirmed_at, clinicTimezone) : "—"}
                </TableCell>
                <TableCell className="text-left space-x-1 space-x-reverse">
                  <Button size="sm" variant="outline" onClick={() => setUrgentTicketId(t.id)}>
                    <Zap className="h-3 w-3 ml-1" />عاجل
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onCancel(t.id)}>
                    <Ban className="h-3 w-3 ml-1" />إلغاء
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
        title="إدراج عاجل"
        onSubmit={async (pos, n, note) => {
          if (!urgentTicketId) return;
          await onSetUrgent(urgentTicketId, pos, n, note);
        }}
      />
    </>
  );
}
