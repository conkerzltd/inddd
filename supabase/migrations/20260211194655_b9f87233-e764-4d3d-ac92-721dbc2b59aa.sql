
-- 1. Create external_booking_apps table
CREATE TABLE IF NOT EXISTS public.external_booking_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label_en text NOT NULL,
  sort_order int NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.external_booking_apps ENABLE ROW LEVEL SECURITY;

-- 3. SELECT policy for authenticated users
CREATE POLICY "Authenticated can read active booking apps"
  ON public.external_booking_apps
  FOR SELECT
  USING (is_active = true);

-- 4. Seed data (upsert)
INSERT INTO public.external_booking_apps (code, label_en, sort_order) VALUES
  ('VEZEETA', 'Vezeeta', 10),
  ('CLINIDO', 'Clinido', 20),
  ('EKSHEF', 'Ekshef', 30),
  ('SHEZLONG', 'Shezlong', 40),
  ('SHEFAE', 'Shefae', 50),
  ('YODAWY', 'Yodawy', 60),
  ('ALTIBBI', 'Altibbi', 70),
  ('ELBALTO', 'ElBalto', 80),
  ('OTHER', 'Other', 999)
ON CONFLICT (code) DO UPDATE SET label_en = EXCLUDED.label_en, sort_order = EXCLUDED.sort_order;

-- 5. Add columns to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS external_booking_app_id uuid REFERENCES public.external_booking_apps(id),
  ADD COLUMN IF NOT EXISTS external_booking_app_other text;

-- 6. Update create_ticket RPC to accept optional external booking app params
CREATE OR REPLACE FUNCTION public.create_ticket(
  p_clinic_id uuid,
  p_source ticket_source,
  p_type ticket_type,
  p_visit_type visit_type,
  p_patient_phone text,
  p_patient_name text DEFAULT NULL,
  p_appt_hhmm text DEFAULT NULL,
  p_external_booking_app_id uuid DEFAULT NULL,
  p_external_booking_app_other text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic clinics%ROWTYPE;
  v_today date;
  v_appt timestamptz := NULL;
  v_status ticket_status;
  v_tid uuid;
  v_ext_app_id uuid := NULL;
  v_ext_app_other text := NULL;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT is_clinic_owner_or_admin(v_uid, p_clinic_id)
     AND NOT has_role(v_uid, p_clinic_id, 'secretary') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = p_clinic_id;
  IF v_clinic IS NULL THEN RAISE EXCEPTION 'Clinic not found'; END IF;

  v_today := (now() AT TIME ZONE v_clinic.timezone)::date;

  IF p_type = 'SCHEDULED' THEN
    IF p_appt_hhmm IS NULL OR p_appt_hhmm = '' THEN
      RAISE EXCEPTION 'Appointment time required for scheduled tickets';
    END IF;
    v_appt := (v_today::text || ' ' || p_appt_hhmm)::timestamp AT TIME ZONE v_clinic.timezone;
    v_status := 'REMOTE_BOOKED';
  ELSE
    v_status := 'LINK_SENT';
  END IF;

  -- External booking app logic
  IF p_source = 'EXTERNAL' AND p_external_booking_app_id IS NOT NULL THEN
    v_ext_app_id := p_external_booking_app_id;
    -- Only store "other" text when the selected app is the OTHER entry
    IF EXISTS (SELECT 1 FROM external_booking_apps WHERE id = p_external_booking_app_id AND code = 'OTHER') THEN
      v_ext_app_other := NULLIF(trim(COALESCE(p_external_booking_app_other, '')), '');
    END IF;
  END IF;

  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, visit_type, status, appointment_time, external_booking_app_id, external_booking_app_other)
  VALUES (p_clinic_id, v_today, trim(p_patient_phone), NULLIF(trim(COALESCE(p_patient_name, '')), ''), p_source, p_type, p_visit_type, v_status, v_appt, v_ext_app_id, v_ext_app_other)
  RETURNING id INTO v_tid;

  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status)
  VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, NULL, v_status);

  RETURN jsonb_build_object('ticket_id', v_tid, 'status', v_status, 'appointment_time', v_appt);
END;
$function$;
