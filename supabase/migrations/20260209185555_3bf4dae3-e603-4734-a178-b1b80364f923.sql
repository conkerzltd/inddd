
-- 1) Remove anon SELECT policy from patient_links
DROP POLICY IF EXISTS "Public can read by token" ON public.patient_links;

-- 2) Create secure RPC for patient page
CREATE TYPE public.patient_queue_view AS (
  status_badge text,
  appointment_time timestamptz,
  eligible_position int,
  eta_min_minutes int,
  eta_max_minutes int,
  session_paused boolean,
  intake_open boolean,
  message text
);

CREATE OR REPLACE FUNCTION public.get_patient_queue_view(p_token uuid)
RETURNS public.patient_queue_view
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link patient_links%ROWTYPE;
  v_ticket tickets%ROWTYPE;
  v_clinic clinics%ROWTYPE;
  v_result patient_queue_view;
  v_position int;
  v_avg int;
BEGIN
  -- Find active link
  SELECT * INTO v_link
  FROM patient_links
  WHERE token = p_token AND revoked_at IS NULL
  LIMIT 1;

  IF v_link IS NULL THEN
    v_result.message := 'Invalid link. Please contact your clinic.';
    RETURN v_result;
  END IF;

  -- Enforce validity
  IF now() > v_link.valid_until THEN
    v_result.message := 'This link has expired. Please contact your clinic.';
    RETURN v_result;
  END IF;

  -- Update last_opened_at
  UPDATE patient_links SET last_opened_at = now() WHERE id = v_link.id;

  -- Load ticket and clinic
  SELECT * INTO v_ticket FROM tickets WHERE id = v_link.ticket_id;
  SELECT * INTO v_clinic FROM clinics WHERE id = v_link.clinic_id;

  IF v_ticket IS NULL OR v_clinic IS NULL THEN
    v_result.message := 'Unable to load queue information. Please contact your clinic.';
    RETURN v_result;
  END IF;

  v_result.session_paused := v_clinic.session_paused;
  v_result.intake_open := v_clinic.intake_open;

  -- Map status to safe badge
  CASE v_ticket.status
    WHEN 'REMOTE_BOOKED' THEN
      v_result.status_badge := 'BOOKED';
      v_result.appointment_time := v_ticket.appointment_time;
      v_result.message := 'Your appointment is booked. Please arrive on time to confirm your presence.';
    WHEN 'LINK_SENT' THEN
      v_result.status_badge := 'BOOKED';
      v_result.appointment_time := v_ticket.appointment_time;
      v_result.message := 'Your appointment is confirmed. Please arrive on time.';
    WHEN 'INSIDE_WAITING' THEN
      v_result.status_badge := 'WAITING';
      -- Compute eligible position
      SELECT COUNT(*) + 1 INTO v_position
      FROM tickets
      WHERE clinic_id = v_ticket.clinic_id
        AND visit_date = v_ticket.visit_date
        AND status = 'INSIDE_WAITING'
        AND rank_key < v_ticket.rank_key;
      v_result.eligible_position := v_position;
      -- ETA range: position * avg_service_minutes * (0.7 .. 1.3)
      v_avg := v_clinic.avg_service_minutes;
      v_result.eta_min_minutes := GREATEST(1, ((v_position - 1) * v_avg * 0.7)::int);
      v_result.eta_max_minutes := ((v_position - 1) * v_avg * 1.3)::int;
      IF v_result.eta_max_minutes < 1 THEN v_result.eta_max_minutes := 1; END IF;
      v_result.message := 'You are in the waiting queue.';
    WHEN 'CALLED' THEN
      v_result.status_badge := 'CALLED';
      v_result.message := 'You have been called! Please proceed to the front desk.';
    WHEN 'IN_SERVICE' THEN
      v_result.status_badge := 'IN_SERVICE';
      v_result.message := 'You are currently being seen.';
    WHEN 'DONE' THEN
      v_result.status_badge := 'DONE';
      v_result.message := 'Your visit is complete. Thank you!';
    WHEN 'MISSED' THEN
      v_result.status_badge := 'MISSED';
      v_result.message := 'You missed your turn. Please contact the front desk.';
    WHEN 'RETURNED' THEN
      v_result.status_badge := 'RETURNED';
      v_result.message := 'You are marked as returned. Please wait for reinsertion.';
    WHEN 'CANCELLED' THEN
      v_result.status_badge := 'CANCELLED';
      v_result.message := 'Your appointment has been cancelled.';
    WHEN 'CLOSED_OUT' THEN
      v_result.status_badge := 'CLOSED';
      v_result.message := 'The clinic session has ended.';
    ELSE
      v_result.message := 'Please contact your clinic for status information.';
  END CASE;

  IF v_clinic.session_paused THEN
    v_result.message := v_result.message || ' (Queue is currently paused)';
  END IF;

  RETURN v_result;
END;
$$;

-- Grant anon execute on the RPC (no table access, only function)
GRANT EXECUTE ON FUNCTION public.get_patient_queue_view(uuid) TO anon;
