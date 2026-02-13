
-- Add profile_complete column to clinics
ALTER TABLE public.clinics ADD COLUMN profile_complete boolean NOT NULL DEFAULT false;

-- Mark existing active clinics as complete (they already went through the old flow)
UPDATE public.clinics SET profile_complete = true WHERE status = 'active';
