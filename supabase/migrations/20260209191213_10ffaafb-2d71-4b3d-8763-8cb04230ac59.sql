
-- Confirm token column already has default (it does from initial migration)
-- Just ensure it for safety:
ALTER TABLE public.patient_links ALTER COLUMN token SET DEFAULT gen_random_uuid();

-- Replace seed function with corrected valid_until + rank_key rules
CREATE OR REPLACE FUNCTION public.seed_demo_day(p_clinic_id uuid)
RETURNS int
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic clinics%ROWTYPE;
  v_today date;
  v_existing int;
  v_tid uuid;
  v_base_time timestamptz;
  v_rk numeric;
  v_count int := 0;
  v_close_dt timestamptz;
  v_arrival timestamptz;
  v_appt timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_clinic_owner_or_admin(v_uid, p_clinic_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = p_clinic_id;
  IF v_clinic IS NULL THEN
    RAISE EXCEPTION 'Clinic not found';
  END IF;

  v_today := (now() AT TIME ZONE v_clinic.timezone)::date;

  -- Idempotent
  SELECT COUNT(*) INTO v_existing
  FROM tickets WHERE clinic_id = p_clinic_id AND visit_date = v_today;
  IF v_existing > 0 THEN
    RETURN v_existing;
  END IF;

  -- Clinic close time as timestamptz for today
  v_close_dt := (v_today || ' ' || v_clinic.close_time)::timestamp AT TIME ZONE v_clinic.timezone;

  v_base_time := date_trunc('hour', now()) + interval '1 hour';

  -- ============================================
  -- A) Scheduled pre-arrival (rank_key NULL)
  -- valid_until = appointment_time
  -- ============================================

  -- A1: REMOTE_BOOKED
  v_appt := v_base_time;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000001', 'Sara M.', 'EXTERNAL', 'SCHEDULED', 'REMOTE_BOOKED', v_appt, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_appt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  -- A2: REMOTE_BOOKED
  v_appt := v_base_time + interval '30 minutes';
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000002', 'Ahmed K.', 'EXTERNAL', 'SCHEDULED', 'REMOTE_BOOKED', v_appt, 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_appt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  -- A3: LINK_SENT
  v_appt := v_base_time + interval '1 hour';
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000003', 'Mona R.', 'EXTERNAL', 'SCHEDULED', 'LINK_SENT', v_appt, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_appt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'LINK_SENT', v_uid, 'admin');
  v_count := v_count + 1;

  -- A4: LINK_SENT
  v_appt := v_base_time + interval '1.5 hours';
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000004', 'Youssef H.', 'PHONE_CALL', 'SCHEDULED', 'LINK_SENT', v_appt, 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_appt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'LINK_SENT', v_uid, 'admin');
  v_count := v_count + 1;

  -- ============================================
  -- B) INSIDE_WAITING (rank_key per official rule)
  -- NORMAL/WALK_IN valid_until = v_close_dt
  -- SCHEDULED valid_until = appointment_time
  -- ============================================

  -- B1: URGENT walk-in → 1B + epoch_ms(arrival)
  v_arrival := now() - interval '3 minutes';
  v_rk := 1000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000005', 'Fatma A.', 'WALK_IN', 'URGENT', 'INSIDE_WAITING', v_rk, v_arrival, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'ARRIVAL_CONFIRMED', v_uid, 'secretary');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role, details) VALUES (p_clinic_id, v_tid, 'SET_URGENT', v_uid, 'admin', '{"reason":"emergency"}');
  v_count := v_count + 1;

  -- B2: SCHEDULED on-time → 2B + epoch_ms(appointment_time)
  v_arrival := now() - interval '5 minutes';
  v_appt := now() + interval '10 minutes';
  v_rk := 2000000000 + (EXTRACT(epoch FROM v_appt) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000006', 'Hassan B.', 'EXTERNAL', 'SCHEDULED', 'INSIDE_WAITING', v_rk, v_arrival, v_appt, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_appt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'ARRIVAL_CONFIRMED', v_uid, 'secretary');
  v_count := v_count + 1;

  -- B3: SCHEDULED late-demoted → 3B + epoch_ms(arrival)
  v_arrival := now() - interval '2 minutes';
  v_appt := now() - interval '50 minutes';
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000007', 'Layla S.', 'EXTERNAL', 'SCHEDULED', 'INSIDE_WAITING', v_rk, v_arrival, v_appt, 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role, details) VALUES (p_clinic_id, v_tid, 'ARRIVAL_CONFIRMED', v_uid, 'secretary', '{"demoted":true,"reason":"arrived 50min late"}');
  v_count := v_count + 1;

  -- B4: NORMAL walk-in → 3B + epoch_ms(arrival)
  v_arrival := now() - interval '1 minute';
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000008', 'Omar T.', 'WALK_IN', 'NORMAL', 'INSIDE_WAITING', v_rk, v_arrival, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'ARRIVAL_CONFIRMED', v_uid, 'secretary');
  v_count := v_count + 1;

  -- ============================================
  -- C) Active flow states (rank_key preserved)
  -- valid_until = v_close_dt for NORMAL
  -- ============================================

  -- C1: CALLED
  v_arrival := now() - interval '20 minutes';
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000009', 'Nadia F.', 'PHONE_CALL', 'NORMAL', 'CALLED', v_rk, v_arrival, now() - interval '1 minute', 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'CALLED', v_uid, 'doctor');
  v_count := v_count + 1;

  -- C2: IN_SERVICE
  v_arrival := now() - interval '30 minutes';
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, service_started_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000010', 'Khaled Z.', 'WALK_IN', 'NORMAL', 'IN_SERVICE', v_rk, v_arrival, now() - interval '10 minutes', now() - interval '5 minutes', 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'SERVICE_STARTED', v_uid, 'doctor');
  v_count := v_count + 1;

  -- C3: MISSED
  v_arrival := now() - interval '40 minutes';
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, miss_count, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000011', 'Dina W.', 'EXTERNAL', 'NORMAL', 'MISSED', v_rk, v_arrival, now() - interval '15 minutes', 1, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'MARKED_MISSED', v_uid, 'secretary');
  v_count := v_count + 1;

  -- C4: RETURNED
  v_arrival := now() - interval '50 minutes';
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, miss_count, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000012', 'Tarek N.', 'WALK_IN', 'NORMAL', 'RETURNED', v_rk, v_arrival, now() - interval '20 minutes', 1, 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'MARKED_MISSED', v_uid, 'secretary');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'MARKED_RETURNED', v_uid, 'secretary');
  v_count := v_count + 1;

  RETURN v_count;
END;
$$;
