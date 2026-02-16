
CREATE OR REPLACE FUNCTION public.onboard_clinic(
  p_name_ar text,
  p_primary_specialty_id uuid DEFAULT NULL::uuid,
  p_governorate_ar text DEFAULT NULL,
  p_locality_level2_ar text DEFAULT NULL,
  p_locality_level2_type text DEFAULT 'CITY'::text,
  p_locality_level3_ar text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_marketer_id uuid DEFAULT NULL::uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic_id uuid;
  v_gov text;
  v_l2 text;
  v_l2_type text;
  v_l3 text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT clinic_id INTO v_clinic_id
  FROM user_roles
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_clinic_id IS NOT NULL THEN
    RETURN v_clinic_id;
  END IF;

  -- Normalize placeholder/empty values to NULL
  v_gov := NULLIF(NULLIF(trim(COALESCE(p_governorate_ar, '')), ''), 'placeholder');
  v_l2  := NULLIF(NULLIF(trim(COALESCE(p_locality_level2_ar, '')), ''), 'placeholder');
  v_l2_type := NULLIF(trim(COALESCE(p_locality_level2_type, '')), '');
  v_l3  := NULLIF(NULLIF(trim(COALESCE(p_locality_level3_ar, '')), ''), 'placeholder');

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
    p_primary_specialty_id, v_gov, v_l2,
    v_l2_type, v_l3, p_phone, p_marketer_id,
    'draft'
  ) RETURNING id INTO v_clinic_id;

  INSERT INTO user_roles (user_id, clinic_id, role) VALUES
    (v_uid, v_clinic_id, 'owner'),
    (v_uid, v_clinic_id, 'admin');

  RETURN v_clinic_id;
END;
$function$;
