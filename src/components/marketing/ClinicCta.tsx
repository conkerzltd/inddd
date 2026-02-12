import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/useLocale";

const ClinicCta = () => {
  const { locale, localePath } = useLocale();
  const isAr = locale === "ar";

  return (
    <section id="for-clinics" className="bg-gradient-to-r from-[#f2ecff] via-white to-[#efe8ff]">
      <div className="container mx-auto flex flex-col items-start gap-6 px-4 py-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {isAr ? "للعيادات" : "For clinics"}
          </p>
          <h2 className="text-3xl font-bold text-foreground">
            {isAr ? "نظّم يوم عيادتك بطابور واحد مباشر" : "Run your clinic day with one live queue"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "خلي المرضى على اطلاع، وفريقك مرتاح، وتعامل مع الحالات الواقعية بدون تخمين."
              : "Keep patients informed, keep your team calm, and handle real-world flow without guesswork."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link to={localePath("/login")}>
              {isAr ? "للعيادات: نظم يومك" : "For Clinics: Run your day"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href="mailto:hello@inddd.com">
              {isAr ? "اطلب عرض توضيحي" : "Request a demo"}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ClinicCta;
