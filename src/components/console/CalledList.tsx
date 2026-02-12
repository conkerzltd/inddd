import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Play, XCircle, Ban } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  onStartService: (id: string) => void;
  onMarkMissed: (id: string) => void;
  onCancel: (id: string) => void;
}

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

export function CalledList({ tickets, clinicTimezone, onStartService, onMarkMissed, onCancel }: Props) {
  return (
    <TicketSection title="تم النداء" count={tickets.length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم المريض</TableHead>
            <TableHead>وقت النداء</TableHead>
            <TableHead className="text-left">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.patient_name || "—"}</TableCell>
              <TableCell>{t.called_at ? fmtTime(t.called_at, clinicTimezone) : "—"}</TableCell>
              <TableCell className="text-left space-x-1 space-x-reverse">
                <Button size="sm" onClick={() => onStartService(t.id)}>
                  <Play className="h-3 w-3 ml-1" />بدء الخدمة
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onMarkMissed(t.id)}>
                  <XCircle className="h-3 w-3 ml-1" />لم يحضر
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
  );
}
