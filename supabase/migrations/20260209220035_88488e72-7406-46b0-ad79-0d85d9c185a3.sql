
-- Fix reinsert_returned: END case gap bug
CREATE OR REPLACE FUNCTION public.reinsert_returned(p_ticket_id uuid, p_insert_position insert_position, p_insert_n integer DEFAULT NULL::integer, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket tickets%ROWTYPE;
  v_clinic clinics%ROWTYPE;
  v_today date;
  v_anchor_rk numeric;
  v_anchor_id uuid;
  v_next_rk numeric;
  v_new_rk numeric;
  v_default_rk numeric;
  v_cnt int;
  v_rec record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF NOT is_clinic_owner_or_admin(v_uid, v_ticket.clinic_id)
     AND NOT has_role(v_uid, v_ticket.clinic_id, 'secretary') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF v_ticket.status <> 'RETURNED' THEN
    RAISE EXCEPTION 'Ticket must be in RETURNED status';
  END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = v_ticket.clinic_id;
  v_today := (now() AT TIME ZONE v_clinic.timezone)::date;

  -- Default rank_key for this ticket type
  IF v_ticket.type = 'URGENT' THEN
    v_default_rk := 1000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint;
  ELSIF v_ticket.type = 'SCHEDULED' THEN
    v_default_rk := 2000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint;
  ELSE
    v_default_rk := 3000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint;
  END IF;

  -- Resolve anchor based on insert_position
  IF p_insert_position = 'AFTER_CURRENT' THEN
    SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
    FROM tickets
    WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today AND status = 'IN_SERVICE'
    ORDER BY rank_key ASC LIMIT 1;

    IF v_anchor_rk IS NULL THEN
      SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
      FROM tickets
      WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today AND status = 'INSIDE_WAITING'
      ORDER BY rank_key ASC LIMIT 1;
    END IF;

    IF v_anchor_rk IS NULL THEN
      v_new_rk := v_default_rk;
      v_anchor_id := NULL;
    END IF;

  ELSIF p_insert_position = 'AFTER_N' THEN
    IF p_insert_n IS NULL OR p_insert_n < 1 THEN
      SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
      FROM tickets
      WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today AND status = 'INSIDE_WAITING'
      ORDER BY rank_key DESC LIMIT 1;

      IF v_anchor_rk IS NULL THEN
        v_new_rk := v_default_rk;
        v_anchor_id := NULL;
      END IF;
    ELSE
      SELECT COUNT(*) INTO v_cnt
      FROM tickets
      WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today AND status = 'INSIDE_WAITING';

      IF p_insert_n > v_cnt THEN
        SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
        FROM tickets
        WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today AND status = 'INSIDE_WAITING'
        ORDER BY rank_key DESC LIMIT 1;

        IF v_anchor_rk IS NULL THEN
          v_new_rk := v_default_rk;
          v_anchor_id := NULL;
        END IF;
      ELSE
        SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
        FROM tickets
        WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today AND status = 'INSIDE_WAITING'
        ORDER BY rank_key ASC
        OFFSET p_insert_n - 1 LIMIT 1;
      END IF;
    END IF;

  ELSE -- END
    SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
    FROM tickets
    WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today AND status = 'INSIDE_WAITING'
    ORDER BY rank_key DESC LIMIT 1;

    IF v_anchor_rk IS NULL THEN
      v_new_rk := v_default_rk;
      v_anchor_id := NULL;
    END IF;
  END IF;

  -- Compute new rank_key if anchor found
  IF v_new_rk IS NULL AND v_anchor_rk IS NOT NULL THEN
    SELECT rank_key INTO v_next_rk
    FROM tickets
    WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today
      AND status = 'INSIDE_WAITING' AND rank_key > v_anchor_rk
    ORDER BY rank_key ASC LIMIT 1;

    IF v_next_rk IS NOT NULL THEN
      -- Midpoint between anchor and next
      v_new_rk := (v_anchor_rk + v_next_rk) / 2;
    ELSE
      -- END case: use GREATEST(anchor + 1, now-based rk) to avoid future-skew
      v_new_rk := GREATEST(v_anchor_rk + 1, v_default_rk);
    END IF;
  END IF;

  UPDATE tickets SET
    status = 'INSIDE_WAITING',
    rank_key = v_new_rk,
    arrival_confirmed_at = COALESCE(arrival_confirmed_at, now()),
    reinsert_note = p_note,
    manual_insert_position = p_insert_position,
    manual_insert_n = p_insert_n
  WHERE id = p_ticket_id;

  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status, details)
  VALUES (v_ticket.clinic_id, p_ticket_id, 'REINSERTED', v_uid, 'RETURNED', 'INSIDE_WAITING',
    jsonb_build_object(
      'insert_position', p_insert_position,
      'insert_n', p_insert_n,
      'anchor_ticket_id', v_anchor_id,
      'computed_rank_key', v_new_rk,
      'note', p_note
    ));

  RETURN jsonb_build_object('ticket_id', p_ticket_id, 'rank_key', v_new_rk, 'status', 'INSIDE_WAITING');
END;
$function$;

