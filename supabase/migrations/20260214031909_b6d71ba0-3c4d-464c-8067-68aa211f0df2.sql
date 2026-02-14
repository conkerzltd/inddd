
-- 1) Add clinic-level columns
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS remote_showup_rate numeric NOT NULL DEFAULT 0.6,
  ADD COLUMN IF NOT EXISTS remote_showup_last_calculated_at timestamptz;

UPDATE public.clinics
SET remote_showup_rate = GREATEST(0, LEAST(1, remote_showup_rate))
WHERE remote_showup_rate IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_clinics_remote_showup_rate_range'
  ) THEN
    ALTER TABLE public.clinics
      ADD CONSTRAINT check_clinics_remote_showup_rate_range
      CHECK (remote_showup_rate >= 0 AND remote_showup_rate <= 1);
  END IF;
END $$;

-- 2) Recompute showup rate RPC
CREATE OR REPLACE FUNCTION public.recompute_clinic_showup_rate(
  p_clinic_id uuid,
  p_days int DEFAULT 30,
  p_min_sample int DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total int := 0;
  v_arrived int := 0;
  v_rate numeric := 0.6;
  v_from date := (current_date - p_days);
  v_to   date := current_date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT is_clinic_owner_or_admin(v_uid, p_clinic_id)
     AND NOT has_role(v_uid, p_clinic_id, 'secretary')
  THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.tickets
  WHERE clinic_id = p_clinic_id
    AND visit_date BETWEEN v_from AND v_to
    AND source IN ('EXTERNAL','PHONE_CALL')
    AND status <> 'CANCELLED';

  SELECT COUNT(*) INTO v_arrived
  FROM public.tickets
  WHERE clinic_id = p_clinic_id
    AND visit_date BETWEEN v_from AND v_to
    AND source IN ('EXTERNAL','PHONE_CALL')
    AND status <> 'CANCELLED'
    AND arrival_confirmed_at IS NOT NULL;

  IF v_total >= p_min_sample THEN
    v_rate := GREATEST(0, LEAST(1, (v_arrived::numeric / v_total::numeric)));
  ELSE
    v_rate := 0.6;
  END IF;

  UPDATE public.clinics
  SET remote_showup_rate = ROUND(v_rate, 2),
      remote_showup_last_calculated_at = now()
  WHERE id = p_clinic_id;

  RETURN jsonb_build_object(
    'clinic_id', p_clinic_id,
    'days', p_days,
    'min_sample', p_min_sample,
    'total_remote', v_total,
    'arrived_remote', v_arrived,
    'computed_rate', ROUND(v_rate, 2),
    'used_default', (v_total < p_min_sample)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_clinic_showup_rate(uuid,int,int) TO authenticated;

-- 3) Update get_patient_queue_view to widen ETA with remote load
CREATE OR REPLACE FUNCTION public.get_patient_queue_view(p_token uuid)
 RETURNS patient_queue_view
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_link patient_links%ROWTYPE;
  v_ticket tickets%ROWTYPE;
  v_clinic clinics%ROWTYPE;
  v_result patient_queue_view;
  v_position int;
  v_avg int;
  -- remote load variables
  v_current_rk numeric;
  v_remote_count int := 0;
  v_rate numeric;
  v_remote_load_minutes int := 0;
BEGIN
  SELECT * INTO v_link
  FROM patient_links
  WHERE token = p_token AND revoked_at IS NULL
  LIMIT 1;

  IF v_link IS NULL THEN
    v_result.message := 'رابط غير صالح. يرجى التواصل مع العيادة.';
    RETURN v_result;
  END IF;

  IF now() > v_link.valid_until THEN
    v_result.message := 'انتهت صلاحية هذا الرابط. يرجى التواصل مع العيادة.';
    RETURN v_result;
  END IF;

  UPDATE patient_links SET last_opened_at = now() WHERE id = v_link.id;

  SELECT * INTO v_ticket FROM tickets WHERE id = v_link.ticket_id;
  SELECT * INTO v_clinic FROM clinics WHERE id = v_link.clinic_id;

  IF v_ticket IS NULL OR v_clinic IS NULL THEN
    v_result.message := 'تعذر تحميل بيانات قائمة الانتظار. يرجى التواصل مع العيادة.';
    RETURN v_result;
  END IF;

  IF v_ticket.clinic_id <> v_link.clinic_id THEN
    v_result.message := 'تعذر تحميل بيانات قائمة الانتظار. يرجى التواصل مع العيادة.';
    RETURN v_result;
  END IF;

  -- Populate clinic info
  v_result.clinic_name_ar := COALESCE(v_clinic.name_ar, v_clinic.name);
  v_result.clinic_lat := v_clinic.lat;
  v_result.clinic_lng := v_clinic.lng;
  v_result.clinic_maps_url := v_clinic.maps_url;

  v_result.session_paused := v_clinic.session_paused;
  v_result.intake_open := v_clinic.intake_open;
  v_avg := v_clinic.avg_service_minutes;

  CASE v_ticket.status
    WHEN 'REMOTE_BOOKED' THEN
      v_result.status_badge := 'BOOKED';
      v_result.appointment_time := v_ticket.appointment_time;
      IF v_ticket.appointment_time IS NOT NULL THEN
        v_result.expected_window_start := v_ticket.appointment_time - (v_avg || ' minutes')::interval;
        v_result.expected_window_end   := v_ticket.appointment_time + (v_avg || ' minutes')::interval;
      END IF;
      v_result.message := 'يرجى الحضور في الموعد المحدد لتجنب فقدان دورك في قائمة الانتظار.';

    WHEN 'LINK_SENT' THEN
      v_result.status_badge := 'BOOKED';
      v_result.appointment_time := v_ticket.appointment_time;
      IF v_ticket.appointment_time IS NOT NULL THEN
        v_result.expected_window_start := v_ticket.appointment_time - (v_avg || ' minutes')::interval;
        v_result.expected_window_end   := v_ticket.appointment_time + (v_avg || ' minutes')::interval;
      END IF;
      v_result.message := 'يرجى الحضور في الموعد المحدد لتجنب فقدان دورك في قائمة الانتظار.';

    WHEN 'INSIDE_WAITING' THEN
      v_result.status_badge := 'WAITING';
      SELECT COUNT(*) + 1 INTO v_position
      FROM tickets
      WHERE clinic_id = v_ticket.clinic_id
        AND visit_date = v_ticket.visit_date
        AND status = 'INSIDE_WAITING'
        AND (
          rank_key < v_ticket.rank_key
          OR (rank_key = v_ticket.rank_key AND created_at < v_ticket.created_at)
          OR (rank_key = v_ticket.rank_key AND created_at = v_ticket.created_at AND id < v_ticket.id)
        );
      v_result.eligible_position := v_position;
      v_result.eta_min_minutes := GREATEST(1, ((v_position - 1) * v_avg * 0.7)::int);
      v_result.eta_max_minutes := GREATEST(1, ((v_position - 1) * v_avg * 1.3)::int);
      v_result.message := 'يرجى البقاء في منطقة الانتظار حتى يتم نداءك.';

    WHEN 'CALLED' THEN
      v_result.status_badge := 'CALLED';
      v_result.message := 'تم نداءك! توجّه إلى غرفة الكشف الآن. يرجى الحضور فوراً حتى لا يُنادى مريض آخر.';

    WHEN 'IN_SERVICE' THEN
      v_result.status_badge := 'IN_SERVICE';
      v_result.message := 'أنت داخل الكشف الآن.';

    WHEN 'DONE' THEN
      v_result.status_badge := 'DONE';
      v_result.message := 'تمت زيارتك بنجاح. شكراً لك ونتمنى لك السلامة!';

    WHEN 'MISSED' THEN
      v_result.status_badge := 'MISSED';
      v_result.message := 'تم نداءك ولم يتم العثور عليك. يرجى التواصل مع السكرتارية لإعادة إدراجك.';

    WHEN 'RETURNED' THEN
      v_result.status_badge := 'RETURNED';
      v_result.message := 'يتم إعادة إدراجك في قائمة الانتظار. انتظر حتى يتم نداءك مرة أخرى.';

    WHEN 'CANCELLED' THEN
      v_result.status_badge := 'CANCELLED';
      v_result.message := 'تم إلغاء هذه الزيارة. للاستفسار يرجى التواصل مع العيادة.';

    WHEN 'CLOSED_OUT' THEN
      v_result.status_badge := 'CLOSED';
      v_result.message := 'انتهت جلسة العيادة لهذا اليوم.';

    ELSE
      v_result.message := 'يرجى التواصل مع العيادة للاستفسار عن حالتك.';
  END CASE;

  -- ── Remote load ETA widening ──
  IF v_ticket.status IN ('REMOTE_BOOKED', 'LINK_SENT', 'INSIDE_WAITING') THEN
    -- Compute current patient virtual rank_key
    IF v_ticket.rank_key IS NOT NULL THEN
      v_current_rk := v_ticket.rank_key;
    ELSE
      -- Virtual rk using confirm_arrival rules
      IF v_ticket.type = 'URGENT' THEN
        v_current_rk := 1000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint;
      ELSIF v_ticket.type = 'SCHEDULED' AND v_ticket.appointment_time IS NOT NULL THEN
        IF EXTRACT(epoch FROM (now() - v_ticket.appointment_time))::int / 60 > v_clinic.late_threshold_minutes THEN
          v_current_rk := 3000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint;
        ELSE
          v_current_rk := 2000000000 + (EXTRACT(epoch FROM v_ticket.appointment_time) * 1000)::bigint;
        END IF;
      ELSIF v_ticket.type = 'SCHEDULED' THEN
        v_current_rk := 2000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint;
      ELSE
        v_current_rk := 3000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint;
      END IF;
    END IF;

    -- Count remote tickets ahead that haven't arrived
    SELECT COUNT(*) INTO v_remote_count
    FROM tickets t
    WHERE t.clinic_id = v_ticket.clinic_id
      AND t.visit_date = v_ticket.visit_date
      AND t.status IN ('REMOTE_BOOKED', 'LINK_SENT')
      AND t.arrival_confirmed_at IS NULL
      AND t.source IN ('EXTERNAL', 'PHONE_CALL')
      AND t.id <> v_ticket.id
      AND (
        CASE
          WHEN t.type = 'URGENT' THEN
            1000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint
          WHEN t.type = 'SCHEDULED' AND t.appointment_time IS NOT NULL THEN
            CASE
              WHEN EXTRACT(epoch FROM (now() - t.appointment_time))::int / 60 > v_clinic.late_threshold_minutes THEN
                3000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint
              ELSE
                2000000000 + (EXTRACT(epoch FROM t.appointment_time) * 1000)::bigint
            END
          WHEN t.type = 'SCHEDULED' THEN
            2000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint
          ELSE
            3000000000 + (EXTRACT(epoch FROM now()) * 1000)::bigint
        END
      ) < v_current_rk;

    -- Compute remote load minutes
    v_rate := GREATEST(0, LEAST(1, COALESCE(v_clinic.remote_showup_rate, 0.6)));
    v_remote_load_minutes := CEIL(v_remote_count * v_rate * v_avg)::int;

    IF v_remote_load_minutes > 0 THEN
      -- Widen upper bound only
      IF v_result.eta_max_minutes IS NOT NULL THEN
        v_result.eta_max_minutes := v_result.eta_max_minutes + v_remote_load_minutes;
      END IF;
      IF v_result.expected_window_end IS NOT NULL THEN
        v_result.expected_window_end := v_result.expected_window_end + (v_remote_load_minutes || ' minutes')::interval;
      END IF;
      -- Append Arabic hint
      IF v_result.message NOT LIKE '%توسيع نطاق التقدير%' THEN
        v_result.message := v_result.message || ' — تم توسيع نطاق التقدير لاحتمال وصول بعض الحجوزات قبل الوصول.';
      END IF;
    END IF;
  END IF;

  IF v_clinic.session_paused THEN
    v_result.message := v_result.message || ' (الطبيب متوقف مؤقتاً — مكانك محفوظ)';
  END IF;

  RETURN v_result;
END;
$function$;
