
-- cancel_ticket RPC
CREATE OR REPLACE FUNCTION public.cancel_ticket(p_ticket_id uuid)
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

  IF v_ticket.status NOT IN ('REMOTE_BOOKED', 'LINK_SENT', 'INSIDE_WAITING', 'CALLED', 'RETURNED') THEN
    RAISE EXCEPTION 'Cannot cancel ticket in % status', v_ticket.status;
  END IF;

  UPDATE tickets SET status = 'CANCELLED' WHERE id = p_ticket_id;

  UPDATE patient_links SET revoked_at = now()
  WHERE ticket_id = p_ticket_id AND revoked_at IS NULL;

  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status)
  VALUES (v_ticket.clinic_id, p_ticket_id, 'CANCELLED', v_uid, v_ticket.status, 'CANCELLED');

  RETURN jsonb_build_object('ticket_id', p_ticket_id, 'previous_status', v_ticket.status, 'status', 'CANCELLED');
END;
$function$;

-- close_out_day RPC
CREATE OR REPLACE FUNCTION public.close_out_day(p_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic clinics%ROWTYPE;
  v_today date;
  v_counts jsonb := '{}'::jsonb;
  v_total int := 0;
  v_rec record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT is_clinic_owner_or_admin(v_uid, p_clinic_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = p_clinic_id;
  IF v_clinic IS NULL THEN RAISE EXCEPTION 'Clinic not found'; END IF;

  v_today := (now() AT TIME ZONE v_clinic.timezone)::date;

  -- Count by status before update
  FOR v_rec IN
    SELECT status, count(*)::int as cnt
    FROM tickets
    WHERE clinic_id = p_clinic_id AND visit_date = v_today
      AND status IN ('REMOTE_BOOKED', 'LINK_SENT', 'INSIDE_WAITING', 'CALLED', 'IN_SERVICE', 'MISSED', 'RETURNED')
    GROUP BY status
  LOOP
    v_counts := v_counts || jsonb_build_object(v_rec.status::text, v_rec.cnt);
    v_total := v_total + v_rec.cnt;
  END LOOP;

  IF v_total = 0 THEN
    RETURN jsonb_build_object('closed_out', 0, 'message', 'No tickets to close out');
  END IF;

  -- Insert audit logs for each affected ticket
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status)
  SELECT clinic_id, id, 'CANCELLED', v_uid, status, 'CLOSED_OUT'
  FROM tickets
  WHERE clinic_id = p_clinic_id AND visit_date = v_today
    AND status IN ('REMOTE_BOOKED', 'LINK_SENT', 'INSIDE_WAITING', 'CALLED', 'IN_SERVICE', 'MISSED', 'RETURNED');

  -- Update tickets
  UPDATE tickets SET status = 'CLOSED_OUT'
  WHERE clinic_id = p_clinic_id AND visit_date = v_today
    AND status IN ('REMOTE_BOOKED', 'LINK_SENT', 'INSIDE_WAITING', 'CALLED', 'IN_SERVICE', 'MISSED', 'RETURNED');

  -- Revoke active links for those tickets
  UPDATE patient_links SET revoked_at = now()
  WHERE clinic_id = p_clinic_id AND revoked_at IS NULL
    AND ticket_id IN (
      SELECT id FROM tickets WHERE clinic_id = p_clinic_id AND visit_date = v_today AND status = 'CLOSED_OUT'
    );

  RETURN jsonb_build_object('closed_out', v_total, 'by_status', v_counts);
END;
$function$;
