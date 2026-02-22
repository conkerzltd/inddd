import { Link } from "react-router-dom";
import { useLocale } from "@/i18n/useLocale";

const Footer = () => {
  const { locale, localePath } = useLocale();
  const isAr = locale === "ar";

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto flex flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">inddd</p>
          <p className="text-xs text-muted-foreground">
            {isAr ? "وضوح قائمة الانتظار للعيادات، المريض أولاً." : "Patients-first queue clarity for clinics."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Link to={localePath("/privacy")} className="hover:text-foreground">
            {isAr ? "الخصوصية" : "Privacy"}
          </Link>
          <Link to={localePath("/terms")} className="hover:text-foreground">
            {isAr ? "الشروط" : "Terms"}
          </Link>
          <Link to={localePath("/contact")} className="hover:text-foreground">
            {isAr ? "تواصل معنا" : "Contact"}
          </Link>
          <Link to="/ad" className="hover:text-foreground">
            لوحة الإدارة
          </Link>
          <Link to="/m" className="hover:text-foreground">
            لوحة المسوق
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
