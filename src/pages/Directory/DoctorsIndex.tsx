import { Link } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { buildBreadcrumbSchema } from "@/components/seo/schema";
import { cities, specialties } from "@/data/directory";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";
import { useLocale } from "@/i18n/useLocale";

const DoctorsIndex = () => {
  const baseUrl = PUBLIC_BASE_URL;
  const { locale, localePath } = useLocale();
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={isAr ? "ابحث عن أطباء حسب التخصص والمدينة | inddd" : "Find doctors by specialty and city | inddd"}
        description={isAr ? "تصفح دليل التخصصات والمدن. النتائج المباشرة قريباً." : "Browse a SEO-ready directory of specialties and cities. Live clinic results are coming soon."}
        canonical={`${baseUrl}/doctors`}
        schema={buildBreadcrumbSchema([
          { name: isAr ? "الرئيسية" : "Home", item: `${baseUrl}/` },
          { name: isAr ? "الأطباء" : "Doctors", item: `${baseUrl}/doctors` },
        ])}
      />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {isAr ? "الدليل" : "Directory"}
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            {isAr ? "ابحث عن أطباء حسب التخصص" : "Find doctors by specialty"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "هذا دليل تجريبي للسيو. سيتم ربط النتائج المباشرة قريباً."
              : "This is a demo directory for SEO. Live clinic availability will be connected soon."}
          </p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">
              {isAr ? "التخصصات" : "Specialties"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {specialties.map((item) => (
                <Link
                  key={item.slug}
                  to={localePath(`/doctors/${item.slug}`)}
                  className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:border-primary/60"
                >
                  {isAr ? item.nameAr : item.name}
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">
              {isAr ? "المدن" : "Cities"}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {cities.map((city) => (
                <span
                  key={city.slug}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                >
                  {isAr ? city.nameAr : city.name}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DoctorsIndex;
