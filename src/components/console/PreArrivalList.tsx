import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import { MobileTicketCard } from "./MobileTicketCard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, UserCheck, Ban } from "lucide-react";
import { formatTicketSourceLabel } from "@/utils/ticketSource";

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

const visitTypeLabel = (v: string) => {
  if (v === "NEW") return "كشف جديد";
  if (v === "CONSULTATION") return "استشارة";
  return v;
};

export function PreArrivalList({ tickets, clinicTimezone, onSendLink, onConfirmArrival, onCancel }: Props) {
  const isMobile = useIsMobile();

  return (
    <TicketSection title="قبل الوصول" count={tickets.length}>
      {isMobile ? (
        <div className="space-y-2">
          {tickets.map((t, i) => (
            <MobileTicketCard
              key={t.id}
              index={i + 1}
              fields={[
                { label: "الاسم", value: t.patient_name || "—" },
                { label: "المصدر", value: formatTicketSourceLabel(t) },
                { label: "نوع الزيارة", value: visitTypeLabel(t.visit_type) },
                { label: "الموعد", value: t.appointment_time ? fmtTime(t.appointment_time, clinicTimezone) : t.created_at ? fmtTime(t.created_at, clinicTimezone) : "—" },
              ]}
              actions={
                <>
                  <Button size="sm" variant="outline" className="min-h-[44px] flex-1" onClick={() => onSendLink(t.id)}>
                    <Send className="h-3.5 w-3.5 me-1" />إرسال
                  </Button>
                  <Button size="sm" variant="outline" className="min-h-[44px] flex-1" onClick={() => onConfirmArrival(t.id)}>
                    <UserCheck className="h-3.5 w-3.5 me-1" />تأكيد
                  </Button>
                  <Button size="sm" variant="destructive" className="min-h-[44px]" onClick={() => onCancel(t.id)}>
                    <Ban className="h-3.5 w-3.5" />
                  </Button>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">الرقم</TableHead>
              <TableHead>اسم المريض</TableHead>
              <TableHead>المصدر</TableHead>
              <TableHead>نوع الزيارة</TableHead>
              <TableHead>الموعد</TableHead>
              <TableHead className="text-start w-[220px]">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((t, i) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono">{i + 1}</TableCell>
                <TableCell>
                  <span className="font-medium truncate max-w-[200px] inline-block align-middle">{t.patient_name || "—"}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{formatTicketSourceLabel(t)}</Badge>
                </TableCell>
                <TableCell>{visitTypeLabel(t.visit_type)}</TableCell>
                <TableCell>
                  {t.appointment_time
                    ? fmtTime(t.appointment_time, clinicTimezone)
                    : t.created_at
                      ? fmtTime(t.created_at, clinicTimezone)
                      : "—"}
                </TableCell>
                <TableCell className="text-start w-[220px] space-x-1 space-x-reverse">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onSendLink(t.id)} title="إعادة الإرسال">
                    <Send className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onConfirmArrival(t.id)}>
                    <UserCheck className="h-3 w-3 me-1" />تأكيد الحضور
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onCancel(t.id)}>
                    <Ban className="h-3 w-3 me-1" />إلغاء
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TicketSection>
  );
}
