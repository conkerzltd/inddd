export type Specialty = {
  name: string;
  slug: string;
  icon: string;
  intro: string;
};

export type Area = {
  name: string;
  slug: string;
};

export type City = {
  name: string;
  slug: string;
  areas: Area[];
};

export const specialties: Specialty[] = [
  {
    name: "Cardiology",
    slug: "cardiology",
    icon: "heart",
    intro: "Heart and circulation care, including follow-ups and chronic conditions.",
  },
  {
    name: "Dermatology",
    slug: "dermatology",
    icon: "sparkles",
    intro: "Skin, hair, and nail concerns with clear care plans and follow-ups.",
  },
  {
    name: "Dentistry",
    slug: "dentistry",
    icon: "tooth",
    intro: "Dental checkups, cleanings, and procedures with modern clinics.",
  },
  {
    name: "Orthopedics",
    slug: "orthopedics",
    icon: "bone",
    intro: "Bone and joint care, injuries, and mobility support.",
  },
  {
    name: "Pediatrics",
    slug: "pediatrics",
    icon: "baby",
    intro: "Children health visits, immunization follow-ups, and guidance.",
  },
  {
    name: "Ophthalmology",
    slug: "ophthalmology",
    icon: "eye",
    intro: "Eye exams, vision checks, and ongoing eye care.",
  },
  {
    name: "ENT",
    slug: "ent",
    icon: "ear",
    intro: "Ear, nose, and throat care for adults and children.",
  },
  {
    name: "Neurology",
    slug: "neurology",
    icon: "brain",
    intro: "Brain and nerve care with clear diagnostic workflows.",
  },
  {
    name: "Gynecology",
    slug: "gynecology",
    icon: "heart-pulse",
    intro: "Women health visits, screenings, and consultations.",
  },
  {
    name: "Urology",
    slug: "urology",
    icon: "droplet",
    intro: "Urinary tract and kidney care for adults.",
  },
  {
    name: "Psychiatry",
    slug: "psychiatry",
    icon: "mind",
    intro: "Mental health support, follow-ups, and care plans.",
  },
  {
    name: "General Practice",
    slug: "general-practice",
    icon: "stethoscope",
    intro: "Primary care visits for common concerns and referrals.",
  },
];

export const cities: City[] = [
  {
    name: "Cairo",
    slug: "cairo",
    areas: [
      { name: "Nasr City", slug: "nasr-city" },
      { name: "Heliopolis", slug: "heliopolis" },
      { name: "Maadi", slug: "maadi" },
      { name: "New Cairo", slug: "new-cairo" },
    ],
  },
  {
    name: "Giza",
    slug: "giza",
    areas: [
      { name: "Dokki", slug: "dokki" },
      { name: "Mohandessin", slug: "mohandessin" },
      { name: "Haram", slug: "haram" },
      { name: "Sheikh Zayed", slug: "sheikh-zayed" },
    ],
  },
  {
    name: "Alexandria",
    slug: "alexandria",
    areas: [
      { name: "Smouha", slug: "smouha" },
      { name: "Gleem", slug: "gleem" },
      { name: "Stanley", slug: "stanley" },
      { name: "Miami", slug: "miami" },
    ],
  },
  {
    name: "Mansoura",
    slug: "mansoura",
    areas: [
      { name: "Talkha", slug: "talkha" },
      { name: "Gehan", slug: "gehan" },
      { name: "Toreil", slug: "toreil" },
      { name: "Sandoub", slug: "sandoub" },
    ],
  },
];

export const getSpecialtyBySlug = (slug?: string) =>
  specialties.find((specialty) => specialty.slug === slug);

export const getCityBySlug = (slug?: string) =>
  cities.find((city) => city.slug === slug);

export const getAreaBySlug = (city: City | undefined, slug?: string) =>
  city?.areas.find((area) => area.slug === slug);
