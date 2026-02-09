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
  onSubmit: (position: string, n: number | null, note: string | null) => Promise<void>;
}

export function InsertPositionDialog({ open, onOpenChange, title, onSubmit }: Props) {
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
            <Label>Insert Position</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AFTER_CURRENT">After Current</SelectItem>
                <SelectItem value="AFTER_N">After Position N</SelectItem>
                <SelectItem value="END">End of Queue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {position === "AFTER_N" && (
            <div className="space-y-1">
              <Label>Position N</Label>
              <Input
                type="number"
                min={1}
                value={n}
                onChange={(e) => setN(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label>Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for reinsertion"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Submitting…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
