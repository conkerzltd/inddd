import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  mode?: "urgent" | "reinsert";
  onSubmit: (position: string, n: number | null, note: string | null) => Promise<void>;
}

export function InsertPositionDialog({ open, onOpenChange, title, mode = "reinsert", onSubmit }: Props) {
  const [position, setPosition] = useState("AFTER_CURRENT");
  const [n, setN] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(
        position,
        position === "AFTER_N" ? parseInt(n, 10) || null : null,
        note.trim() || null,
      );
      onOpenChange(false);
      setPosition("AFTER_CURRENT");
      setN("");
      setNote("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>موضع الإدراج</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AFTER_CURRENT">بعد الحالي مباشرة</SelectItem>
                <SelectItem value="AFTER_N">بعد عدد محدد</SelectItem>
                {mode !== "urgent" && (
                  <SelectItem value="END">نهاية القائمة</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {position === "AFTER_N" && (
            <div className="space-y-1">
              <Label>الموضع N</Label>
              <Input
                type="number"
                min={1}
                value={n}
                onChange={(e) => setN(e.target.value)}
                placeholder="مثال: ٣"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label>{mode === "urgent" ? "سبب الإدراج العاجل (اختياري)" : "ملاحظة (اختياري)"}</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === "urgent" ? "سبب الاستعجال" : "سبب إعادة الإدراج"}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "جاري الإرسال…" : "تأكيد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
