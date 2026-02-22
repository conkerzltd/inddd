
-- Hard-delete a clinic and all related data (superadmin only)
CREATE OR REPLACE FUNCTION public.delete_clinic(p_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic_name text;
BEGIN
  IF NOT is_superadmin(v_uid) THEN
    RAISE EXCEPTION 'Superadmin only';
  END IF;

  SELECT COALESCE(name_ar, name) INTO v_clinic_name
  FROM clinics WHERE id = p_clinic_id;

  IF v_clinic_name IS NULL THEN
    RAISE EXCEPTION 'Clinic not found';
  END IF;

  -- Delete related data in dependency order
  DELETE FROM patient_links WHERE clinic_id = p_clinic_id;
  DELETE FROM audit_log WHERE clinic_id = p_clinic_id;
  DELETE FROM clinic_payments WHERE clinic_id = p_clinic_id;
  DELETE FROM commissions WHERE clinic_id = p_clinic_id;
  DELETE FROM tickets WHERE clinic_id = p_clinic_id;
  DELETE FROM user_roles WHERE clinic_id = p_clinic_id;
  DELETE FROM clinics WHERE id = p_clinic_id;

  RETURN jsonb_build_object('success', true, 'deleted_clinic', v_clinic_name);
END;
$function$;
