import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EgyptPhoneInput } from "@/components/inputs/EgyptPhoneInput";
import { isValidEg10, toEgE164Digits } from "@/utils/phoneEG";

interface Props {
  clinicId: string;
  onCreated: () => void;
}

interface BookingApp { id: string; code: string; label_en: string; }

export function CreateTicketDialog({ clinicId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [source, setSource] = useState<string>("WALK_IN");
  const [type, setType] = useState<string>("NORMAL");
  const [visitType, setVisitType] = useState<string>("CONSULTATION");
  const [phone10, setPhone10] = useState("");
  const [name, setName] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [extAppId, setExtAppId] = useState<string>("");
  const [extAppOther, setExtAppOther] = useState("");
  const [bookingApps, setBookingApps] = useState<BookingApp[]>([]);

  useEffect(() => {
    supabase
      .from("external_booking_apps")
      .select("id, code, label_en")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => { if (data) setBookingApps(data); });
  }, []);

  const selectedAppCode = bookingApps.find((a) => a.id === extAppId)?.code;

  const reset = () => {
    setSource("WALK_IN");
    setType("NORMAL");
    setVisitType("CONSULTATION");
    setPhone10("");
    setName("");
    setApptTime("");
    setPhoneError("");
    setExtAppId("");
    setExtAppOther("");
  };

  const handleSubmit = async () => {
    if (!isValidEg10(phone10)) {
      setPhoneError("أدخل ١٠ أرقام.");
      return;
    }
    setPhoneError("");
    if (!name.trim()) {
      toast.error("اسم المريض مطلوب");
      return;
    }
    if (type === "SCHEDULED" && !apptTime) {
      toast.error("وقت الموعد مطلوب للتذاكر بميعاد");
      return;
    }
    if (source === "EXTERNAL" && !extAppId) {
      toast.error("تطبيق الحجز الخارجي مطلوب");
      return;
    }
    if (source === "EXTERNAL" && selectedAppCode === "OTHER" && !extAppOther.trim()) {
      toast.error("اسم التطبيق الآخر مطلوب");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_ticket", {
        p_clinic_id: clinicId,
        p_source: source as any,
        p_type: type as any,
        p_visit_type: visitType as any,
        p_patient_phone: toEgE164Digits(phone10),
        p_patient_name: name.trim(),
        p_appt_hhmm: type === "SCHEDULED" ? apptTime : null,
        p_external_booking_app_id: source === "EXTERNAL" && extAppId ? extAppId : null,
        p_external_booking_app_other: source === "EXTERNAL" && selectedAppCode === "OTHER" ? extAppOther : null,
      });
      if (error) throw error;
      toast.success("تم إنشاء التذكرة!");
      reset();
      setOpen(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "فشل إنشاء التذكرة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 ml-1" />إنشاء تذكرة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إنشاء تذكرة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>المصدر</Label>
              <Select value={source} onValueChange={(v) => { setSource(v); if (v !== "EXTERNAL") { setExtAppId(""); setExtAppOther(""); } }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">حضور مباشر</SelectItem>
                  <SelectItem value="PHONE_CALL">تليفون</SelectItem>
                  <SelectItem value="EXTERNAL">خارجي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>النوع</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">عادي</SelectItem>
                  <SelectItem value="SCHEDULED">ميعاد</SelectItem>
                  <SelectItem value="URGENT">عاجل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>الزيارة</Label>
              <Select value={visitType} onValueChange={setVisitType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">جديد</SelectItem>
                  <SelectItem value="CONSULTATION">استشارة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <EgyptPhoneInput
            label="الهاتف *"
            value10={phone10}
            onChange10={setPhone10}
            required
            error={phoneError}
          />

          <div className="space-y-1">
            <Label>اسم المريض *</Label>
            <Input
              placeholder="اسم المريض"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {type === "SCHEDULED" && (
            <div className="space-y-1">
              <Label>وقت الموعد *</Label>
              <Input
                type="time"
                value={apptTime}
                onChange={(e) => setApptTime(e.target.value)}
              />
            </div>
          )}

          {source === "EXTERNAL" && bookingApps.length > 0 && (
            <>
              <div className="space-y-1">
                <Label>تطبيق الحجز الخارجي *</Label>
                <Select value={extAppId} onValueChange={(v) => { setExtAppId(v); if (bookingApps.find((a) => a.id === v)?.code !== "OTHER") setExtAppOther(""); }}>
                  <SelectTrigger><SelectValue placeholder="اختر التطبيق…" /></SelectTrigger>
                  <SelectContent>
                    {bookingApps.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.label_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedAppCode === "OTHER" && (
                <div className="space-y-1">
                  <Label>اسم التطبيق الآخر *</Label>
                  <Input
                    placeholder="مثال: DocDoc"
                    value={extAppOther}
                    onChange={(e) => setExtAppOther(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "جاري الإنشاء…" : "إنشاء تذكرة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
