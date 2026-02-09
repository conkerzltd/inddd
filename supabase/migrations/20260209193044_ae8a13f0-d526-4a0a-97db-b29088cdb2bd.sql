
-- ============================================
-- RPC A: send_patient_link
-- ============================================
CREATE OR REPLACE FUNCTION public.send_patient_link(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF NOT is_clinic_member(v_uid, v_ticket.clinic_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = v_ticket.clinic_id;

  -- Revoke existing active links
  UPDATE patient_links SET revoked_at = now()
  WHERE ticket_id = p_ticket_id AND revoked_at IS NULL;

  -- Compute valid_until
  IF v_ticket.type = 'SCHEDULED' AND v_ticket.appointment_time IS NOT NULL THEN
    v_valid_until := v_ticket.appointment_time;
  ELSE
    v_close_dt := (v_ticket.visit_date || ' ' || v_clinic.close_time)::timestamp
                  AT TIME ZONE v_clinic.timezone;
    v_valid_until := v_close_dt;
  END IF;

  -- Create new link
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until)
  VALUES (v_ticket.clinic_id, p_ticket_id, v_valid_until)
  RETURNING token INTO v_new_token;

  -- Update status to LINK_SENT if REMOTE_BOOKED
  IF v_ticket.status = 'REMOTE_BOOKED' THEN
    UPDATE tickets SET status = 'LINK_SENT' WHERE id = p_ticket_id;
    INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status)
    VALUES (v_ticket.clinic_id, p_ticket_id, 'LINK_SENT', v_uid, 'REMOTE_BOOKED', 'LINK_SENT');
  ELSE
    INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id)
    VALUES (v_ticket.clinic_id, p_ticket_id, 'LINK_SENT', v_uid);
  END IF;

  -- Build URLs
  v_patient_url := '/q/' || v_new_token::text;

  -- Build wa.me URL
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
$function$;

