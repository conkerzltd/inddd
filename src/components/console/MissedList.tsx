import { TicketRow } from "@/hooks/useClinicTickets";
import { TicketSection } from "./TicketSection";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface Props {
  tickets: TicketRow[];
  onMarkReturned: (id: string) => void;
}

export function MissedList({ tickets, onMarkReturned }: Props) {
  return (
    <TicketSection title="لم يحضر" count={tickets.length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">الرقم</TableHead>
            <TableHead>اسم المريض</TableHead>
            <TableHead>عدد مرات الغياب</TableHead>
            <TableHead className="text-left w-[140px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t, i) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono">{i + 1}</TableCell>
              <TableCell>
                <span className="font-medium truncate max-w-[200px] inline-block align-middle">{t.patient_name || "—"}</span>
              </TableCell>
              <TableCell>{t.miss_count}</TableCell>
              <TableCell className="text-left w-[140px]">
                <Button size="sm" variant="outline" onClick={() => onMarkReturned(t.id)}>
                  <RotateCcw className="h-3 w-3 ml-1" />تسجيل عودة
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TicketSection>
  );
}
