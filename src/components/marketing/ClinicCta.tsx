import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ClinicCta = () => (
  <section id="for-clinics" className="bg-gradient-to-r from-[#f2ecff] via-white to-[#efe8ff]">
    <div className="container mx-auto flex flex-col items-start gap-6 px-4 py-12 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          For clinics
        </p>
        <h2 className="text-3xl font-bold text-foreground">
          Run your clinic day with one live queue
        </h2>
        <p className="text-sm text-muted-foreground">
          Keep patients informed, keep your team calm, and handle real-world flow
          without guesswork.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link to="/login">For Clinics: Run your day</Link>
        </Button>
        <Button asChild variant="outline">
          <a href="mailto:hello@inddd.com">Request a demo</a>
        </Button>
      </div>
    </div>
  </section>
);

export default ClinicCta;
