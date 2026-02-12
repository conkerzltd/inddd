import Seo from "@/components/seo/Seo";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";
import { useLocale } from "@/i18n/useLocale";

const Terms = () => {
  const baseUrl = PUBLIC_BASE_URL;
  const { locale } = useLocale();
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={isAr ? "شروط الاستخدام | inddd" : "Terms of Service | inddd"}
        description={isAr ? "اقرأ شروط استخدام inddd." : "Read the terms of service for using inddd."}
        canonical={`${baseUrl}/terms`}
      />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground">
          {isAr ? "شروط الاستخدام" : "Terms of Service"}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {isAr
            ? "هذه صفحة مؤقتة للشروط. سيتم نشر الشروط الكاملة قبل الإطلاق."
            : "This is a placeholder terms page. We will publish full terms before launch."}
        </p>
      </div>
    </div>
  );
};

export default Terms;
