import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import { MobileTicketCard } from "./MobileTicketCard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
}

const visitTypeLabel = (v: string) => {
  if (v === "NEW") return "كشف جديد";
  if (v === "CONSULTATION") return "استشارة";
  return v;
};

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

export function DoneList({ tickets, clinicTimezone }: Props) {
  const isMobile = useIsMobile();

  return (
    <TicketSection title="مكتمل" count={tickets.length} collapsible defaultOpen={false}>
      {isMobile ? (
        <div className="space-y-2">
          {tickets.map((t, i) => (
            <MobileTicketCard
              key={t.id}
              index={i + 1}
              fields={[
                { label: "الاسم", value: t.patient_name || "غير معروف" },
                { label: "نوع الزيارة", value: visitTypeLabel(t.visit_type) },
                { label: "وقت الإنهاء", value: t.completed_at ? fmtTime(t.completed_at, clinicTimezone) : "—" },
              ]}
            />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">الرقم</TableHead>
              <TableHead>اسم المريض</TableHead>
              <TableHead>نوع الزيارة</TableHead>
              <TableHead>وقت إنهاء الزيارة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((t, i) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono">{i + 1}</TableCell>
                <TableCell>
                  <span className="font-medium truncate max-w-[200px] inline-block align-middle">{t.patient_name || "غير معروف"}</span>
                </TableCell>
                <TableCell>{visitTypeLabel(t.visit_type)}</TableCell>
                <TableCell>{t.completed_at ? fmtTime(t.completed_at, clinicTimezone) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TicketSection>
  );
}
