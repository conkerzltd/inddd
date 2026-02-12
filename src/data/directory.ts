export type Specialty = {
  name: string;
  nameAr: string;
  slug: string;
  icon: string;
  intro: string;
  introAr: string;
};

export type Area = {
  name: string;
  nameAr: string;
  slug: string;
};

export type City = {
  name: string;
  nameAr: string;
  slug: string;
  areas: Area[];
};

export const specialties: Specialty[] = [
  {
    name: "Cardiology",
    nameAr: "قلب وأوعية دموية",
    slug: "cardiology",
    icon: "heart",
    intro: "Heart and circulation care, including follow-ups and chronic conditions.",
    introAr: "رعاية القلب والدورة الدموية، بما في ذلك المتابعات والحالات المزمنة.",
  },
  {
    name: "Dermatology",
    nameAr: "جلدية",
    slug: "dermatology",
    icon: "sparkles",
    intro: "Skin, hair, and nail concerns with clear care plans and follow-ups.",
    introAr: "مشاكل الجلد والشعر والأظافر مع خطط علاج واضحة ومتابعات.",
  },
  {
    name: "Dentistry",
    nameAr: "أسنان",
    slug: "dentistry",
    icon: "tooth",
    intro: "Dental checkups, cleanings, and procedures with modern clinics.",
    introAr: "فحوصات الأسنان والتنظيف والإجراءات في عيادات حديثة.",
  },
  {
    name: "Orthopedics",
    nameAr: "عظام",
    slug: "orthopedics",
    icon: "bone",
    intro: "Bone and joint care, injuries, and mobility support.",
    introAr: "رعاية العظام والمفاصل والإصابات ودعم الحركة.",
  },
  {
    name: "Pediatrics",
    nameAr: "أطفال",
    slug: "pediatrics",
    icon: "baby",
    intro: "Children health visits, immunization follow-ups, and guidance.",
    introAr: "زيارات صحة الأطفال ومتابعة التطعيمات والإرشادات.",
  },
  {
    name: "Ophthalmology",
    nameAr: "عيون",
    slug: "ophthalmology",
    icon: "eye",
    intro: "Eye exams, vision checks, and ongoing eye care.",
    introAr: "فحوصات العيون واختبارات النظر والرعاية المستمرة.",
  },
  {
    name: "ENT",
    nameAr: "أنف وأذن وحنجرة",
    slug: "ent",
    icon: "ear",
    intro: "Ear, nose, and throat care for adults and children.",
    introAr: "رعاية الأنف والأذن والحنجرة للكبار والأطفال.",
  },
  {
    name: "Neurology",
    nameAr: "مخ وأعصاب",
    slug: "neurology",
    icon: "brain",
    intro: "Brain and nerve care with clear diagnostic workflows.",
    introAr: "رعاية المخ والأعصاب مع مسارات تشخيصية واضحة.",
  },
  {
    name: "Gynecology",
    nameAr: "نساء وتوليد",
    slug: "gynecology",
    icon: "heart-pulse",
    intro: "Women health visits, screenings, and consultations.",
    introAr: "زيارات صحة المرأة والفحوصات والاستشارات.",
  },
  {
    name: "Urology",
    nameAr: "مسالك بولية",
    slug: "urology",
    icon: "droplet",
    intro: "Urinary tract and kidney care for adults.",
    introAr: "رعاية المسالك البولية والكلى للكبار.",
  },
  {
    name: "Psychiatry",
    nameAr: "نفسية",
    slug: "psychiatry",
    icon: "mind",
    intro: "Mental health support, follow-ups, and care plans.",
    introAr: "دعم الصحة النفسية والمتابعات وخطط الرعاية.",
  },
  {
    name: "General Practice",
    nameAr: "طب عام",
    slug: "general-practice",
    icon: "stethoscope",
    intro: "Primary care visits for common concerns and referrals.",
    introAr: "زيارات الرعاية الأولية للمشاكل الشائعة والإحالات.",
  },
];

export const cities: City[] = [
  {
    name: "Cairo",
    nameAr: "القاهرة",
    slug: "cairo",
    areas: [
      { name: "Nasr City", nameAr: "مدينة نصر", slug: "nasr-city" },
      { name: "Heliopolis", nameAr: "مصر الجديدة", slug: "heliopolis" },
      { name: "Maadi", nameAr: "المعادي", slug: "maadi" },
      { name: "New Cairo", nameAr: "القاهرة الجديدة", slug: "new-cairo" },
    ],
  },
  {
    name: "Giza",
    nameAr: "الجيزة",
    slug: "giza",
    areas: [
      { name: "Dokki", nameAr: "الدقي", slug: "dokki" },
      { name: "Mohandessin", nameAr: "المهندسين", slug: "mohandessin" },
      { name: "Haram", nameAr: "الهرم", slug: "haram" },
      { name: "Sheikh Zayed", nameAr: "الشيخ زايد", slug: "sheikh-zayed" },
    ],
  },
  {
    name: "Alexandria",
    nameAr: "الإسكندرية",
    slug: "alexandria",
    areas: [
      { name: "Smouha", nameAr: "سموحة", slug: "smouha" },
      { name: "Gleem", nameAr: "جليم", slug: "gleem" },
      { name: "Stanley", nameAr: "ستانلي", slug: "stanley" },
      { name: "Miami", nameAr: "ميامي", slug: "miami" },
    ],
  },
  {
    name: "Mansoura",
    nameAr: "المنصورة",
    slug: "mansoura",
    areas: [
      { name: "Talkha", nameAr: "طلخا", slug: "talkha" },
      { name: "Gehan", nameAr: "جيهان", slug: "gehan" },
      { name: "Toreil", nameAr: "توريل", slug: "toreil" },
      { name: "Sandoub", nameAr: "صندوب", slug: "sandoub" },
    ],
  },
];

export const getSpecialtyBySlug = (slug?: string) =>
  specialties.find((specialty) => specialty.slug === slug);

export const getCityBySlug = (slug?: string) =>
  cities.find((city) => city.slug === slug);

export const getAreaBySlug = (city: City | undefined, slug?: string) =>
  city?.areas.find((area) => area.slug === slug);
