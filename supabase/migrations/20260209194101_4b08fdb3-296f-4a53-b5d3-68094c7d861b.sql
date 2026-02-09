
-- A) Create create_ticket RPC
CREATE OR REPLACE FUNCTION public.create_ticket(
  p_clinic_id uuid,
  p_source ticket_source,
  p_type ticket_type,
  p_visit_type visit_type,
  p_patient_phone text,
  p_patient_name text DEFAULT NULL,
  p_appt_hhmm text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic clinics%ROWTYPE;
  v_today date;
  v_appt timestamptz := NULL;
  v_status ticket_status;
  v_tid uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Role guard: secretary/admin/owner
  IF NOT is_clinic_owner_or_admin(v_uid, p_clinic_id)
     AND NOT has_role(v_uid, p_clinic_id, 'secretary') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = p_clinic_id;
  IF v_clinic IS NULL THEN RAISE EXCEPTION 'Clinic not found'; END IF;

  -- Clinic-timezone today
  v_today := (now() AT TIME ZONE v_clinic.timezone)::date;

  -- Appointment time
  IF p_type = 'SCHEDULED' THEN
    IF p_appt_hhmm IS NULL OR p_appt_hhmm = '' THEN
      RAISE EXCEPTION 'Appointment time required for scheduled tickets';
    END IF;
    v_appt := (v_today::text || ' ' || p_appt_hhmm)::timestamp AT TIME ZONE v_clinic.timezone;
    v_status := 'REMOTE_BOOKED';
  ELSE
    v_status := 'LINK_SENT';
  END IF;

  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, visit_type, status, appointment_time)
  VALUES (p_clinic_id, v_today, trim(p_patient_phone), NULLIF(trim(COALESCE(p_patient_name, '')), ''), p_source, p_type, p_visit_type, v_status, v_appt)
  RETURNING id INTO v_tid;

  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status)
  VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, NULL, v_status);

  RETURN jsonb_build_object('ticket_id', v_tid, 'status', v_status, 'appointment_time', v_appt);
END;
$$;

-- C) Tighten send_patient_link guard
CREATE OR REPLACE FUNCTION public.send_patient_link(p_ticket_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket tickets%ROWTYPE;
  v_clinic clinics%ROWTYPE;
  v_new_token uuid;
  v_valid_until timestamptz;
  v_close_dt timestamptz;
  v_patient_url text;
  v_wa_url text;
  v_msg text;
  v_phone text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id;
  IF v_ticket IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  -- Tightened: secretary/admin/owner only
  IF NOT is_clinic_owner_or_admin(v_uid, v_ticket.clinic_id)
     AND NOT has_role(v_uid, v_ticket.clinic_id, 'secretary') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = v_ticket.clinic_id;

  UPDATE patient_links SET revoked_at = now()
  WHERE ticket_id = p_ticket_id AND revoked_at IS NULL;

  IF v_ticket.type = 'SCHEDULED' AND v_ticket.appointment_time IS NOT NULL THEN
    v_valid_until := v_ticket.appointment_time;
  ELSE
    v_close_dt := (v_ticket.visit_date || ' ' || v_clinic.close_time)::timestamp
                  AT TIME ZONE v_clinic.timezone;
    v_valid_until := v_close_dt;
  END IF;

  INSERT INTO patient_links (clinic_id, ticket_id, valid_until)
  VALUES (v_ticket.clinic_id, p_ticket_id, v_valid_until)
  RETURNING token INTO v_new_token;

  IF v_ticket.status = 'REMOTE_BOOKED' THEN
    UPDATE tickets SET status = 'LINK_SENT' WHERE id = p_ticket_id;
    INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status)
    VALUES (v_ticket.clinic_id, p_ticket_id, 'LINK_SENT', v_uid, 'REMOTE_BOOKED', 'LINK_SENT');
  ELSE
    INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id)
    VALUES (v_ticket.clinic_id, p_ticket_id, 'LINK_SENT', v_uid);
  END IF;

  v_patient_url := '/q/' || v_new_token::text;
  v_phone := regexp_replace(v_ticket.patient_phone, '[^0-9]', '', 'g');
  v_msg := replace(v_clinic.wa_message_template, '{url}', v_patient_url);
  v_wa_url := 'https://wa.me/' || v_phone || '?text=' || urlencode(v_msg);

  RETURN jsonb_build_object(
    'token', v_new_token,
    'patient_page_url', v_patient_url,
    'wa_url', v_wa_url,
    'valid_until', v_valid_until
  );
END;
$$;
