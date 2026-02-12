import { useState, useRef, useCallback } from "react";
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

const CHIME_URL = "https://cdn.freesound.org/previews/536/536420_4921277-lq.mp3";

export function InServiceList({ tickets, clinicTimezone, onComplete, onCallNext }: Props) {
  const [completedId, setCompletedId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playChime = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(CHIME_URL);
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, []);

  const handleComplete = async (id: string) => {
    await onComplete(id);
    setCompletedId(id);
  };

  const handleCallNext = async () => {
    playChime();
    setCompletedId(null);
    await onCallNext();
  };

  return (
    <TicketSection
      title="داخل الكشف"
      count={tickets.length}
      action={
        <Button size="sm" onClick={handleCallNext}>
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
            <TableHead className="text-left w-[140px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t, i) => (
            <TableRow key={t.id} className="animate-fade-in">
              <TableCell className="font-mono">{i + 1}</TableCell>
              <TableCell>
                <span className="font-medium truncate max-w-[200px] inline-block align-middle">{t.patient_name || "—"}</span>
              </TableCell>
              <TableCell>{t.service_started_at ? fmtTime(t.service_started_at, clinicTimezone) : "—"}</TableCell>
              <TableCell className="text-left w-[140px]">
                {completedId === t.id ? (
                  <Button size="sm" variant="outline" onClick={handleCallNext} className="animate-scale-in">
                    <Phone className="h-3 w-3 ml-1" />نداء التالي
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleComplete(t.id)}>
                    <CheckCircle className="h-3 w-3 ml-1" />إتمام
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TicketSection>
  );
}
