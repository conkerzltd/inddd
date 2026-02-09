import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  clinicId: string;
  onCreated: () => void;
}

export function CreateTicketDialog({ clinicId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [source, setSource] = useState<string>("WALK_IN");
  const [type, setType] = useState<string>("NORMAL");
  const [visitType, setVisitType] = useState<string>("CONSULTATION");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [apptTime, setApptTime] = useState("");

  const reset = () => {
    setSource("WALK_IN");
    setType("NORMAL");
    setVisitType("CONSULTATION");
    setPhone("");
    setName("");
    setApptTime("");
  };

  const handleSubmit = async () => {
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (type === "SCHEDULED" && !apptTime) {
      toast.error("Appointment time is required for scheduled tickets");
      return;
    }

    setSubmitting(true);
    try {
      const status = type === "SCHEDULED" ? "REMOTE_BOOKED" : "REMOTE_BOOKED";
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      // Build appointment_time as timestamptz if scheduled
      let appointmentTimestamp: string | null = null;
      if (type === "SCHEDULED" && apptTime) {
        // apptTime is HH:MM, combine with today
        appointmentTimestamp = `${today}T${apptTime}:00`;
      }

      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({
          clinic_id: clinicId,
          source: source as any,
          type: type as any,
          visit_type: visitType as any,
          patient_phone: phone.trim(),
          patient_name: name.trim() || null,
          status: status as any,
          appointment_time: appointmentTimestamp,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Write audit log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({
        clinic_id: clinicId,
        ticket_id: ticket.id,
        action: "TICKET_CREATED" as any,
        actor_id: user?.id || null,
        new_status: status as any,
      });

      toast.success("Ticket created!");
      reset();
      setOpen(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />Create Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">Walk-in</SelectItem>
                  <SelectItem value="PHONE_CALL">Phone</SelectItem>
                  <SelectItem value="EXTERNAL">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Visit</Label>
              <Select value={visitType} onValueChange={setVisitType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSULTATION">Consultation</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Phone *</Label>
            <Input
              placeholder="+201000000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Patient Name</Label>
            <Input
              placeholder="Optional"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {type === "SCHEDULED" && (
            <div className="space-y-1">
              <Label>Appointment Time *</Label>
              <Input
                type="time"
                value={apptTime}
                onChange={(e) => setApptTime(e.target.value)}
              />
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
