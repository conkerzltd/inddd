import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Send, ExternalLink, UserCheck, Ban } from "lucide-react";

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

const typeLabel = (t: string) => {
  if (t === "NORMAL") return "عادي";
  if (t === "SCHEDULED") return "ميعاد";
  if (t === "URGENT") return "مستعجل";
  return t;
};

export function PreArrivalList({ tickets, clinicTimezone, onSendLink, onConfirmArrival, onCancel }: Props) {
  return (
    <TicketSection title="قبل الوصول" count={tickets.length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المريض</TableHead>
            <TableHead>المصدر</TableHead>
            <TableHead>كشف</TableHead>
            <TableHead>الموعد</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead className="text-left">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <span className="font-medium">{t.patient_name || "—"}</span>
                {t.source === "EXTERNAL" && t.external_booking_app_label && (
                  <span className="block text-xs text-muted-foreground">
                    خارجي · {t.external_booking_app_code === "OTHER" && t.external_booking_app_other
                      ? `أخرى: ${t.external_booking_app_other}`
                      : t.external_booking_app_label}
                  </span>
                )}
              </TableCell>
              <TableCell>{sourceLabel(t.source)}</TableCell>
              <TableCell>{typeLabel(t.type)}</TableCell>
              <TableCell>
                {t.appointment_time ? fmtTime(t.appointment_time, clinicTimezone) : "—"}
              </TableCell>
              <TableCell>{t.status}</TableCell>
              <TableCell className="text-left space-x-1 space-x-reverse">
                <Button size="sm" variant="outline" onClick={() => onSendLink(t.id)}>
                  <Send className="h-3 w-3 ml-1" />إرسال الرابط
                </Button>
                <Button size="sm" variant="outline" onClick={() => onConfirmArrival(t.id)}>
                  <UserCheck className="h-3 w-3 ml-1" />تأكيد الحضور
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onCancel(t.id)}>
                  <Ban className="h-3 w-3 ml-1" />إلغاء
                </Button>
                {t.token && (
                  <a href={`${PUBLIC_BASE_URL}/q/${t.token}`} target="_blank" rel="noopener noreferrer">
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
