import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoWordmark from "@/assets/logo-wordmark.png";

export type TopNavLabels = {
  findDoctor: string;
  specialties: string;
  forClinics: string;
  howItWorks: string;
  faq: string;
  ctaPrimary: string;
  ctaSecondary: string;
  language: string;
};

type TopNavProps = {
  labels: TopNavLabels;
  language: "en" | "ar";
  onToggleLanguage: () => void;
};

const TopNav = ({ labels, language, onToggleLanguage }: TopNavProps) =>
<header className="border-b border-border/60 bg-background/80 backdrop-blur">
    <div className="container mx-auto flex items-center justify-between px-4 py-4">
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2">
          
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/doctors" className="hover:text-foreground">
            {labels.findDoctor}
          </Link>
          <a href="#specialties" className="hover:text-foreground">
            {labels.specialties}
          </a>
          <a href="#for-clinics" className="hover:text-foreground">
            {labels.forClinics}
          </a>
          <a href="#how-it-works" className="hover:text-foreground">
            {labels.howItWorks}
          </a>
          <a href="#faq" className="hover:text-foreground">
            {labels.faq}
          </a>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" className="hidden md:inline-flex">
          <a href="#patient-link">{labels.ctaSecondary}</a>
        </Button>
        <Button asChild>
          <Link to="/login">{labels.ctaPrimary}</Link>
        </Button>
        <button
        type="button"
        onClick={onToggleLanguage}
        className="ml-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground"
        aria-label={labels.language}>

          {language === "en" ? "AR" : "EN"}
        </button>
      </div>
    </div>
  </header>;


export default TopNav;