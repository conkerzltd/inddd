import { useState } from "react";
import { TicketRow, hasRealPhone } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import { MobileTicketCard } from "./MobileTicketCard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle, Phone } from "lucide-react";
import { playQueueChime } from "@/utils/chimeSound";
import { HIGHLIGHT_ROW_CLASS } from "@/hooks/useTicketHighlight";

interface Props {
  tickets: TicketRow[];
  clinicTimezone: string;
  highlightId?: string | null;
  onComplete: (id: string) => void;
  onCallNext: () => void;
}

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));

export function InServiceList({ tickets, clinicTimezone, highlightId, onComplete, onCallNext }: Props) {
  const [completedId, setCompletedId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleComplete = async (id: string) => {
    await onComplete(id);
    setCompletedId(id);
  };

  const handleCallNext = async () => {
    playQueueChime();
    setCompletedId(null);
    await onCallNext();
  };

  return (
    <TicketSection
      title="داخل الكشف"
      count={tickets.length}
      alwaysShow
      action={
        <Button size="sm" variant="default" className="min-h-[44px] md:min-h-0 animate-pulse" onClick={handleCallNext}>
          <Phone className="h-3 w-3 me-1" />نداء التالي
        </Button>
      }
    >
      {isMobile ? (
        <div className="space-y-2">
          {tickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">(فارغ)</p>
          ) : (
            tickets.map((t, i) => (
              <MobileTicketCard
                key={t.id}
                index={t._pos ?? i + 1}
                highlightActive={t.id === highlightId}
                fields={[
                  { label: "الاسم", value: t.patient_name || "—" },
                  { label: "وقت البدء", value: t.service_started_at ? fmtTime(t.service_started_at, clinicTimezone) : "—" },
                ]}
                actions={
                  completedId === t.id ? (
                    <Button size="sm" variant="default" className="min-h-[44px] flex-1 animate-pulse" onClick={handleCallNext}>
                      <Phone className="h-3.5 w-3.5 me-1" />نداء التالي
                    </Button>
                  ) : (
                    <Button size="sm" className="min-h-[44px] flex-1" onClick={() => handleComplete(t.id)}>
                      <CheckCircle className="h-3.5 w-3.5 me-1" />إتمام
                    </Button>
                  )
                }
              />
            ))
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">الرقم</TableHead>
              <TableHead>اسم المريض</TableHead>
              <TableHead>وقت البدء</TableHead>
              <TableHead className="text-start w-[140px]">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  (فارغ)
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((t, i) => (
                <TableRow key={t.id} className={`animate-fade-in ${t.id === highlightId ? HIGHLIGHT_ROW_CLASS : "transition-all duration-500"}`}>
                  <TableCell className="font-mono">{t._pos ?? i + 1}</TableCell>
                  <TableCell>
                    <span className="font-medium truncate max-w-[200px] inline-block align-middle">{t.patient_name || "—"}</span>
                  </TableCell>
                  <TableCell>{t.service_started_at ? fmtTime(t.service_started_at, clinicTimezone) : "—"}</TableCell>
                  <TableCell className="text-start w-[140px]">
                    {completedId === t.id ? (
                      <Button size="sm" variant="default" onClick={handleCallNext} className="animate-pulse">
                        <Phone className="h-3 w-3 me-1" />نداء التالي
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleComplete(t.id)}>
                        <CheckCircle className="h-3 w-3 me-1" />إتمام
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </TicketSection>
  );
}
