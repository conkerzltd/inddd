import { useState } from "react";
import { TicketRow, hasRealPhone } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import { MobileTicketCard } from "./MobileTicketCard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Play, XCircle, Ban, Send } from "lucide-react";
import { HIGHLIGHT_ROW_CLASS } from "@/hooks/useTicketHighlight";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  highlightId?: string | null;
  onStartService: (id: string) => void;
  onMarkMissed: (id: string) => void;
  onSendLink?: (id: string) => void;
  onCancel: (id: string) => void;
}

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

export function CalledList({ tickets, clinicTimezone, highlightId, onStartService, onMarkMissed, onSendLink, onCancel }: Props) {
  const isMobile = useIsMobile();
  const [cancelTicketId, setCancelTicketId] = useState<string | null>(null);

  return (
    <>
    <TicketSection title="تم النداء" count={tickets.length}>
      {isMobile ? (
        <div className="space-y-2">
          {tickets.map((t, i) => (
            <MobileTicketCard
              key={t.id}
              index={t._pos ?? i + 1}
              highlight
              highlightActive={t.id === highlightId}
              fields={[
                { label: "الاسم", value: <>{t.patient_name || "—"}{!hasRealPhone(t.patient_phone) && <span className="text-xs text-muted-foreground mr-1">(بدون هاتف)</span>}</> },
                { label: "وقت النداء", value: t.called_at ? fmtTime(t.called_at, clinicTimezone) : "—" },
              ]}
              actions={
                <>
                  <Button size="sm" className="min-h-[44px] flex-1" onClick={() => onStartService(t.id)}>
                    <Play className="h-3.5 w-3.5 me-1" />بدء الخدمة
                  </Button>
                  <Button size="sm" variant="destructive" className="min-h-[44px] flex-1" onClick={() => onMarkMissed(t.id)}>
                    <XCircle className="h-3.5 w-3.5 me-1" />لم يحضر
                  </Button>
                  {onSendLink && hasRealPhone(t.patient_phone) && (
                    <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => onSendLink(t.id)} title="إعادة إرسال الرابط">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" className="min-h-[44px]" onClick={() => setCancelTicketId(t.id)}>
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
              <TableHead>وقت النداء</TableHead>
              <TableHead className="text-start w-[240px]">الإجراءات</TableHead>
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
                <TableCell>{t.called_at ? fmtTime(t.called_at, clinicTimezone) : "—"}</TableCell>
                <TableCell className="text-start w-[240px] space-x-1 space-x-reverse">
                  <Button size="sm" onClick={() => onStartService(t.id)}>
                    <Play className="h-3 w-3 me-1" />بدء الخدمة
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onMarkMissed(t.id)}>
                    <XCircle className="h-3 w-3 me-1" />لم يحضر
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
