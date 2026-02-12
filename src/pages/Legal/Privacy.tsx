import Seo from "@/components/seo/Seo";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";
import { useLocale } from "@/i18n/useLocale";

const Privacy = () => {
  const baseUrl = PUBLIC_BASE_URL;
  const { locale } = useLocale();
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={isAr ? "سياسة الخصوصية | inddd" : "Privacy Policy | inddd"}
        description={isAr ? "تعرف على كيفية تعامل inddd مع خصوصية بيانات المرضى والعيادات." : "Learn how inddd handles data privacy for patients and clinics."}
        canonical={`${baseUrl}/privacy`}
      />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground">
          {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {isAr
            ? "هذه صفحة مؤقتة لسياسة الخصوصية. سيتم نشر السياسة الكاملة قبل الإطلاق."
            : "This is a placeholder privacy policy page. We will publish full privacy terms before launch."}
        </p>
      </div>
    </div>
  );
};

export default Privacy;
