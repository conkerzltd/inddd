import { Link } from "react-router-dom";
import type { Specialty } from "@/data/directory";

const iconMap: Record<string, string> = {
  heart: "Heart",
  sparkles: "Skin",
  tooth: "Dental",
  bone: "Bones",
  baby: "Kids",
  eye: "Vision",
  ear: "ENT",
  brain: "Neuro",
  "heart-pulse": "Women",
  droplet: "Urology",
  mind: "Mind",
  stethoscope: "General",
};

type SpecialtyGridProps = {
  specialties: Specialty[];
  title: string;
  subtitle: string;
};

const SpecialtyGrid = ({ specialties, title, subtitle }: SpecialtyGridProps) => (
  <section id="specialties" className="bg-background">
    <div className="container mx-auto px-4 py-14">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {subtitle}
        </p>
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {specialties.map((item) => (
          <Link
            key={item.slug}
            to={`/doctors/${item.slug}`}
            className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/60 hover:shadow-md"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {iconMap[item.icon] ?? "Care"}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-foreground group-hover:text-primary">
              {item.name}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.intro}</p>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default SpecialtyGrid;
