
-- 1. Add serial_id to clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS serial_id text UNIQUE;

-- 2. Governorate code mapping table for serial ID generation
CREATE TABLE IF NOT EXISTS public.gov_codes (
  governorate_ar text PRIMARY KEY,
  code text NOT NULL UNIQUE
);

INSERT INTO public.gov_codes (governorate_ar, code) VALUES
  ('القاهرة', 'CAI'),
  ('الجيزة', 'GIZ'),
  ('الإسكندرية', 'ALX'),
  ('الدقهلية', 'DAK'),
  ('الشرقية', 'SHR'),
  ('القليوبية', 'QAL'),
  ('الغربية', 'GHR'),
  ('المنوفية', 'MNF'),
  ('البحيرة', 'BHR'),
  ('الفيوم', 'FAY'),
  ('المنيا', 'MNY'),
  ('أسيوط', 'ASY'),
  ('سوهاج', 'SOH'),
  ('قنا', 'QNA'),
  ('الأقصر', 'LUX'),
  ('أسوان', 'ASW'),
  ('البحر الأحمر', 'RED'),
  ('الوادي الجديد', 'WAD'),
  ('مطروح', 'MAT'),
  ('شمال سيناء', 'NSI'),
  ('جنوب سيناء', 'SSI'),
  ('بورسعيد', 'PSD'),
  ('السويس', 'SUZ'),
  ('الإسماعيلية', 'ISM'),
  ('دمياط', 'DAM'),
  ('كفر الشيخ', 'KFS'),
  ('بني سويف', 'BNS')
ON CONFLICT (governorate_ar) DO NOTHING;

-- RLS for gov_codes (read-only for authenticated)
ALTER TABLE public.gov_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read gov_codes" ON public.gov_codes FOR SELECT USING (true);

-- 3. Clinic serial ID sequence per gov code
CREATE SEQUENCE IF NOT EXISTS public.clinic_serial_seq START 1;

-- 4. Function to generate clinic serial_id
CREATE OR REPLACE FUNCTION public.generate_clinic_serial_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gov_code text;
  v_city_code text;
  v_seq int;
  v_serial text;
  v_exists boolean;
BEGIN
  -- Only generate when profile_complete transitions to true and serial_id is null
  IF NEW.profile_complete = true AND NEW.serial_id IS NULL AND NEW.governorate_ar IS NOT NULL THEN
    -- Get gov code
    SELECT code INTO v_gov_code FROM gov_codes WHERE governorate_ar = NEW.governorate_ar;
    IF v_gov_code IS NULL THEN
      v_gov_code := upper(substr(NEW.governorate_ar, 1, 3));
    END IF;

    -- City code: first 3 chars of level2, uppercased transliteration-like
    IF NEW.locality_level2_ar IS NOT NULL THEN
      v_city_code := upper(substr(md5(NEW.locality_level2_ar), 1, 3));
    ELSE
      v_city_code := '000';
    END IF;

    -- Get next sequence
    LOOP
      v_seq := nextval('clinic_serial_seq');
      v_serial := v_gov_code || '-' || v_city_code || '-' || lpad(v_seq::text, 4, '0');
      SELECT EXISTS (SELECT 1 FROM clinics WHERE serial_id = v_serial) INTO v_exists;
      EXIT WHEN NOT v_exists;
    END LOOP;

    NEW.serial_id := v_serial;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Trigger on clinics update
DROP TRIGGER IF EXISTS trg_generate_clinic_serial_id ON public.clinics;
CREATE TRIGGER trg_generate_clinic_serial_id
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_clinic_serial_id();

-- Also on insert (for future-proofing)
DROP TRIGGER IF EXISTS trg_generate_clinic_serial_id_insert ON public.clinics;
CREATE TRIGGER trg_generate_clinic_serial_id_insert
  BEFORE INSERT ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_clinic_serial_id();

-- 6. Marketer target areas table (normalized)
CREATE TABLE IF NOT EXISTS public.marketer_target_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketer_id uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  governorate_ar text NOT NULL,
  level2_ar text,
  level2_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketer_target_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can view marketer_target_areas" ON public.marketer_target_areas FOR SELECT USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can insert marketer_target_areas" ON public.marketer_target_areas FOR INSERT WITH CHECK (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can update marketer_target_areas" ON public.marketer_target_areas FOR UPDATE USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can delete marketer_target_areas" ON public.marketer_target_areas FOR DELETE USING (is_superadmin(auth.uid()));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_marketer_target_areas_marketer ON public.marketer_target_areas(marketer_id);
