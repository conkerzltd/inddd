import { useState } from "react";
import { TicketRow, hasRealPhone } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import { MobileTicketCard } from "./MobileTicketCard";
import { InsertPositionDialog } from "./InsertPositionDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Zap, Ban, Send, Link2 } from "lucide-react";
import { HIGHLIGHT_ROW_CLASS } from "@/hooks/useTicketHighlight";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  highlightId?: string | null;
  onSetUrgent: (id: string, pos: string, n: number | null, note: string | null) => Promise<any>;
  onSendLink?: (id: string) => void;
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

export function WaitingList({ tickets, clinicTimezone, highlightId, onSetUrgent, onSendLink, onCancel }: Props) {
  const [urgentTicketId, setUrgentTicketId] = useState<string | null>(null);
  const [cancelTicketId, setCancelTicketId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  return (
    <>
      <TicketSection
        title="قائمة الانتظار"
        count={tickets.length}
      >
        {isMobile ? (
          <div className="space-y-2">
            {tickets.map((t, i) => (
              <MobileTicketCard
                key={t.id}
                index={t._pos ?? i + 1}
                highlightActive={t.id === highlightId}
                fields={[
                  { label: "الاسم", value: <>{t.patient_name || "—"}{!hasRealPhone(t.patient_phone) && <span className="text-xs text-muted-foreground mr-1">(بدون هاتف)</span>}</> },
                  { label: "نوع الزيارة", value: visitTypeLabel(t.visit_type) },
                  { label: "الوصول", value: t.arrival_confirmed_at ? fmtTime(t.arrival_confirmed_at, clinicTimezone) : "—" },
                ]}
                actions={
                  <>
                    <Button size="sm" variant="outline" className="min-h-[44px] flex-1" onClick={() => setUrgentTicketId(t.id)}>
                      <Zap className="h-3.5 w-3.5 me-1" />عاجل
                    </Button>
                    <Button size="sm" variant="destructive" className="min-h-[44px]" onClick={() => setCancelTicketId(t.id)}>
                      <Ban className="h-3.5 w-3.5 me-1" />إلغاء
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
                <TableHead>نوع الزيارة</TableHead>
                <TableHead>الوصول</TableHead>
                <TableHead className="text-start w-[180px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t, i) => (
                <TableRow key={t.id} className={t.id === highlightId ? HIGHLIGHT_ROW_CLASS : "transition-all duration-500"}>
                  <TableCell className="font-mono">{t._pos ?? i + 1}</TableCell>
                  <TableCell>
                    <span className="font-medium truncate max-w-[200px] inline-block align-middle">{t.patient_name || "—"}</span>
                    {!hasRealPhone(t.patient_phone) && <span className="text-xs text-muted-foreground mr-1">(بدون هاتف)</span>}
                  </TableCell>
                  <TableCell>{visitTypeLabel(t.visit_type)}</TableCell>
                  <TableCell>
                    {t.arrival_confirmed_at ? fmtTime(t.arrival_confirmed_at, clinicTimezone) : "—"}
                  </TableCell>
                  <TableCell className="text-start w-[180px] space-x-1 space-x-reverse">
                    <Button size="sm" variant="outline" onClick={() => setUrgentTicketId(t.id)}>
                      <Zap className="h-3 w-3 me-1" />عاجل
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setCancelTicketId(t.id)}>
                      <Ban className="h-3 w-3 me-1" />إلغاء
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TicketSection>

      <InsertPositionDialog
        open={!!urgentTicketId}
        onOpenChange={(o) => { if (!o) setUrgentTicketId(null); }}
        title="إدراج عاجل"
        mode="urgent"
        onSubmit={async (pos, n, note) => {
          if (!urgentTicketId) return;
          await onSetUrgent(urgentTicketId, pos, n, note);
        }}
      />

      <AlertDialog open={!!cancelTicketId} onOpenChange={(o) => { if (!o) setCancelTicketId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إلغاء التذكرة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء هذه التذكرة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (cancelTicketId) onCancel(cancelTicketId); setCancelTicketId(null); }}>
              إلغاء التذكرة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
