import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Send, UserCheck, Ban } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  onSendLink: (id: string) => void;
  onConfirmArrival: (id: string) => void;
  onCancel: (id: string) => void;
}

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

const sourceLabel = (s: string) => {
  if (s === "WALK_IN") return "حضور";
  if (s === "PHONE_CALL") return "تليفون";
  if (s === "EXTERNAL") return "خارجي";
  return s;
};

const visitTypeLabel = (v: string) => {
  if (v === "NEW") return "كشف جديد";
  if (v === "CONSULTATION") return "استشارة";
  return v;
};

export function PreArrivalList({ tickets, clinicTimezone, onSendLink, onConfirmArrival, onCancel }: Props) {
  return (
    <TicketSection title="قبل الوصول" count={tickets.length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">الرقم</TableHead>
            <TableHead>اسم المريض</TableHead>
            <TableHead>المصدر</TableHead>
            <TableHead>نوع الزيارة</TableHead>
            <TableHead>الموعد</TableHead>
            <TableHead className="text-left w-[220px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t, i) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono">{i + 1}</TableCell>
              <TableCell>
                <span className="font-medium truncate max-w-[200px] inline-block align-middle">{t.patient_name || "—"}</span>
                {t.source === "EXTERNAL" && t.external_booking_app_label && (
                  <span className="block text-xs text-muted-foreground">
                    خارجي · {t.external_booking_app_code === "OTHER" && t.external_booking_app_other
                      ? `أخرى: ${t.external_booking_app_other}`
                      : t.external_booking_app_label}
                  </span>
                )}
              </TableCell>
              <TableCell>{sourceLabel(t.source)}</TableCell>
              <TableCell>{visitTypeLabel(t.visit_type)}</TableCell>
              <TableCell>
                {t.appointment_time ? fmtTime(t.appointment_time, clinicTimezone) : "—"}
              </TableCell>
              <TableCell className="text-left w-[220px] space-x-1 space-x-reverse">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onSendLink(t.id)} title="إعادة الإرسال">
                  <Send className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onConfirmArrival(t.id)}>
                  <UserCheck className="h-3 w-3 ml-1" />تأكيد الحضور
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
