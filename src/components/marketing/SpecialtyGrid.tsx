import { Link } from "react-router-dom";
import type { Specialty } from "@/data/directory";
import { useLocale } from "@/i18n/useLocale";

const iconMapEn: Record<string, string> = {
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

const iconMapAr: Record<string, string> = {
  heart: "قلب",
  sparkles: "جلدية",
  tooth: "أسنان",
  bone: "عظام",
  baby: "أطفال",
  eye: "عيون",
  ear: "أنف وأذن",
  brain: "أعصاب",
  "heart-pulse": "نساء",
  droplet: "مسالك",
  mind: "نفسية",
  stethoscope: "عام",
};

type SpecialtyGridProps = {
  specialties: Specialty[];
  title: string;
  subtitle: string;
};

const SpecialtyGrid = ({ specialties, title, subtitle }: SpecialtyGridProps) => {
  const { locale, localePath } = useLocale();
  const isAr = locale === "ar";
  const iconMap = isAr ? iconMapAr : iconMapEn;

  return (
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
              to={localePath(`/doctors/${item.slug}`)}
              className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/60 hover:shadow-md"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {iconMap[item.icon] ?? (isAr ? "رعاية" : "Care")}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-foreground group-hover:text-primary">
                {isAr ? item.nameAr : item.name}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isAr ? item.introAr : item.intro}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpecialtyGrid;
