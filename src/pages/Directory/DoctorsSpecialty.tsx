import { Link, useParams } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { buildBreadcrumbSchema } from "@/components/seo/schema";
import { cities, getSpecialtyBySlug } from "@/data/directory";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";
import { useLocale } from "@/i18n/useLocale";

const DoctorsSpecialty = () => {
  const { specialty } = useParams();
  const baseUrl = PUBLIC_BASE_URL;
  const { locale, localePath } = useLocale();
  const isAr = locale === "ar";
  const specialtyData = getSpecialtyBySlug(specialty);

  if (!specialtyData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground">
            {isAr ? "التخصص غير موجود" : "Specialty not found"}
          </h1>
          <Link className="mt-4 inline-block text-sm text-primary" to={localePath("/doctors")}>
            {isAr ? "العودة للدليل" : "Back to directory"}
          </Link>
        </div>
      </div>
    );
  }

  const displayName = isAr ? specialtyData.nameAr : specialtyData.name;
  const canonical = `${baseUrl}/doctors/${specialtyData.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${displayName} | inddd`}
        description={isAr ? `تصفح عيادات ${displayName} حسب المدينة.` : `Explore ${specialtyData.name} clinics by city. Live results will connect soon.`}
        canonical={canonical}
        schema={buildBreadcrumbSchema([
          { name: isAr ? "الرئيسية" : "Home", item: `${baseUrl}/` },
          { name: isAr ? "الأطباء" : "Doctors", item: `${baseUrl}/doctors` },
          { name: displayName, item: canonical },
        ])}
      />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {displayName}
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            {isAr ? `أطباء ${displayName} في مصر` : `${specialtyData.name} doctors in Egypt`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? specialtyData.introAr : specialtyData.intro}
          </p>
        </div>
        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {isAr ? "تصفح حسب المدينة" : "Browse by city"}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {cities.map((city) => (
              <Link
                key={city.slug}
                to={localePath(`/doctors/${specialtyData.slug}/${city.slug}`)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
              >
                {isAr ? city.nameAr : city.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DoctorsSpecialty;
