CREATE OR REPLACE FUNCTION public.onboard_clinic(p_name_ar text, p_primary_specialty_id uuid, p_governorate_ar text, p_locality_level2_ar text, p_locality_level2_type text DEFAULT 'CITY'::text, p_locality_level3_ar text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_marketer_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Idempotent: if user already has a clinic, return it
  SELECT clinic_id INTO v_clinic_id
  FROM user_roles
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_clinic_id IS NOT NULL THEN
    RETURN v_clinic_id;
  END IF;

  -- Create clinic
  INSERT INTO clinics (
    name, name_ar, timezone, open_time, close_time,
    avg_service_minutes, grace_minutes, late_threshold_minutes,
    intake_open, session_paused,
    primary_specialty_id, governorate_ar, locality_level2_ar,
    locality_level2_type, locality_level3_ar, phone, marketer_id,
    status
  ) VALUES (
    p_name_ar, p_name_ar, 'Africa/Cairo', '09:00', '22:00',
    10, 15, 45,
    true, false,
    p_primary_specialty_id, p_governorate_ar, p_locality_level2_ar,
    p_locality_level2_type, p_locality_level3_ar, p_phone, p_marketer_id,
    'pending'
  ) RETURNING id INTO v_clinic_id;

  -- Assign owner + admin roles
  INSERT INTO user_roles (user_id, clinic_id, role) VALUES
    (v_uid, v_clinic_id, 'owner'),
    (v_uid, v_clinic_id, 'admin');

  RETURN v_clinic_id;
END;
$function$;