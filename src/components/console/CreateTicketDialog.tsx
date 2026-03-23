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
import { Plus, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SOURCE_LABELS } from "@/utils/ticketSource";
import { toast } from "sonner";
import { EgyptPhoneInput } from "@/components/inputs/EgyptPhoneInput";
import { isValidEg10, toEgE164Digits } from "@/utils/phoneEG";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";

interface Props {
  clinicId: string;
  clinicName: string;
  onCreated: (ticketId?: string) => void;
}

interface BookingApp { id: string; code: string; label_en: string; }

export function CreateTicketDialog({ clinicId, clinicName, onCreated }: Props) {
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

  const hasValidPhone = isValidEg10(phone10);

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

  const validate = (requirePhone: boolean): boolean => {
    if (requirePhone && !hasValidPhone) {
      setPhoneError("أدخل ١٠ أرقام.");
      return false;
    }
    if (!requirePhone && phone10.length > 0 && !hasValidPhone) {
      setPhoneError("أدخل ١٠ أرقام أو اترك الحقل فارغاً.");
      return false;
    }
    setPhoneError("");
    if (!name.trim()) {
      toast.error("اسم المريض مطلوب");
      return false;
    }
    if (type === "SCHEDULED" && !apptTime) {
      toast.error("وقت الموعد مطلوب للتذاكر بميعاد");
      return false;
    }
    if (source === "EXTERNAL" && !extAppId) {
      toast.error("تطبيق الحجز الخارجي مطلوب");
      return false;
    }
    if (source === "EXTERNAL" && selectedAppCode === "OTHER" && !extAppOther.trim()) {
      toast.error("اسم التطبيق الآخر مطلوب");
      return false;
    }
    return true;
  };

  const createTicket = async (): Promise<string | null> => {
    const nowHHMM = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    const patientPhone = hasValidPhone ? toEgE164Digits(phone10) : "0000000000";
    const { data, error } = await supabase.rpc("create_ticket", {
      p_clinic_id: clinicId,
      p_source: source as any,
      p_type: type as any,
      p_visit_type: visitType as any,
      p_patient_phone: patientPhone,
      p_patient_name: name.trim(),
      p_appt_hhmm: type === "SCHEDULED" ? apptTime : (source === "WALK_IN" ? nowHHMM : null),
      p_external_booking_app_id: source === "EXTERNAL" && extAppId ? extAppId : null,
      p_external_booking_app_other: source === "EXTERNAL" && selectedAppCode === "OTHER" ? extAppOther : null,
    });
    if (error) throw error;
    const ticketId = (data as any)?.ticket_id;
    if (!ticketId) throw new Error("لم يتم إرجاع معرف التذكرة");
    return ticketId;
  };

  /** Create ticket only (no WhatsApp) */
  const handleCreateOnly = async () => {
    if (!validate(false)) return;
    setSubmitting(true);
    try {
      const ticketId = await createTicket();
      if (ticketId && hasValidPhone) {
        // Generate link silently but don't open WhatsApp
        await supabase.rpc("send_patient_link", { p_ticket_id: ticketId }).catch(() => {});
      }
      toast.success("تم إنشاء التذكرة!");
      reset();
      setOpen(false);
      onCreated(ticketId);
    } catch (e: any) {
      toast.error(e.message || "فشل إنشاء التذكرة");
    } finally {
      setSubmitting(false);
    }
  };

  /** Create ticket + open WhatsApp */
  const handleCreateAndSend = async () => {
    if (!validate(true)) return;
    setSubmitting(true);
    const popup = window.open("about:blank", "_blank");
    try {
      const ticketId = await createTicket();

      const { data: linkData, error: linkError } = await supabase.rpc("send_patient_link", {
        p_ticket_id: ticketId!,
      });
      if (linkError) {
        toast.warning("تم إنشاء التذكرة لكن فشل إرسال الرابط: " + linkError.message);
        if (popup) popup.close();
      } else {
        const token = (linkData as any)?.token;
        if (token) {
          const patientLink = `${PUBLIC_BASE_URL}/q/${token}`;
          if (/lovableproject\.com|lovable\.dev/i.test(patientLink)) {
            if (popup) popup.close();
            toast.error("خطأ في إعداد الرابط. روابط المرضى يجب أن تستخدم https://inddd.com");
          } else {
            const patientPhone = toEgE164Digits(phone10);
            const message = `اضغط على الرابط لمتابعة دورك ووقت الانتظار المتوقع في ${clinicName}: ${patientLink}`;
            const encodedMessage = encodeURIComponent(message);
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            const waUrl = isMobile
              ? `https://wa.me/${patientPhone}?text=${encodedMessage}`
              : `https://web.whatsapp.com/send?phone=${patientPhone}&text=${encodedMessage}`;
            if (popup) { popup.location.href = waUrl; } else { window.location.href = waUrl; }
            toast.success("تم إنشاء التذكرة وفتح رابط الإرسال!");
          }
        } else {
          if (popup) popup.close();
          toast.success("تم إنشاء التذكرة!");
        }
      }

      reset();
      setOpen(false);
      onCreated(ticketId);
    } catch (e: any) {
      if (popup) popup.close();
      toast.error(e.message || "فشل إنشاء التذكرة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 me-1" />إنشاء تذكرة
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
              <Select value={source} onValueChange={(v) => {
                setSource(v);
                if (v !== "EXTERNAL") { setExtAppId(""); setExtAppOther(""); }
                if (v === "WALK_IN" && type === "SCHEDULED") { setType("NORMAL"); setApptTime(""); }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>نوع الكشف</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {source !== "WALK_IN" && <SelectItem value="SCHEDULED">ميعاد</SelectItem>}
                  <SelectItem value="NORMAL">عادي</SelectItem>
                  <SelectItem value="URGENT">مستعجل</SelectItem>
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
            label="الهاتف"
            value10={phone10}
            onChange10={setPhone10}
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

          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={handleCreateOnly} disabled={submitting}>
              <Plus className="h-4 w-4 me-1" />
              {submitting ? "جاري…" : "إنشاء فقط"}
            </Button>
            <Button className="flex-1" onClick={handleCreateAndSend} disabled={submitting || !hasValidPhone}>
              <Send className="h-4 w-4 me-1" />
              {submitting ? "جاري…" : "إنشاء وإرسال"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
