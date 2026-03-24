
-- Clean and recreate test data with future appointment times
DELETE FROM patient_links WHERE clinic_id = 'f6233294-adf0-49cf-8aa8-a73585c635f0' AND ticket_id IN (SELECT id FROM tickets WHERE clinic_id = 'f6233294-adf0-49cf-8aa8-a73585c635f0' AND patient_phone LIKE '+20199900%');
DELETE FROM audit_log WHERE clinic_id = 'f6233294-adf0-49cf-8aa8-a73585c635f0' AND ticket_id IN (SELECT id FROM tickets WHERE clinic_id = 'f6233294-adf0-49cf-8aa8-a73585c635f0' AND patient_phone LIKE '+20199900%');
DELETE FROM tickets WHERE clinic_id = 'f6233294-adf0-49cf-8aa8-a73585c635f0' AND patient_phone LIKE '+20199900%';

DO $$
DECLARE
  v_clinic_id uuid := 'f6233294-adf0-49cf-8aa8-a73585c635f0';
  v_today date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  v_close_dt timestamptz := (v_today || ' 23:59')::timestamp AT TIME ZONE 'Africa/Cairo';
  i int;
  v_tid uuid;
  v_rk numeric;
BEGIN
  -- 5 INSIDE_WAITING patients ahead
  FOR i IN 1..5 LOOP
    v_rk := 3000000000 + (EXTRACT(epoch FROM (now() - (interval '1 minute' * (10 - i)))) * 1000)::bigint;
    INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, visit_type)
    VALUES (v_clinic_id, v_today, '+2019990000' || lpad(i::text, 2, '0'), 'مريض داخلي ' || i, 'WALK_IN', 'NORMAL', 'INSIDE_WAITING', v_rk, now() - (interval '1 minute' * (10 - i)), 'CONSULTATION')
    RETURNING id INTO v_tid;
    INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (v_clinic_id, v_tid, v_close_dt);
  END LOOP;

  -- 10 REMOTE_BOOKED with FUTURE appointment times (within late threshold)
  FOR i IN 1..10 LOOP
    INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, appointment_time, visit_type)
    VALUES (v_clinic_id, v_today, '+2019990000' || lpad((10 + i)::text, 2, '0'), 'مريض خارجي ' || i, 'EXTERNAL', 'SCHEDULED', 'REMOTE_BOOKED',
            now() + (interval '10 minutes' * i),
            'CONSULTATION')
    RETURNING id INTO v_tid;
    INSERT INTO patient_links (clinic_id, ticket_id, valid_until) VALUES (v_clinic_id, v_tid, v_close_dt);
  END LOOP;

  -- Test patient: INSIDE_WAITING, last in queue
  v_rk := 3000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint;
  INSERT INTO tickets (clinic_id, visit_date, patient_phone, patient_name, source, type, status, rank_key, arrival_confirmed_at, visit_type)
  VALUES (v_clinic_id, v_today, '+20199900099', 'مريض الاختبار', 'WALK_IN', 'NORMAL', 'INSIDE_WAITING', v_rk, now(), 'CONSULTATION')
  RETURNING id INTO v_tid;
  INSERT INTO patient_links (clinic_id, ticket_id, valid_until, token)
  VALUES (v_clinic_id, v_tid, v_close_dt, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
END $$;
