import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose, DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, X, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";

interface AddLeadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketerId: string;
}

const AddLeadDrawer = ({ open, onOpenChange, marketerId }: AddLeadDrawerProps) => {
  const qc = useQueryClient();
  const [nameAr, setNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapsUrl, setMapsUrl] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  const scrollToField = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  const reset = () => {
    setNameAr(""); setPhone(""); setLocationNotes(""); setVisitDate(""); setVisitTime("");
    setLat(null); setLng(null); setMapsUrl("");
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        setLat(la);
        setLng(ln);
        setMapsUrl(`https://www.google.com/maps?q=${la},${ln}`);
        setGeoLoading(false);
        toast.success("تم تحديد الموقع!");
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) toast.error("تم رفض إذن الموقع. يرجى السماح من إعدادات المتصفح.");
        else if (err.code === 2) toast.error("تعذر تحديد الموقع. تأكد من تفعيل GPS.");
        else toast.error("انتهت مهلة تحديد الموقع. حاول مرة أخرى.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("marketer_leads" as any).insert({
        marketer_id: marketerId,
        name_ar: nameAr.trim(),
        phone: phone.trim() || null,
        location_notes: locationNotes.trim() || null,
        visit_date: visitDate || null,
        lat, lng,
        maps_url: mapsUrl.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت إضافة العيادة المحتملة");
      qc.invalidateQueries({ queryKey: ["marketer-pipeline"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("فشل الإضافة: " + e.message),
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]" dir="rtl">
        <DrawerHeader className="flex items-start justify-between">
          <div>
            <DrawerTitle className="text-base">إضافة عيادة محتملة</DrawerTitle>
            <DrawerDescription className="text-xs">أضف بيانات العيادة لمتابعتها لاحقاً</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><X className="h-4 w-4" /></Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-[40vh] space-y-4">
          <div className="space-y-1.5">
            <Label>اسم العيادة *</Label>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" placeholder="مثال: عيادة د. أحمد" onFocus={scrollToField} />
          </div>
          <div className="space-y-1.5">
            <Label>رقم الهاتف</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="01xxxxxxxxx" type="tel" onFocus={scrollToField} />
          </div>
          <div className="space-y-1.5">
            <Label>ملاحظات الموقع</Label>
            <Textarea value={locationNotes} onChange={(e) => setLocationNotes(e.target.value)} dir="rtl"
              rows={2} placeholder="الشارع، بجوار..." onFocus={scrollToField} />
          </div>
          <div className="space-y-1.5">
            <Label>تاريخ الزيارة المخطط</Label>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} onFocus={scrollToField} />
          </div>
          <div className="space-y-1.5">
            <Label>وقت الزيارة</Label>
            <Input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} onFocus={scrollToField} />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>موقع العيادة (اختياري)</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleGetLocation} disabled={geoLoading} className="w-full">
              <MapPin className="me-2 h-4 w-4" />
              {geoLoading ? "جاري تحديد الموقع..." : "استخدام موقعي الحالي"}
            </Button>
            {lat !== null && lng !== null && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>✓ تم تحديد الموقع</span>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />فتح على الخريطة
                </a>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">أو الصق رابط الخريطة</Label>
              <Input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} dir="ltr"
                placeholder="https://maps.google.com/..." className="text-xs" onFocus={scrollToField} />
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !nameAr.trim()}>
            <Plus className="me-2 h-4 w-4" />
            {mutation.isPending ? "جاري الإضافة..." : "إضافة"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default AddLeadDrawer;
