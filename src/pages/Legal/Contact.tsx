import Seo from "@/components/seo/Seo";
import { PUBLIC_BASE_URL } from "@/config/publicBaseUrl";

const Contact = () => {
  const baseUrl = PUBLIC_BASE_URL;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Contact | inddd"
        description="Contact the inddd team for clinic onboarding and product questions."
        canonical={`${baseUrl}/contact`}
      />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground">Contact</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Email us at <a className="text-primary" href="mailto:hello@inddd.com">hello@inddd.com</a>
          . We will respond within 1-2 business days.
        </p>
      </div>
    </div>
  );
};

export default Contact;
