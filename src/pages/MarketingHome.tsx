import { useMemo } from "react";
import TopNav from "@/components/marketing/TopNav";
import HeroSearch from "@/components/marketing/HeroSearch";
import ValueProps from "@/components/marketing/ValueProps";
import SpecialtyGrid from "@/components/marketing/SpecialtyGrid";
import HowItWorks from "@/components/marketing/HowItWorks";
import ClinicCta from "@/components/marketing/ClinicCta";
import Faq from "@/components/marketing/Faq";
import Footer from "@/components/marketing/Footer";
import Seo from "@/components/seo/Seo";
import { buildWebsiteSchema } from "@/components/seo/schema";
import { cities, specialties } from "@/data/directory";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";
import { useLocale } from "@/i18n/useLocale";

const MarketingHome = () => {
  const { locale } = useLocale();
  const language = "ar";
  const baseUrl = PUBLIC_BASE_URL;

  const copy = useMemo(
    () =>
      language === "ar"
        ? {
            nav: {
              findDoctor: "ابحث عن طبيب",
              specialties: "التخصصات",
              forClinics: "للعيادات",
              howItWorks: "كيف يعمل",
              faq: "الاسئلة",
              ctaPrimary: "للعيادات: نظم يومك",
              ctaSecondary: "افتح رابط المريض",
            },
            hero: {
              title: "اعرف دورك ووقت الوصول قبل ما تخرج",
              subtitle:
                "المرضى يشوفوا الرقم الحالي وتقدير الانتظار. العيادات تنظم اليوم بدون مكالمات متكررة.",
              helper:
                "وضوح بسيط للمرضى، واستقرار اكبر لطاقم العيادة.",
              searchCta: "ابحث في الدليل",
              specialtyLabel: "التخصص",
              cityLabel: "المحافظة",
              areaLabel: "المنطقة",
              doctorLabel: "اسم الطبيب (اختياري)",
              note:
                "نتائج البحث تجريبية في النسخة الاولى. الصفحات جاهزة للسيو وسيتم ربط النتائج لاحقا.",
              patientLinkTitle: "رابط المريض يصل من العيادة",
              patientLinkBody:
                "يصل الرابط عبر واتساب. فتح الرابط يعرض الدور فقط ولا يعتبر تسجيل حضور.",
            },
          }
        : {
            nav: {
              findDoctor: "Find a doctor",
              specialties: "Specialties",
              forClinics: "For Clinics",
              howItWorks: "How it works",
              faq: "FAQ",
              ctaPrimary: "For Clinics: Run your day",
              ctaSecondary: "Open patient link",
            },
            hero: {
              title: "Know your turn and ETA before you leave",
              subtitle:
                "Patients see the live queue and ETA range. Clinics run the day without constant " +
                "\"When is my turn?\" calls.",
              helper:
                "Patients get clarity, clinics stay in control, and arrivals are smoother.",
              searchCta: "Search the directory",
              specialtyLabel: "Specialty",
              cityLabel: "City",
              areaLabel: "Area",
              doctorLabel: "Doctor name (optional)",
              note:
                "Results are a demo in V1. Directory pages are SEO-ready; live results connect soon.",
              patientLinkTitle: "Patient links come from the clinic",
              patientLinkBody:
                "Patients receive a WhatsApp link. Opening it shows the queue only; check-in stays at the desk.",
            },
          },
    [language]
  );

  return (
    <div className="min-h-screen bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
      <Seo
        title={language === "ar" ? "inddd | وضوح قائمة الانتظار للعيادات" : "inddd | Patients-first clinic queues"}
        description={language === "ar" ? "وضوح قائمة الانتظار للعيادات. اعرف دورك ووقت الوصول المتوقع قبل ما توصل." : "Patients-first queue clarity for clinics. See your turn and ETA range before you arrive."}
        canonical={`${baseUrl}/`}
        schema={buildWebsiteSchema(baseUrl)}
      />
      <TopNav labels={copy.nav} />
      <main>
        <div id="find-doctor">
          <HeroSearch specialties={specialties} cities={cities} labels={copy.hero} />
        </div>
        <ValueProps />
        <SpecialtyGrid
          specialties={specialties}
          title={language === "ar" ? "تخصصات شائعة" : "Popular specialties"}
          subtitle={language === "ar" ? "اختار تخصصك" : "Choose your specialty"}
        />
        <HowItWorks />
        <ClinicCta />
        <Faq />
      </main>
      <Footer />
    </div>
  );
};

export default MarketingHome;