-- Helper: urlencode (if not exists)
CREATE OR REPLACE FUNCTION public.urlencode(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT string_agg(
    CASE
      WHEN c ~ '[A-Za-z0-9_.~-]' THEN c
      ELSE '%' || upper(encode(convert_to(c, 'UTF8'), 'hex'))
    END, ''
  )
  FROM unnest(string_to_array($1, NULL)) AS c;
$$;

-- ============================================
-- RPC B: confirm_arrival
-- ============================================
CREATE OR REPLACE FUNCTION public.confirm_arrival(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket tickets%ROWTYPE;
  v_clinic clinics%ROWTYPE;
  v_rk numeric;
  v_late_minutes int;
  v_demoted boolean := false;
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF NOT is_clinic_owner_or_admin(v_uid, v_ticket.clinic_id)
     AND NOT has_role(v_uid, v_ticket.clinic_id, 'secretary') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF v_ticket.status NOT IN ('REMOTE_BOOKED', 'LINK_SENT') THEN
    RAISE EXCEPTION 'Ticket must be in REMOTE_BOOKED or LINK_SENT status';
  END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = v_ticket.clinic_id;

  -- Compute rank_key
  IF v_ticket.type = 'URGENT' THEN
    v_rk := 1000000000 + (EXTRACT(epoch FROM v_now) * 1000)::bigint;
  ELSIF v_ticket.type = 'SCHEDULED' THEN
    IF v_ticket.appointment_time IS NOT NULL THEN
      v_late_minutes := EXTRACT(epoch FROM (v_now - v_ticket.appointment_time))::int / 60;
      IF v_late_minutes > v_clinic.late_threshold_minutes THEN
        v_rk := 3000000000 + (EXTRACT(epoch FROM v_now) * 1000)::bigint;
        v_demoted := true;
      ELSE
        v_rk := 2000000000 + (EXTRACT(epoch FROM v_ticket.appointment_time) * 1000)::bigint;
      END IF;
    ELSE
      v_rk := 2000000000 + (EXTRACT(epoch FROM v_now) * 1000)::bigint;
    END IF;
  ELSE
    v_rk := 3000000000 + (EXTRACT(epoch FROM v_now) * 1000)::bigint;
  END IF;

  UPDATE tickets SET
    status = 'INSIDE_WAITING',
    arrival_confirmed_at = v_now,
    rank_key = v_rk
  WHERE id = p_ticket_id;

  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status, details)
  VALUES (v_ticket.clinic_id, p_ticket_id, 'ARRIVAL_CONFIRMED', v_uid,
          v_ticket.status, 'INSIDE_WAITING',
          jsonb_build_object('late_minutes', COALESCE(v_late_minutes, 0), 'demoted', v_demoted));

  RETURN jsonb_build_object('ticket_id', p_ticket_id, 'rank_key', v_rk, 'demoted', v_demoted);
END;
$function$;

-- ============================================
-- RPC C: call_next
-- ============================================
CREATE OR REPLACE FUNCTION public.call_next(p_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket tickets%ROWTYPE;
  v_today date;
  v_clinic clinics%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT is_clinic_member(v_uid, p_clinic_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = p_clinic_id;
  v_today := (now() AT TIME ZONE v_clinic.timezone)::date;

  SELECT * INTO v_ticket
  FROM tickets
  WHERE clinic_id = p_clinic_id
    AND visit_date = v_today
    AND status = 'INSIDE_WAITING'
  ORDER BY rank_key ASC NULLS LAST
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_ticket IS NULL THEN
    RETURN jsonb_build_object('called', false, 'message', 'No patients waiting');
  END IF;

  UPDATE tickets SET status = 'CALLED', called_at = now()
  WHERE id = v_ticket.id;

  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status)
  VALUES (p_clinic_id, v_ticket.id, 'CALLED', v_uid, 'INSIDE_WAITING', 'CALLED');

  RETURN jsonb_build_object(
    'called', true,
    'ticket_id', v_ticket.id,
    'patient_name', v_ticket.patient_name,
    'type', v_ticket.type
  );
END;
$function$;

-- ============================================
-- RPC D: start_service
-- ============================================
CREATE OR REPLACE FUNCTION public.start_service(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF NOT is_clinic_member(v_uid, v_ticket.clinic_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF v_ticket.status <> 'CALLED' THEN
    RAISE EXCEPTION 'Ticket must be in CALLED status';
  END IF;

  UPDATE tickets SET status = 'IN_SERVICE', service_started_at = now()
  WHERE id = p_ticket_id;

  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status)
  VALUES (v_ticket.clinic_id, p_ticket_id, 'SERVICE_STARTED', v_uid, 'CALLED', 'IN_SERVICE');

  RETURN jsonb_build_object('ticket_id', p_ticket_id, 'status', 'IN_SERVICE');
END;
$function$;

-- ============================================
-- RPC E: complete_ticket
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_ticket(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF NOT is_clinic_member(v_uid, v_ticket.clinic_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF v_ticket.status <> 'IN_SERVICE' THEN
    RAISE EXCEPTION 'Ticket must be in IN_SERVICE status';
  END IF;

  UPDATE tickets SET status = 'DONE', completed_at = now()
  WHERE id = p_ticket_id;

  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status)
  VALUES (v_ticket.clinic_id, p_ticket_id, 'DONE', v_uid, 'IN_SERVICE', 'DONE');

  RETURN jsonb_build_object('ticket_id', p_ticket_id, 'status', 'DONE');
END;
$function$;

-- ============================================
-- RPC F: mark_missed
-- ============================================
CREATE OR REPLACE FUNCTION public.mark_missed(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF NOT is_clinic_owner_or_admin(v_uid, v_ticket.clinic_id)
     AND NOT has_role(v_uid, v_ticket.clinic_id, 'secretary') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF v_ticket.status <> 'CALLED' THEN
    RAISE EXCEPTION 'Ticket must be in CALLED status';
  END IF;

  UPDATE tickets SET status = 'MISSED', miss_count = miss_count + 1
  WHERE id = p_ticket_id;

  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status)
  VALUES (v_ticket.clinic_id, p_ticket_id, 'MARKED_MISSED', v_uid, 'CALLED', 'MISSED');

  RETURN jsonb_build_object('ticket_id', p_ticket_id, 'status', 'MISSED', 'miss_count', v_ticket.miss_count + 1);
END;
$function$;

-- ============================================
-- RPC G: mark_returned
-- ============================================
CREATE OR REPLACE FUNCTION public.mark_returned(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF NOT is_clinic_owner_or_admin(v_uid, v_ticket.clinic_id)
     AND NOT has_role(v_uid, v_ticket.clinic_id, 'secretary') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF v_ticket.status <> 'MISSED' THEN
    RAISE EXCEPTION 'Ticket must be in MISSED status';
  END IF;

  UPDATE tickets SET status = 'RETURNED'
  WHERE id = p_ticket_id;

  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status)
  VALUES (v_ticket.clinic_id, p_ticket_id, 'MARKED_RETURNED', v_uid, 'MISSED', 'RETURNED');

  RETURN jsonb_build_object('ticket_id', p_ticket_id, 'status', 'RETURNED');
END;
$function$;
