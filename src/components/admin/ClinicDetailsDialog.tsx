import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  MapPin,
  Phone,
  Stethoscope,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Calendar,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

const DAYS_MAP: Record<string, string> = {
  sat: "السبت",
  sun: "الأحد",
  mon: "الاثنين",
  tue: "الثلاثاء",
  wed: "الأربعاء",
  thu: "الخميس",
  fri: "الجمعة",
};

type WorkingHours = Record<string, { open: string; close: string } | null>;

interface ClinicDetailsDialogProps {
  clinicId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Show approve/reject buttons for pending clinics */
  showApproval?: boolean;
  /** Show delete button */
  showDelete?: boolean;
  onApprove?: (clinicId: string) => void;
  onSuspend?: (clinicId: string) => void;
  onDelete?: (clinicId: string) => void;
  approving?: boolean;
  suspending?: boolean;
  deleting?: boolean;
}

const ClinicDetailsDialog = ({
  clinicId,
  open,
  onOpenChange,
  showApproval,
  showDelete,
  onApprove,
  onSuspend,
  onDelete,
  approving,
  suspending,
  deleting,
}: ClinicDetailsDialogProps) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: clinic, isLoading } = useQuery({
    queryKey: ["admin-clinic-details", clinicId],
    queryFn: async () => {
      if (!clinicId) return null;
      const { data, error } = await supabase
        .from("clinics")
        .select("*, specialty:specialties!clinics_primary_specialty_id_fkey(specialty_ar), marketer:marketers!clinics_marketer_id_fkey(id, name, referral_code, primary_phone)")
        .eq("id", clinicId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clinicId && open,
  });

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const workingHours = (clinic?.working_hours_json as WorkingHours) || {};

  const statusLabels: Record<string, string> = {
    active: "مفعّلة",
    pending: "قيد المراجعة",
    blocked: "موقوفة",
    draft: "مسودة",
  };

  const clinicName = clinic?.name_ar || clinic?.name || "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              تفاصيل العيادة
            </DialogTitle>
            <DialogDescription>{clinicName}</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">جاري التحميل…</div>
          ) : !clinic ? (
            <div className="py-8 text-center text-muted-foreground">لم يتم العثور على العيادة</div>
          ) : (
            <div className="space-y-4" dir="rtl">
              {/* Basic Info */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">البيانات الأساسية</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">الاسم (عربي):</span>
                    <p className="font-medium">{clinic.name_ar || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الاسم (إنجليزي):</span>
                    <p className="font-medium">{clinic.name || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الكود:</span>
                    <p className="font-mono">{clinic.serial_id || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الحالة:</span>
                    <p><Badge variant={clinic.status === "active" ? "default" : clinic.status === "blocked" ? "destructive" : "secondary"}>{statusLabels[clinic.status] || clinic.status}</Badge></p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Contact */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />التواصل</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">واتساب ١:</span>
                    <p dir="ltr" className="text-start">{clinic.whatsapp_local_1 || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">واتساب ٢:</span>
                    <p dir="ltr" className="text-start">{clinic.whatsapp_local_2 || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">هاتف:</span>
                    <p dir="ltr" className="text-start">{clinic.phone || "—"}</p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Specialty */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" />التخصص</h3>
                <p className="text-sm">{clinic.specialty?.specialty_ar || "—"}</p>
              </section>

              <Separator />

              {/* Location */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />الموقع</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">المحافظة:</span>
                    <p>{clinic.governorate_ar || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">المدينة/المركز:</span>
                    <p>{clinic.locality_level2_ar || "—"}</p>
                  </div>
                  {clinic.locality_level3_ar && (
                    <div>
                      <span className="text-muted-foreground">القرية:</span>
                      <p>{clinic.locality_level3_ar}</p>
                    </div>
                  )}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">العنوان التفصيلي:</span>
                  <p>{clinic.address_text || "—"}</p>
                </div>
                {clinic.maps_url && (
                  <a href={clinic.maps_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">فتح في خرائط جوجل</a>
                )}
                {clinic.lat && clinic.lng && (
                  <p className="text-xs text-muted-foreground">الإحداثيات: {Number(clinic.lat).toFixed(4)}, {Number(clinic.lng).toFixed(4)}</p>
                )}
              </section>

              <Separator />

              {/* Working Hours */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />ساعات العمل</h3>
                {Object.keys(workingHours).length === 0 ? (
                  <p className="text-sm text-muted-foreground">لم يتم تحديد ساعات العمل</p>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(DAYS_MAP).map(([key, label]) => {
                      const h = workingHours[key];
                      if (!h) return null;
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <span className="w-16 text-muted-foreground">{label}</span>
                          <span dir="ltr">{h.open} – {h.close}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <Separator />

              {/* Marketer */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />المسوق</h3>
                {clinic.marketer ? (
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">الاسم:</span> {clinic.marketer.name}</p>
                    <p><span className="text-muted-foreground">الكود:</span> {clinic.marketer.referral_code}</p>
                    <p><span className="text-muted-foreground">الهاتف:</span> <span dir="ltr">{clinic.marketer.primary_phone}</span></p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">بدون مسوق</p>
                )}
              </section>

              <Separator />

              {/* Dates */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />التواريخ</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">تاريخ التسجيل:</span>
                    <p>{formatDate(clinic.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">تاريخ التفعيل:</span>
                    <p>{formatDate(clinic.approved_at)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الاستحقاق التالي:</span>
                    <p>{formatDate(clinic.next_billing_date)}</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {clinic && (
            <DialogFooter className="gap-2 flex-wrap">
              {showDelete && onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="me-auto"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 me-1" />حذف العيادة نهائيًا
                </Button>
              )}
              {showApproval && clinic.status === "pending" && (
                <>
                  {onSuspend && (
                    <Button variant="outline" size="sm" onClick={() => onSuspend(clinic.id)} disabled={suspending}>
                      <XCircle className="h-4 w-4 me-1" />رفض
                    </Button>
                  )}
                  {onApprove && (
                    <Button size="sm" onClick={() => onApprove(clinic.id)} disabled={approving}>
                      <CheckCircle className="h-4 w-4 me-1" />{approving ? "جاري التفعيل…" : "قبول وتفعيل"}
                    </Button>
                  )}
                </>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف العيادة نهائيًا</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف عيادة "{clinicName}" نهائيًا؟ سيتم حذف جميع البيانات المرتبطة (التذاكر، سجلات الدفع، الأدوار، السجلات). لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (clinicId && onDelete) onDelete(clinicId);
                setDeleteConfirmOpen(false);
              }}
            >
              {deleting ? "جاري الحذف…" : "حذف نهائيًا"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClinicDetailsDialog;
