import { useLocale } from "@/i18n/useLocale";

const HowItWorks = () => {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const sectionTitle = isAr ? "كيف يعمل" : "How it works";
  const sectionHeading = isAr ? "خطوات واضحة للمرضى والعيادات" : "Clear steps for patients and clinics";
  const stepLabel = isAr ? "خطوة" : "Step";

  const steps = isAr
    ? [
        { title: "المريض يستلم رابط واتساب", body: "العيادة ترسل رابط آمن عشان المريض يشوف رقمه ووقت الانتظار المتوقع." },
        { title: "بوابة الحضور تضمن العدالة", body: "فتح الرابط مش تسجيل حضور. العيادة بتأكد الحضور في الاستقبال." },
        { title: "العيادة تدير اليوم بسلاسة", body: "الحالات العاجلة والتأخيرات والغياب كلها تتعالج بدون تخمين." },
      ]
    : [
        { title: "Patients get the WhatsApp link", body: "Clinics send a secure link so patients see their live number and ETA range." },
        { title: "Presence gate keeps it fair", body: "Opening the link is not check-in. Clinics confirm arrival at the desk." },
        { title: "Clinics run the day smoothly", body: "Urgent, late, and missed visits are handled without guesswork." },
      ];

  return (
    <section id="how-it-works" className="bg-card">
      <div className="container mx-auto px-4 py-14">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {sectionTitle}
          </p>
          <h2 className="text-3xl font-bold text-foreground">{sectionHeading}</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-border bg-background p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {stepLabel} {index + 1}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
