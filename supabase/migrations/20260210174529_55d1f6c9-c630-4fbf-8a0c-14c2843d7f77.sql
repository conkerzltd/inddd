
-- 1) Specialties lookup table
CREATE TABLE public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order int NOT NULL,
  specialty_ar text NOT NULL,
  CONSTRAINT specialties_sort_order_unique UNIQUE (sort_order),
  CONSTRAINT specialties_specialty_ar_unique UNIQUE (specialty_ar)
);
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read specialties"
  ON public.specialties FOR SELECT
  TO authenticated
  USING (true);

-- 2) Geo localities lookup table
CREATE TABLE public.geo_localities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  governorate_ar text NOT NULL,
  level2_ar text NOT NULL,
  level2_type text NOT NULL CHECK (level2_type IN ('MARKAZ','CITY','DISTRICT')),
  level3_ar text NULL
);
ALTER TABLE public.geo_localities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read geo_localities"
  ON public.geo_localities FOR SELECT
  TO authenticated
  USING (true);

CREATE UNIQUE INDEX geo_localities_unique_idx
  ON public.geo_localities (governorate_ar, level2_ar, COALESCE(level3_ar, ''));
CREATE INDEX geo_localities_gov_idx ON public.geo_localities (governorate_ar);
CREATE INDEX geo_localities_gov_l2_idx ON public.geo_localities (governorate_ar, level2_ar);

-- 3) Extend clinics table with onboarding columns
ALTER TABLE public.clinics
  ADD COLUMN primary_specialty_id uuid REFERENCES public.specialties(id),
  ADD COLUMN governorate_ar text,
  ADD COLUMN locality_level2_ar text,
  ADD COLUMN locality_level2_type text CHECK (locality_level2_type IN ('MARKAZ','CITY','DISTRICT')),
  ADD COLUMN locality_level3_ar text,
  ADD COLUMN address_text text,
  ADD COLUMN maps_url text,
  ADD COLUMN clinic_whatsapp_phone text,
  ADD COLUMN working_hours_json jsonb;
