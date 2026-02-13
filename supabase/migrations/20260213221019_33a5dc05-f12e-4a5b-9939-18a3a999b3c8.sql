
-- Prevent placeholder/test/empty geo values from being saved on clinics
CREATE OR REPLACE FUNCTION public.validate_clinic_geo_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  bad_values text[] := ARRAY['placeholder', 'test', 'testing', 'temp', 'tmp', 'n/a', 'na', 'none', 'null'];
BEGIN
  -- Normalize empty strings to NULL
  IF NEW.governorate_ar IS NOT NULL AND trim(NEW.governorate_ar) = '' THEN
    NEW.governorate_ar := NULL;
  END IF;
  IF NEW.locality_level2_ar IS NOT NULL AND trim(NEW.locality_level2_ar) = '' THEN
    NEW.locality_level2_ar := NULL;
  END IF;
  IF NEW.locality_level2_type IS NOT NULL AND trim(NEW.locality_level2_type) = '' THEN
    NEW.locality_level2_type := NULL;
  END IF;
  IF NEW.locality_level3_ar IS NOT NULL AND trim(NEW.locality_level3_ar) = '' THEN
    NEW.locality_level3_ar := NULL;
  END IF;

  -- Block known placeholder values
  IF NEW.governorate_ar IS NOT NULL AND lower(trim(NEW.governorate_ar)) = ANY(bad_values) THEN
    RAISE EXCEPTION 'Invalid governorate value: %', NEW.governorate_ar;
  END IF;
  IF NEW.locality_level2_ar IS NOT NULL AND lower(trim(NEW.locality_level2_ar)) = ANY(bad_values) THEN
    RAISE EXCEPTION 'Invalid locality_level2_ar value: %', NEW.locality_level2_ar;
  END IF;
  IF NEW.locality_level3_ar IS NOT NULL AND lower(trim(NEW.locality_level3_ar)) = ANY(bad_values) THEN
    RAISE EXCEPTION 'Invalid locality_level3_ar value: %', NEW.locality_level3_ar;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_clinic_geo
BEFORE INSERT OR UPDATE ON public.clinics
FOR EACH ROW
EXECUTE FUNCTION public.validate_clinic_geo_fields();
