import { useLocale } from "@/i18n/useLocale";

const Faq = () => {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const items = isAr
    ? [
        { q: "هل inddd تطبيق حجز؟", a: "لا. نركز على يوم العيادة ورؤية قائمة الانتظار المباشرة، مش الحجوزات." },
        { q: "إزاي المرضى بيستلموا الرابط؟", a: "العيادة بترسل رابط واتساب بعد الحجز أو عند الحضور." },
        { q: "هل فتح الرابط بيسجل حضور المريض؟", a: "لا. فتح الرابط بيعرض قائمة الانتظار المباشرة بس. العيادة بتأكد الحضور." },
        { q: "هل ينفع مع الحضور المباشر؟", a: "أيوه. الحضور المباشر بيتضاف لنفس قائمة الانتظار مع الحجوزات." },
        { q: "هل في تكامل مع فيزيتا؟", a: "مش في النسخة الأولى. العيادات تقدر تضيف الحجوزات الخارجية يدوياً." },
        { q: "هل واتساب مطلوب للمرضى؟", a: "لا، بس هو أسرع طريقة لتوصيل الرابط المباشر حالياً." },
        { q: "إيه اللي بيحصل لما مريض يتأخر؟", a: "المتأخرين ممكن يتأجلوا، وقائمة الانتظار تفضل عادلة وشفافة." },
        { q: "هل العيادة تقدر توقف الاستقبال؟", a: "أيوه. الاستقبال يتوقف بدون ما قائمة الانتظار الحالية تتأثر." },
        { q: "إمتى نتائج الدليل المباشرة هتكون متاحة؟", a: "الدليل جاهز للسيو النهاردة. النتائج المباشرة هتتربط قريب." },
      ]
    : [
        { q: "Is inddd a booking app?", a: "No. We focus on the clinic day and live queue visibility, not bookings." },
        { q: "How do patients get the link?", a: "The clinic sends a WhatsApp link after booking or when patients arrive." },
        { q: "Does opening the link check a patient in?", a: "No. Opening the link only shows the live queue. The clinic confirms arrival." },
        { q: "Can clinics use it with walk-ins?", a: "Yes. Walk-ins are added to the same live queue as bookings." },
        { q: "Does it integrate with Vezeeta?", a: "Not in the MVP. Clinics can add external bookings manually for now." },
        { q: "Is WhatsApp required for patients?", a: "No, but it is the fastest way to deliver the live link today." },
        { q: "What happens when a patient is late?", a: "Late arrivals can be demoted, and the queue stays fair and transparent." },
        { q: "Can clinics pause intake?", a: "Yes. Intake can be paused without losing the current queue state." },
        { q: "When will live directory results be available?", a: "The directory is SEO-ready today. Live results will be connected soon." },
      ];

  return (
    <section id="faq" className="bg-background">
      <div className="container mx-auto px-4 py-14">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {isAr ? "الأسئلة الشائعة" : "FAQ"}
          </p>
          <h2 className="text-3xl font-bold text-foreground">
            {isAr ? "إجابات واضحة" : "Answers, clearly"}
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.q} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground">{item.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Faq;
