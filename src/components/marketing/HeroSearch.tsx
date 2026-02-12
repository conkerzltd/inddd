import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { City, Specialty } from "@/data/directory";

export type HeroSearchLabels = {
  title: string;
  subtitle: string;
  helper: string;
  searchCta: string;
  specialtyLabel: string;
  cityLabel: string;
  areaLabel: string;
  doctorLabel: string;
  note: string;
  patientLinkTitle: string;
  patientLinkBody: string;
};

type HeroSearchProps = {
  specialties: Specialty[];
  cities: City[];
  labels: HeroSearchLabels;
};

const HeroSearch = ({ specialties, cities, labels }: HeroSearchProps) => {
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [doctor, setDoctor] = useState("");

  const areaOptions = useMemo(() => {
    const selectedCity = cities.find((item) => item.slug === city);
    return selectedCity?.areas ?? [];
  }, [cities, city]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (doctor.trim()) params.set("doctor", doctor.trim());

    let path = "/doctors";
    if (specialty) path += `/${specialty}`;
    if (specialty && city) path += `/${city}`;
    if (specialty && city && area) path += `/${area}`;

    navigate(`${path}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#f4f1fb] to-[#e8e1fb]">
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
      >
        <source src="/media/hero/Untitled design.mp4" type="video/mp4" />
      </video>
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/50 motion-reduce:hidden" />
      <div className="container relative mx-auto grid gap-10 px-4 py-16 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70 motion-reduce:text-muted-foreground">
            Patients-first queue clarity
          </p>
          <h1 className="text-4xl font-bold text-white motion-reduce:text-foreground md:text-5xl">
            {labels.title}
          </h1>
          <p className="text-lg text-white/80 motion-reduce:text-muted-foreground">
            {labels.subtitle}
          </p>
          <p className="text-sm text-white/70 motion-reduce:text-muted-foreground">{labels.helper}</p>
          <div
            id="patient-link"
            className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white/80 backdrop-blur-sm motion-reduce:border-border motion-reduce:bg-white/70 motion-reduce:text-muted-foreground"
          >
            <p className="font-semibold text-white motion-reduce:text-foreground">{labels.patientLinkTitle}</p>
            <p>{labels.patientLinkBody}</p>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground">
                {labels.specialtyLabel}
                <select
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={specialty}
                  onChange={(event) => {
                    setSpecialty(event.target.value);
                    setCity("");
                    setArea("");
                  }}
                >
                  <option value="">Select specialty</option>
                  {specialties.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-foreground">
                {labels.cityLabel}
                <select
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={city}
                  onChange={(event) => {
                    setCity(event.target.value);
                    setArea("");
                  }}
                  disabled={!specialty}
                >
                  <option value="">Select city</option>
                  {cities.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-foreground">
                {labels.areaLabel}
                <select
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                  disabled={!city}
                >
                  <option value="">Select area</option>
                  {areaOptions.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-foreground">
                {labels.doctorLabel}
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={doctor}
                  onChange={(event) => setDoctor(event.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>
            <Button type="submit" className="w-full">
              {labels.searchCta}
            </Button>
            <p className="text-xs text-muted-foreground">{labels.note}</p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default HeroSearch;
