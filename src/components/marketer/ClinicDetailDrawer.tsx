import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, ExternalLink, X, Clock, Building2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const DAYS_AR: Record<string, string> = {
  sat: "السبت", sun: "الأحد", mon: "الاثنين", tue: "الثلاثاء",
  wed: "الأربعاء", thu: "الخميس", fri: "الجمعة",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "مفعّلة", variant: "default" },
  pending: { label: "قيد المراجعة", variant: "secondary" },
  blocked: { label: "موقوفة", variant: "destructive" },
  draft: { label: "مسودة", variant: "outline" },
};

interface ClinicDetailDrawerProps {
  clinicId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ClinicDetailDrawer = ({ clinicId, open, onOpenChange }: ClinicDetailDrawerProps) => {
  const { data: clinic, isLoading } = useQuery({
    queryKey: ["marketer-clinic-detail", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_clinic_details_marketer", {
        p_clinic_id: clinicId!,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!clinicId && open,
  });

  const mapLink = clinic?.maps_url ||
    (clinic?.lat && clinic?.lng ? `https://www.google.com/maps?q=${clinic.lat},${clinic.lng}` : null);

  const location = [clinic?.governorate_ar, clinic?.locality_level2_ar, clinic?.locality_level3_ar]
    .filter(Boolean).join("، ");

  const st = statusLabels[clinic?.status] || statusLabels.draft;

  const workingHours = clinic?.working_hours_json as Record<string, { open: string; close: string } | null> | null;

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]" dir="rtl">
        <DrawerHeader className="flex items-start justify-between">
          <div>
            <DrawerTitle className="text-base">
              {clinic?.name_ar || clinic?.name || "تفاصيل العيادة"}
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              {clinic?.serial_id || "عرض تفاصيل العيادة"}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل…</div>
          ) : clinic ? (
            <>
              {/* Status & Specialty */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={st.variant}>{st.label}</Badge>
                {clinic.specialty_ar && <Badge variant="outline">{clinic.specialty_ar}</Badge>}
                {clinic.financial_status && (
                  <Badge variant="outline" className="text-xs">
                    {clinic.financial_status === "trial" ? "فترة تجربة" :
                     clinic.financial_status === "paid" ? "مدفوعة" : "متأخرة"}
                  </Badge>
                )}
              </div>

              {/* Location */}
              {location && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p>{location}</p>
                    {clinic.address_text && <p className="text-muted-foreground text-xs mt-1">{clinic.address_text}</p>}
                  </div>
                </div>
              )}

              {/* Map Link */}
              {mapLink && (
                <a href={mapLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" />فتح على الخريطة
                </a>
              )}

              {/* Map Preview */}
              {clinic.lat && clinic.lng && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <iframe
                    title="موقع العيادة"
                    width="100%" height="180" style={{ border: 0 }}
                    loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${clinic.lat},${clinic.lng}&z=16&output=embed`}
                  />
                </div>
              )}

              <Separator />

              {/* Phone Actions */}
              <div className="space-y-2">
                {clinic.whatsapp_local_1 && (
                  <a href={`tel:${clinic.whatsapp_local_1}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Phone className="h-4 w-4" />واتساب ١: {clinic.whatsapp_local_1}
                  </a>
                )}
                {clinic.whatsapp_local_2 && (
                  <a href={`tel:${clinic.whatsapp_local_2}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Phone className="h-4 w-4" />واتساب ٢: {clinic.whatsapp_local_2}
                  </a>
                )}
                {clinic.phone && (
                  <a href={`tel:${clinic.phone}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Phone className="h-4 w-4" />هاتف: {clinic.phone}
                  </a>
                )}
              </div>

              <Separator />

              {/* Working Hours */}
              {workingHours && Object.keys(workingHours).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-1">
                    <Clock className="h-4 w-4" />ساعات العمل
                  </p>
                  <div className="space-y-1">
                    {Object.entries(DAYS_AR).map(([key, label]) => {
                      const h = workingHours[key];
                      return (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{label}</span>
                          <span>{h ? `${h.open} - ${h.close}` : "مغلق"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Separator />

              {/* Dates */}
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>تاريخ التسجيل</span><span>{formatDate(clinic.created_at)}</span>
                </div>
                {clinic.approved_at && (
                  <div className="flex justify-between">
                    <span>تاريخ التفعيل</span><span>{formatDate(clinic.approved_at)}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">تعذر تحميل البيانات</div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ClinicDetailDrawer;
