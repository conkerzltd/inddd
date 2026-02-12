import { Link, useParams } from "react-router-dom";
import Seo from "@/components/seo/Seo";
import { buildBreadcrumbSchema } from "@/components/seo/schema";
import { cities, getSpecialtyBySlug } from "@/data/directory";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";

const DoctorsSpecialty = () => {
  const { specialty } = useParams();
  const baseUrl = PUBLIC_BASE_URL;
  const specialtyData = getSpecialtyBySlug(specialty);

  if (!specialtyData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground">Specialty not found</h1>
          <Link className="mt-4 inline-block text-sm text-primary" to="/doctors">
            Back to directory
          </Link>
        </div>
      </div>
    );
  }

  const canonical = `${baseUrl}/doctors/${specialtyData.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${specialtyData.name} doctors | inddd directory`}
        description={`Explore ${specialtyData.name} clinics by city. Live results will connect soon.`}
        canonical={canonical}
        schema={buildBreadcrumbSchema([
          { name: "Home", item: `${baseUrl}/` },
          { name: "Doctors", item: `${baseUrl}/doctors` },
          { name: specialtyData.name, item: canonical },
        ])}
      />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {specialtyData.name}
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            {specialtyData.name} doctors in Egypt
          </h1>
          <p className="text-sm text-muted-foreground">{specialtyData.intro}</p>
        </div>
        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Browse by city</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {cities.map((city) => (
              <Link
                key={city.slug}
                to={`/doctors/${specialtyData.slug}/${city.slug}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DoctorsSpecialty;
