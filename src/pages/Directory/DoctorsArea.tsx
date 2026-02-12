import { Link, useParams, useSearchParams } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { buildBreadcrumbSchema } from "@/components/seo/schema";
import { getAreaBySlug, getCityBySlug, getSpecialtyBySlug } from "@/data/directory";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";
import { useLocale } from "@/i18n/useLocale";

const DoctorsArea = () => {
  const { specialty, city, area } = useParams();
  const [searchParams] = useSearchParams();
  const baseUrl = PUBLIC_BASE_URL;
  const { localePath } = useLocale();
  const specialtyData = getSpecialtyBySlug(specialty);
  const cityData = getCityBySlug(city);
  const areaData = getAreaBySlug(cityData, area);
  const doctorQuery = searchParams.get("doctor");

  if (!specialtyData || !cityData || !areaData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
          <Link className="mt-4 inline-block text-sm text-primary" to={localePath("/doctors")}>
            Back to directory
          </Link>
        </div>
      </div>
    );
  }

  const canonical = `${baseUrl}/doctors/${specialtyData.slug}/${cityData.slug}/${areaData.slug}`;

  const demoResults = Array.from({ length: 3 }).map((_, index) => ({
    name: `Dr. ${specialtyData.name} ${index + 1}`,
    clinic: `${areaData.name} Clinic`,
    eta: "ETA ranges shown via patient link",
  }));

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${specialtyData.name} in ${areaData.name}, ${cityData.name} | inddd`}
        description={`Demo listings for ${specialtyData.name} in ${areaData.name}. Live results coming soon.`}
        canonical={canonical}
        schema={buildBreadcrumbSchema([
          { name: "Home", item: `${baseUrl}/` },
          { name: "Doctors", item: `${baseUrl}/doctors` },
          { name: specialtyData.name, item: `${baseUrl}/doctors/${specialtyData.slug}` },
          { name: cityData.name, item: `${baseUrl}/doctors/${specialtyData.slug}/${cityData.slug}` },
          { name: areaData.name, item: canonical },
        ])}
      />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {areaData.name}
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            {specialtyData.name} doctors in {areaData.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Demo results only. Live clinic listings will be connected soon.
          </p>
          {doctorQuery && (
            <p className="text-sm text-muted-foreground">
              Showing demo results for: <span className="font-semibold">{doctorQuery}</span>
            </p>
          )}
        </div>
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {demoResults.map((result) => (
            <div key={result.name} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground">{result.name}</h3>
              <p className="text-sm text-muted-foreground">{result.clinic}</p>
              <p className="mt-2 text-xs text-muted-foreground">{result.eta}</p>
              <span className="mt-3 inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                Coming soon
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default DoctorsArea;
