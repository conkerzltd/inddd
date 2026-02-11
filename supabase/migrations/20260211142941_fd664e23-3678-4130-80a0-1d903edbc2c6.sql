
-- Add new columns to clinics for v2 profile + queue settings
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS whatsapp_local_1 text,
  ADD COLUMN IF NOT EXISTS whatsapp_e164_1 text,
  ADD COLUMN IF NOT EXISTS whatsapp_local_2 text,
  ADD COLUMN IF NOT EXISTS whatsapp_e164_2 text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS avg_service_time_seed_minutes integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS allow_urgent_insert boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_pause_intake boolean DEFAULT true;
