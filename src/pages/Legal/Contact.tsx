import Seo from "@/components/seo/Seo";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";
import { useLocale } from "@/i18n/useLocale";

const Contact = () => {
  const baseUrl = PUBLIC_BASE_URL;
  const { locale } = useLocale();
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={isAr ? "تواصل معنا | inddd" : "Contact | inddd"}
        description={isAr ? "تواصل مع فريق inddd للاستفسارات." : "Contact the inddd team for clinic onboarding and product questions."}
        canonical={`${baseUrl}/contact`}
      />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground">
          {isAr ? "تواصل معنا" : "Contact"}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {isAr ? "راسلنا على " : "Email us at "}
          <a className="text-primary" href="mailto:hello@inddd.com">hello@inddd.com</a>
          {isAr ? ". سنرد خلال ١-٢ يوم عمل." : ". We will respond within 1-2 business days."}
        </p>
      </div>
    </div>
  );
};

export default Contact;
