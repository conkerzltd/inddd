import { Link, useParams, useSearchParams } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { buildBreadcrumbSchema } from "@/components/seo/schema";
import { getCityBySlug, getSpecialtyBySlug } from "@/data/directory";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";
import { useLocale } from "@/i18n/useLocale";

const DoctorsCity = () => {
  const { specialty, city } = useParams();
  const [searchParams] = useSearchParams();
  const baseUrl = PUBLIC_BASE_URL;
  const { locale, localePath } = useLocale();
  const isAr = locale === "ar";
  const specialtyData = getSpecialtyBySlug(specialty);
  const cityData = getCityBySlug(city);
  const doctorQuery = searchParams.get("doctor");

  if (!specialtyData || !cityData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground">
            {isAr ? "الصفحة غير موجودة" : "Page not found"}
          </h1>
          <Link className="mt-4 inline-block text-sm text-primary" to={localePath("/doctors")}>
            {isAr ? "العودة للدليل" : "Back to directory"}
          </Link>
        </div>
      </div>
    );
  }

  const specName = isAr ? specialtyData.nameAr : specialtyData.name;
  const cityName = isAr ? cityData.nameAr : cityData.name;
  const canonical = `${baseUrl}/doctors/${specialtyData.slug}/${cityData.slug}`;

  const demoResults = Array.from({ length: 4 }).map((_, index) => ({
    name: isAr ? `د. ${specName} ${index + 1}` : `Dr. ${specialtyData.name} ${index + 1}`,
    clinic: isAr ? `مركز ${cityName} الطبي` : `${cityData.name} Care Center`,
    eta: isAr ? "أوقات الانتظار تظهر عبر رابط المريض" : "ETA ranges shown via patient link",
  }));

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={isAr ? `${specName} في ${cityName} | inddd` : `${specialtyData.name} in ${cityData.name} | inddd directory`}
        description={isAr ? `نتائج تجريبية لـ ${specName} في ${cityName}. النتائج المباشرة قريباً.` : `Demo listings for ${specialtyData.name} in ${cityData.name}. Live results coming soon.`}
        canonical={canonical}
        schema={buildBreadcrumbSchema([
          { name: isAr ? "الرئيسية" : "Home", item: `${baseUrl}/` },
          { name: isAr ? "الأطباء" : "Doctors", item: `${baseUrl}/doctors` },
          { name: specName, item: `${baseUrl}/doctors/${specialtyData.slug}` },
          { name: cityName, item: canonical },
        ])}
      />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {cityName}
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            {isAr ? `أطباء ${specName} في ${cityName}` : `${specialtyData.name} doctors in ${cityData.name}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? "نتائج تجريبية فقط. سيتم ربط النتائج المباشرة قريباً." : "Demo results only. Live clinic listings will be connected soon."}
          </p>
          {doctorQuery && (
            <p className="text-sm text-muted-foreground">
              {isAr ? "نتائج تجريبية لـ:" : "Showing demo results for:"}{" "}
              <span className="font-semibold">{doctorQuery}</span>
            </p>
          )}
        </div>
        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {isAr ? "المناطق" : "Areas"}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {cityData.areas.map((a) => (
              <Link
                key={a.slug}
                to={localePath(`/doctors/${specialtyData.slug}/${cityData.slug}/${a.slug}`)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
              >
                {isAr ? a.nameAr : a.name}
              </Link>
            ))}
          </div>
        </section>
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {demoResults.map((result) => (
            <div key={result.name} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground">{result.name}</h3>
              <p className="text-sm text-muted-foreground">{result.clinic}</p>
              <p className="mt-2 text-xs text-muted-foreground">{result.eta}</p>
              <span className="mt-3 inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {isAr ? "قريباً" : "Coming soon"}
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default DoctorsCity;
