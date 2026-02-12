import Seo from "@/components/seo/Seo";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";

const Terms = () => {
  const baseUrl = PUBLIC_BASE_URL;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Terms of Service | inddd"
        description="Read the terms of service for using inddd."
        canonical={`${baseUrl}/terms`}
      />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This is a placeholder terms page. We will publish full terms before launch.
        </p>
      </div>
    </div>
  );
};

export default Terms;
