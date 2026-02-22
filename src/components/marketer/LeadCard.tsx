import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin, Phone, ExternalLink, CalendarDays, Copy, Check, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_visit: { label: "بانتظار الزيارة", variant: "secondary" },
  follow_up: { label: "متابعة", variant: "default" },
  not_interested: { label: "غير مهتم", variant: "destructive" },
  converted: { label: "تم التسجيل", variant: "outline" },
};

interface LeadCardProps {
  lead: any;
  referralCode: string;
  isArchive?: boolean;
}

const LeadCard = ({ lead, referralCode, isArchive }: LeadCardProps) => {
  const qc = useQueryClient();
  const [showFollowup, setShowFollowup] = useState(false);
  const [followupDate, setFollowupDate] = useState("");
  const [copied, setCopied] = useState(false);

  const updateLead = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from("marketer_leads" as any)
        .update(updates as any)
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketer-pipeline"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const mapLink = lead.maps_url ||
    (lead.lat && lead.lng ? `https://www.google.com/maps?q=${lead.lat},${lead.lng}` : null);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }) : null;

  const handleCopyLink = async () => {
    const link = `${PUBLIC_BASE_URL}/onboarding?ref=${referralCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("تم نسخ رابط التسجيل");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFollowup = () => {
    if (!followupDate) { toast.error("اختر تاريخ المتابعة"); return; }
    updateLead.mutate({ status: "follow_up", followup_date: followupDate });
    setShowFollowup(false);
    setFollowupDate("");
    toast.success("تم تسجيل المتابعة");
  };

  const st = statusConfig[lead.status] || statusConfig.pending_visit;

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">{lead.name_ar}</p>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>

        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Phone className="h-3 w-3" />{lead.phone}
          </a>
        )}

        {lead.location_notes && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />{lead.location_notes}
          </p>
        )}

        {mapLink && (
          <a href={mapLink} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />الخريطة
          </a>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {lead.visit_date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />زيارة: {formatDate(lead.visit_date)}
            </span>
          )}
          {lead.followup_date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />متابعة: {formatDate(lead.followup_date)}
            </span>
          )}
        </div>

        {/* Actions */}
        {!isArchive ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button variant="outline" size="sm" className="text-xs h-7"
              onClick={() => setShowFollowup(!showFollowup)}>
              تسجيل متابعة
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7"
              onClick={() => { updateLead.mutate({ status: "not_interested" }); toast.success("تم النقل للأرشيف"); }}>
              غير مهتم
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7"
              onClick={() => { updateLead.mutate({ status: "converted" }); toast.success("تم التسجيل"); }}>
              تم التسجيل
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleCopyLink}>
              {copied ? <Check className="h-3 w-3 me-1" /> : <Copy className="h-3 w-3 me-1" />}
              نسخ رابط التسجيل
            </Button>
          </div>
        ) : (
          <div className="flex gap-1.5 pt-1">
            {lead.status === "not_interested" && (
              <Button variant="outline" size="sm" className="text-xs h-7"
                onClick={() => { updateLead.mutate({ status: "pending_visit" }); toast.success("تم إرجاع العيادة للمهام"); }}>
                <Undo2 className="h-3 w-3 me-1" />إعادة للمهام
              </Button>
            )}
          </div>
        )}

        {/* Followup date picker */}
        {showFollowup && (
          <div className="flex items-center gap-2 pt-1">
            <Input type="date" value={followupDate} onChange={(e) => setFollowupDate(e.target.value)} className="text-xs h-8" />
            <Button size="sm" className="h-8 text-xs" onClick={handleFollowup}>تأكيد</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadCard;
