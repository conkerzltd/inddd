import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/i18n/useLocale";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ArrowRight,
  CheckCircle,
  XCircle,
  Building2,
  MapPin,
  Stethoscope,
  Users,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";

type PendingClinic = {
  id: string;
  name_ar: string | null;
  name: string;
  serial_id: string | null;
  governorate_ar: string | null;
  locality_level2_ar: string | null;
  locality_level3_ar: string | null;
  phone: string | null;
  created_at: string;
  status: string;
  primary_specialty_id: string | null;
  marketer_id: string | null;
  specialty?: { specialty_ar: string } | null;
  marketer?: { name: string; referral_code: string; primary_phone: string } | null;
};

const ClinicApprovals = () => {
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    clinicId: string;
    clinicName: string;
    action: "active" | "blocked";
  } | null>(null);

  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ["pending-clinics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("*, specialty:specialties!clinics_primary_specialty_id_fkey(specialty_ar), marketer:marketers!clinics_marketer_id_fkey(name, referral_code, primary_phone), serial_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PendingClinic[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("clinics")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-clinics"] });
      toast({ title: "تم تحديث حالة العيادة" });
      setConfirmDialog(null);
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  // Filter out "draft" clinics — only show submitted ones
  const pending = clinics.filter((c) => c.status === "pending");
  const approved = clinics.filter((c) => c.status === "active");
  const rejected = clinics.filter((c) => c.status === "blocked");
  const visibleClinics = clinics.filter((c) => c.status !== "draft");

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const renderClinicCard = (clinic: PendingClinic) => (
    <Card key={clinic.id} className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold text-foreground">
              {clinic.name_ar || clinic.name}
            </h3>
            {clinic.serial_id && (
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{clinic.serial_id}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  clinic.status === "pending"
                    ? "secondary"
                    : clinic.status === "active"
                    ? "default"
                    : "destructive"
                }
              >
                {clinic.status === "pending"
                  ? "قيد المراجعة"
                  : clinic.status === "active"
                  ? "مفعّلة"
                  : "مرفوضة"}
              </Badge>
            </div>
          </div>
          {clinic.status === "pending" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="default"
                onClick={() =>
                  setConfirmDialog({
                    open: true,
                    clinicId: clinic.id,
                    clinicName: clinic.name_ar || clinic.name,
                    action: "active",
                  })
                }
              >
                <CheckCircle className="h-4 w-4 me-1" />
                قبول
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  setConfirmDialog({
                    open: true,
                    clinicId: clinic.id,
                    clinicName: clinic.name_ar || clinic.name,
                    action: "blocked",
                  })
                }
              >
                <XCircle className="h-4 w-4 me-1" />
                رفض
              </Button>
            </div>
          )}
          {clinic.status !== "pending" && (
            <div className="flex items-center gap-2 shrink-0">
              {clinic.status === "blocked" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      clinicId: clinic.id,
                      clinicName: clinic.name_ar || clinic.name,
                      action: "active",
                    })
                  }
                >
                  إعادة تفعيل
                </Button>
              )}
              {clinic.status === "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      clinicId: clinic.id,
                      clinicName: clinic.name_ar || clinic.name,
                      action: "blocked",
                    })
                  }
                >
                  تعطيل
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground">
          {clinic.specialty && (
            <div className="flex items-center gap-2">
              <Stethoscope className="h-3.5 w-3.5 shrink-0" />
              <span>{clinic.specialty.specialty_ar}</span>
            </div>
          )}
          {(clinic.governorate_ar || clinic.locality_level2_ar) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>
                {[clinic.governorate_ar, clinic.locality_level2_ar, clinic.locality_level3_ar]
                  .filter(Boolean)
                  .join("، ")}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{formatDate(clinic.created_at)}</span>
          </div>
          {clinic.marketer && (
            <div className="mt-2 p-2 rounded-md bg-muted/50 border">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="font-medium text-foreground text-xs">المسوق المرتبط</span>
              </div>
              <div className="text-xs space-y-0.5">
                <p>{clinic.marketer.name}</p>
                <p className="font-mono">{clinic.marketer.referral_code}</p>
                <p dir="ltr" className="text-start">{clinic.marketer.primary_phone}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(localePath("/ad"))}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">الموافقات</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {/* Stats */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-secondary-foreground">{pending.length}</p>
              <p className="text-xs text-muted-foreground">قيد المراجعة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{approved.length}</p>
              <p className="text-xs text-muted-foreground">مفعّلة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{rejected.length}</p>
              <p className="text-xs text-muted-foreground">مرفوضة</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">جاري التحميل…</div>
        ) : visibleClinics.length === 0 ? (
          <div className="text-center py-10">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-2 text-muted-foreground">لا توجد عيادات مسجلة بعد</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-foreground mb-3">
                  قيد المراجعة ({pending.length})
                </h2>
                <div className="space-y-3">{pending.map(renderClinicCard)}</div>
              </section>
            )}
            {approved.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-foreground mb-3">
                  مفعّلة ({approved.length})
                </h2>
                <div className="space-y-3">{approved.map(renderClinicCard)}</div>
              </section>
            )}
            {rejected.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-foreground mb-3">
                  مرفوضة ({rejected.length})
                </h2>
                <div className="space-y-3">{rejected.map(renderClinicCard)}</div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Confirm Dialog */}
      <Dialog
        open={!!confirmDialog?.open}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === "active" ? "تأكيد القبول" : "تأكيد الرفض"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.action === "active"
                ? `هل تريد الموافقة على عيادة "${confirmDialog?.clinicName}"؟ سيتم تفعيلها فوراً.`
                : `هل تريد رفض عيادة "${confirmDialog?.clinicName}"؟`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              إلغاء
            </Button>
            <Button
              variant={confirmDialog?.action === "active" ? "default" : "destructive"}
              disabled={updateStatus.isPending}
              onClick={() =>
                confirmDialog &&
                updateStatus.mutate({
                  id: confirmDialog.clinicId,
                  status: confirmDialog.action,
                })
              }
            >
              {updateStatus.isPending
                ? "جاري التحديث…"
                : confirmDialog?.action === "active"
                ? "تأكيد القبول"
                : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClinicApprovals;
