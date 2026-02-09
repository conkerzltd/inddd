
-- =============================================
-- 1) bootstrap_demo_clinic()
-- =============================================
CREATE OR REPLACE FUNCTION public.bootstrap_demo_clinic()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Idempotent: if user already has a role, return their clinic
  SELECT clinic_id INTO v_clinic_id
  FROM user_roles
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_clinic_id IS NOT NULL THEN
    RETURN v_clinic_id;
  END IF;

  -- Create clinic
  INSERT INTO clinics (
    name, timezone, open_time, close_time,
    avg_service_minutes, grace_minutes, late_threshold_minutes,
    intake_open, session_paused
  ) VALUES (
    'Demo Clinic', 'Africa/Cairo', '10:00', '22:00',
    10, 15, 45,
    true, false
  ) RETURNING id INTO v_clinic_id;

  -- Assign owner + admin roles
  INSERT INTO user_roles (user_id, clinic_id, role) VALUES
    (v_uid, v_clinic_id, 'owner'),
    (v_uid, v_clinic_id, 'admin');

  RETURN v_clinic_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_demo_clinic() TO authenticated;

-- =============================================
-- 2) seed_demo_day(p_clinic_id uuid)
-- =============================================
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
  v_now_ms bigint;
  v_tid uuid;
  v_base_time timestamptz;
  v_rk numeric;
  v_count int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Must be owner or admin
  IF NOT is_clinic_owner_or_admin(v_uid, p_clinic_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = p_clinic_id;
  IF v_clinic IS NULL THEN
    RAISE EXCEPTION 'Clinic not found';
  END IF;

  -- Today in clinic timezone
  v_today := (now() AT TIME ZONE v_clinic.timezone)::date;

  -- Idempotent: skip if tickets exist for today
  SELECT COUNT(*) INTO v_existing
  FROM tickets WHERE clinic_id = p_clinic_id AND visit_date = v_today;
  IF v_existing > 0 THEN
    RETURN v_existing;
  END IF;

  v_now_ms := (EXTRACT(epoch FROM now()) * 1000)::bigint;
  -- Base time: now in clinic tz rounded to next hour
  v_base_time := date_trunc('hour', now()) + interval '1 hour';

  -- ============================================
  -- A) Scheduled pre-arrival (rank_key NULL)
  -- ============================================

  -- A1: REMOTE_BOOKED scheduled
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000001', 'Sara M.', 'EXTERNAL', 'SCHEDULED', 'REMOTE_BOOKED', v_base_time, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_base_time + interval '2 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  -- A2: REMOTE_BOOKED scheduled
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000002', 'Ahmed K.', 'EXTERNAL', 'SCHEDULED', 'REMOTE_BOOKED', v_base_time + interval '30 minutes', 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_base_time + interval '2.5 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  -- A3: LINK_SENT scheduled
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000003', 'Mona R.', 'EXTERNAL', 'SCHEDULED', 'LINK_SENT', v_base_time + interval '1 hour', 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_base_time + interval '3 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'LINK_SENT', v_uid, 'admin');
  v_count := v_count + 1;

  -- A4: LINK_SENT scheduled
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000004', 'Youssef H.', 'PHONE_CALL', 'SCHEDULED', 'LINK_SENT', v_base_time + interval '1.5 hours', 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_base_time + interval '3.5 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'LINK_SENT', v_uid, 'admin');
  v_count := v_count + 1;

  -- ============================================
  -- B) INSIDE_WAITING (rank_key set)
  -- ============================================

  -- B1: URGENT
  v_rk := 1000000000 + v_now_ms - 180000; -- arrived 3 min ago
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000005', 'Fatma A.', 'WALK_IN', 'URGENT', 'INSIDE_WAITING', v_rk, now() - interval '3 minutes', 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, now() + interval '6 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'ARRIVAL_CONFIRMED', v_uid, 'secretary');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role, details) VALUES (p_clinic_id, v_tid, 'SET_URGENT', v_uid, 'admin', '{"reason":"emergency"}');
  v_count := v_count + 1;

  -- B2: SCHEDULED on-time
  v_rk := 2000000000 + v_now_ms - 300000; -- arrived 5 min ago
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000006', 'Hassan B.', 'EXTERNAL', 'SCHEDULED', 'INSIDE_WAITING', v_rk, now() - interval '5 minutes', now() + interval '10 minutes', 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, now() + interval '6 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'ARRIVAL_CONFIRMED', v_uid, 'secretary');
  v_count := v_count + 1;

  -- B3: SCHEDULED late-demoted (rank_key in NORMAL lane)
  v_rk := 3000000000 + v_now_ms - 120000; -- arrived 2 min ago, but demoted
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000007', 'Layla S.', 'EXTERNAL', 'SCHEDULED', 'INSIDE_WAITING', v_rk, now() - interval '2 minutes', now() - interval '50 minutes', 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, now() + interval '6 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role, details) VALUES (p_clinic_id, v_tid, 'ARRIVAL_CONFIRMED', v_uid, 'secretary', '{"demoted":true,"reason":"arrived 50min late"}');
  v_count := v_count + 1;

  -- B4: NORMAL walk-in
  v_rk := 3000000000 + v_now_ms - 60000; -- arrived 1 min ago
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000008', 'Omar T.', 'WALK_IN', 'NORMAL', 'INSIDE_WAITING', v_rk, now() - interval '1 minute', 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, now() + interval '6 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'ARRIVAL_CONFIRMED', v_uid, 'secretary');
  v_count := v_count + 1;

  -- ============================================
  -- C) Active flow states (rank_key preserved)
  -- ============================================

  -- C1: CALLED
  v_rk := 3000000000 + v_now_ms - 600000; -- was waiting, called 1 min ago
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000009', 'Nadia F.', 'PHONE_CALL', 'NORMAL', 'CALLED', v_rk, now() - interval '20 minutes', now() - interval '1 minute', 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, now() + interval '6 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'CALLED', v_uid, 'doctor');
  v_count := v_count + 1;

  -- C2: IN_SERVICE
  v_rk := 3000000000 + v_now_ms - 900000; -- earlier arrival
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, service_started_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000010', 'Khaled Z.', 'WALK_IN', 'NORMAL', 'IN_SERVICE', v_rk, now() - interval '30 minutes', now() - interval '10 minutes', now() - interval '5 minutes', 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, now() + interval '6 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'SERVICE_STARTED', v_uid, 'doctor');
  v_count := v_count + 1;

  -- C3: MISSED
  v_rk := 3000000000 + v_now_ms - 1200000;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, miss_count, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000011', 'Dina W.', 'EXTERNAL', 'NORMAL', 'MISSED', v_rk, now() - interval '40 minutes', now() - interval '15 minutes', 1, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, now() + interval '6 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'MARKED_MISSED', v_uid, 'secretary');
  v_count := v_count + 1;

  -- C4: RETURNED
  v_rk := 3000000000 + v_now_ms - 1500000;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, miss_count, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000012', 'Tarek N.', 'WALK_IN', 'NORMAL', 'RETURNED', v_rk, now() - interval '50 minutes', now() - interval '20 minutes', 1, 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, now() + interval '6 hours');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'MARKED_MISSED', v_uid, 'secretary');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'MARKED_RETURNED', v_uid, 'secretary');
  v_count := v_count + 1;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_demo_day(uuid) TO authenticated;
