import Seo from "@/components/seo/Seo";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";

const Privacy = () => {
  const baseUrl = PUBLIC_BASE_URL;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Privacy Policy | inddd"
        description="Learn how inddd handles data privacy for patients and clinics."
        canonical={`${baseUrl}/privacy`}
      />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This is a placeholder privacy policy page. We will publish full privacy terms
          before launch.
        </p>
      </div>
    </div>
  );
};

export default Privacy;