-- Fix set_urgent_and_insert: END case gap bug
CREATE OR REPLACE FUNCTION public.set_urgent_and_insert(p_ticket_id uuid, p_insert_position insert_position, p_insert_n integer DEFAULT NULL::integer, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket tickets%ROWTYPE;
  v_clinic clinics%ROWTYPE;
  v_today date;
  v_prev_status text;
  v_anchor_rk numeric;
  v_anchor_id uuid;
  v_next_rk numeric;
  v_new_rk numeric;
  v_now_rk numeric;
  v_cnt int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF NOT is_clinic_member(v_uid, v_ticket.clinic_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF v_ticket.status NOT IN ('REMOTE_BOOKED', 'LINK_SENT', 'INSIDE_WAITING', 'RETURNED') THEN
    RAISE EXCEPTION 'Cannot set urgent for ticket in % status', v_ticket.status;
  END IF;

  v_prev_status := v_ticket.status;

  SELECT * INTO v_clinic FROM clinics WHERE id = v_ticket.clinic_id;
  v_today := (now() AT TIME ZONE v_clinic.timezone)::date;

  -- Urgent lane now-based rank
  v_now_rk := 1000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint;

  -- Transition to INSIDE_WAITING if needed
  IF v_ticket.status IN ('REMOTE_BOOKED', 'LINK_SENT', 'RETURNED') THEN
    UPDATE tickets SET
      status = 'INSIDE_WAITING',
      arrival_confirmed_at = COALESCE(arrival_confirmed_at, now())
    WHERE id = p_ticket_id;
  END IF;

  -- Resolve anchor
  v_new_rk := NULL;
  v_anchor_id := NULL;

  IF p_insert_position = 'AFTER_CURRENT' THEN
    SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
    FROM tickets WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today AND status = 'IN_SERVICE'
    ORDER BY rank_key ASC LIMIT 1;

    IF v_anchor_rk IS NULL THEN
      SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
      FROM tickets WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today
        AND status = 'INSIDE_WAITING' AND id <> p_ticket_id
      ORDER BY rank_key ASC LIMIT 1;
    END IF;

    IF v_anchor_rk IS NULL THEN
      v_new_rk := v_now_rk;
    END IF;

  ELSIF p_insert_position = 'AFTER_N' THEN
    IF p_insert_n IS NULL OR p_insert_n < 1 THEN
      SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
      FROM tickets WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today
        AND status = 'INSIDE_WAITING' AND id <> p_ticket_id
      ORDER BY rank_key DESC LIMIT 1;
      IF v_anchor_rk IS NULL THEN
        v_new_rk := v_now_rk;
      END IF;
    ELSE
      SELECT COUNT(*) INTO v_cnt FROM tickets
      WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today
        AND status = 'INSIDE_WAITING' AND id <> p_ticket_id;

      IF p_insert_n > v_cnt THEN
        SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
        FROM tickets WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today
          AND status = 'INSIDE_WAITING' AND id <> p_ticket_id
        ORDER BY rank_key DESC LIMIT 1;
        IF v_anchor_rk IS NULL THEN
          v_new_rk := v_now_rk;
        END IF;
      ELSE
        SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
        FROM tickets WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today
          AND status = 'INSIDE_WAITING' AND id <> p_ticket_id
        ORDER BY rank_key ASC OFFSET p_insert_n - 1 LIMIT 1;
      END IF;
    END IF;

  ELSE -- END
    SELECT id, rank_key INTO v_anchor_id, v_anchor_rk
    FROM tickets WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today
      AND status = 'INSIDE_WAITING' AND id <> p_ticket_id
    ORDER BY rank_key DESC LIMIT 1;
    IF v_anchor_rk IS NULL THEN
      v_new_rk := v_now_rk;
    END IF;
  END IF;

  -- Compute new rank_key
  IF v_new_rk IS NULL AND v_anchor_rk IS NOT NULL THEN
    SELECT rank_key INTO v_next_rk
    FROM tickets WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_today
      AND status = 'INSIDE_WAITING' AND id <> p_ticket_id AND rank_key > v_anchor_rk
    ORDER BY rank_key ASC LIMIT 1;

    IF v_next_rk IS NOT NULL THEN
      v_new_rk := (v_anchor_rk + v_next_rk) / 2;
    ELSE
      -- END case: use GREATEST(anchor + 1, now-based rk) to avoid future-skew
      v_new_rk := GREATEST(v_anchor_rk + 1, v_now_rk);
    END IF;
  END IF;

  UPDATE tickets SET
    rank_key = v_new_rk,
    reinsert_note = p_note,
    manual_insert_position = p_insert_position,
    manual_insert_n = p_insert_n
  WHERE id = p_ticket_id;

  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, previous_status, new_status, details)
  VALUES (v_ticket.clinic_id, p_ticket_id, 'SET_URGENT', v_uid, v_prev_status, 'INSIDE_WAITING',
    jsonb_build_object(
      'insert_position', p_insert_position,
      'insert_n', p_insert_n,
      'anchor_ticket_id', v_anchor_id,
      'computed_rank_key', v_new_rk,
      'note', p_note
    ));

  RETURN jsonb_build_object('ticket_id', p_ticket_id, 'rank_key', v_new_rk, 'status', 'INSIDE_WAITING', 'previous_status', v_prev_status);
END;
$function$;
