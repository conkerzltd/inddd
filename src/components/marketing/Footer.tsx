import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container mx-auto flex flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">inddd</p>
        <p className="text-xs text-muted-foreground">
          Patients-first queue clarity for clinics.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link to="/terms" className="hover:text-foreground">
          Terms
        </Link>
        <Link to="/contact" className="hover:text-foreground">
          Contact
        </Link>
      </div>
    </div>
  </footer>
);

export default Footer;
