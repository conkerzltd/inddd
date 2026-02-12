import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle, Phone } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  onComplete: (id: string) => void;
  onCallNext: () => void;
}

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

export function InServiceList({ tickets, clinicTimezone, onComplete, onCallNext }: Props) {
  return (
    <TicketSection
      title="داخل الكشف"
      count={tickets.length}
      action={
        <Button size="sm" onClick={onCallNext}>
          <Phone className="h-3 w-3 ml-1" />نداء التالي
        </Button>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">الرقم</TableHead>
            <TableHead>اسم المريض</TableHead>
            <TableHead>وقت البدء</TableHead>
            <TableHead className="text-left w-[120px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t, i) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono">{i + 1}</TableCell>
              <TableCell>
                <span className="font-medium truncate max-w-[200px] inline-block align-middle">{t.patient_name || "—"}</span>
              </TableCell>
              <TableCell>{t.service_started_at ? fmtTime(t.service_started_at, clinicTimezone) : "—"}</TableCell>
              <TableCell className="text-left w-[120px]">
                <Button size="sm" onClick={() => onComplete(t.id)}>
                  <CheckCircle className="h-3 w-3 ml-1" />إتمام
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TicketSection>
  );
}
