
CREATE OR REPLACE FUNCTION public.seed_demo_day(p_clinic_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic clinics%ROWTYPE;
  v_today date;
  v_tid uuid;
  v_rk numeric;
  v_count int := 0;
  v_close_dt timestamptz;
  v_arrival timestamptz;
  v_appt timestamptz;
  v_now_local timestamp;
  v_base_local timestamp;
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

  v_now_local := now() AT TIME ZONE v_clinic.timezone;
  v_today := v_now_local::date;
  v_base_local := date_trunc('hour', v_now_local) + interval '1 hour';

  -- Clean up previous seed tickets (identified by phone pattern +20100000000*)
  DELETE FROM patient_links
  WHERE clinic_id = p_clinic_id
    AND ticket_id IN (
      SELECT id FROM tickets
      WHERE clinic_id = p_clinic_id AND visit_date = v_today
        AND patient_phone LIKE '+20100000000%'
    );

  DELETE FROM audit_log
  WHERE clinic_id = p_clinic_id
    AND ticket_id IN (
      SELECT id FROM tickets
      WHERE clinic_id = p_clinic_id AND visit_date = v_today
        AND patient_phone LIKE '+20100000000%'
    );

  DELETE FROM tickets
  WHERE clinic_id = p_clinic_id AND visit_date = v_today
    AND patient_phone LIKE '+20100000000%';

  v_close_dt := (v_today || ' ' || v_clinic.close_time)::timestamp AT TIME ZONE v_clinic.timezone;

  -- A) Scheduled pre-arrival
  v_appt := v_base_local AT TIME ZONE v_clinic.timezone;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000001', 'سارة محمود', 'EXTERNAL', 'SCHEDULED', 'REMOTE_BOOKED', v_appt, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_appt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  v_appt := (v_base_local + interval '30 minutes') AT TIME ZONE v_clinic.timezone;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000002', 'أحمد محمد', 'EXTERNAL', 'SCHEDULED', 'REMOTE_BOOKED', v_appt, 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_appt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  v_appt := (v_base_local + interval '1 hour') AT TIME ZONE v_clinic.timezone;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000003', 'منى رشدي', 'EXTERNAL', 'SCHEDULED', 'LINK_SENT', v_appt, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_appt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'LINK_SENT', v_uid, 'admin');
  v_count := v_count + 1;

  v_appt := (v_base_local + interval '1.5 hours') AT TIME ZONE v_clinic.timezone;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000004', 'يوسف حسن', 'PHONE_CALL', 'SCHEDULED', 'LINK_SENT', v_appt, 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_appt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'LINK_SENT', v_uid, 'admin');
  v_count := v_count + 1;

  -- B) INSIDE_WAITING
  v_arrival := now() - interval '3 minutes';
  v_rk := 1000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000005', 'فاطمة علي', 'WALK_IN', 'URGENT', 'INSIDE_WAITING', v_rk, v_arrival, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  v_arrival := now() - interval '5 minutes';
  v_appt := (v_now_local + interval '10 minutes') AT TIME ZONE v_clinic.timezone;
  v_rk := 2000000000 + (EXTRACT(epoch FROM v_appt) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000006', 'حسن بدر', 'EXTERNAL', 'SCHEDULED', 'INSIDE_WAITING', v_rk, v_arrival, v_appt, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_appt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  v_arrival := now() - interval '2 minutes';
  v_appt := (v_now_local - interval '50 minutes') AT TIME ZONE v_clinic.timezone;
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, appointment_time, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000007', 'ليلى سعيد', 'EXTERNAL', 'SCHEDULED', 'INSIDE_WAITING', v_rk, v_arrival, v_appt, 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  v_arrival := now() - interval '1 minute';
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000008', 'عمر طارق', 'WALK_IN', 'NORMAL', 'INSIDE_WAITING', v_rk, v_arrival, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  -- C) Active flow states
  v_arrival := now() - interval '20 minutes';
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000009', 'نادية فؤاد', 'PHONE_CALL', 'NORMAL', 'CALLED', v_rk, v_arrival, now() - interval '1 minute', 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  v_arrival := now() - interval '30 minutes';
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, service_started_at, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000010', 'خالد زكي', 'WALK_IN', 'NORMAL', 'IN_SERVICE', v_rk, v_arrival, now() - interval '10 minutes', now() - interval '5 minutes', 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  v_arrival := now() - interval '40 minutes';
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, miss_count, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000011', 'دينا وائل', 'EXTERNAL', 'NORMAL', 'MISSED', v_rk, v_arrival, now() - interval '15 minutes', 1, 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  v_arrival := now() - interval '50 minutes';
  v_rk := 3000000000 + (EXTRACT(epoch FROM v_arrival) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, called_at, miss_count, visit_type)
  VALUES (p_clinic_id, v_today, '+201000000012', 'طارق نبيل', 'WALK_IN', 'NORMAL', 'RETURNED', v_rk, v_arrival, now() - interval '20 minutes', 1, 'NEW')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (p_clinic_id, v_tid, v_close_dt);
  INSERT INTO audit_log (clinic_id, ticket_id, action, actor_id, actor_role) VALUES (p_clinic_id, v_tid, 'TICKET_CREATED', v_uid, 'admin');
  v_count := v_count + 1;

  RETURN v_count;
END;
$function$;
