
-- Add new attributes to composite type for unified queue stats
ALTER TYPE public.patient_queue_view ADD ATTRIBUTE inside_ahead int;
ALTER TYPE public.patient_queue_view ADD ATTRIBUTE prearrival_ahead int;
ALTER TYPE public.patient_queue_view ADD ATTRIBUTE total_ahead int;
ALTER TYPE public.patient_queue_view ADD ATTRIBUTE after_me int;
ALTER TYPE public.patient_queue_view ADD ATTRIBUTE expected_wait_minutes int;

-- Replace get_patient_queue_view with unified queue position + single ETA
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
  v_current_rk numeric;
  v_remote_count int := 0;
  v_rate numeric;
  v_eta_anchor timestamptz;
  v_total_inside int := 0;
  v_total_prearrival int := 0;
  v_self_inside int := 0;
  v_expected_wait int := 0;
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
      v_result.message := 'سيتم تأكيد حضورك عند الوصول بواسطة الاستقبال.';

    WHEN 'LINK_SENT' THEN
      v_result.status_badge := 'BOOKED';
      v_result.appointment_time := v_ticket.appointment_time;
      v_result.message := 'سيتم تأكيد حضورك عند الوصول بواسطة الاستقبال.';

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
      v_result.message := 'أنت الآن داخل العيادة. يرجى البقاء في منطقة الانتظار حتى يتم نداءك.';

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

  IF v_ticket.status IN ('REMOTE_BOOKED', 'LINK_SENT', 'INSIDE_WAITING') THEN
    IF v_ticket.status = 'INSIDE_WAITING' THEN
      v_current_rk := v_ticket.rank_key;
    ELSE
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

    IF v_ticket.status IN ('REMOTE_BOOKED', 'LINK_SENT') THEN
      SELECT COUNT(*) + 1 INTO v_position
      FROM tickets
      WHERE clinic_id = v_ticket.clinic_id
        AND visit_date = v_ticket.visit_date
        AND status = 'INSIDE_WAITING'
        AND rank_key IS NOT NULL
        AND rank_key < v_current_rk;
    END IF;

    SELECT COUNT(*) INTO v_remote_count
    FROM tickets t
    WHERE t.clinic_id = v_ticket.clinic_id
      AND t.visit_date = v_ticket.visit_date
      AND t.status IN ('REMOTE_BOOKED', 'LINK_SENT')
      AND t.id <> v_ticket.id
      AND (
        (
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
        ) < v_current_rk
        OR (
          (
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
          ) = v_current_rk
          AND (
            t.created_at < v_ticket.created_at
            OR (t.created_at = v_ticket.created_at AND t.id < v_ticket.id)
          )
        )
      );

    -- Unified queue stats
    v_rate := GREATEST(0, LEAST(1, COALESCE(v_clinic.remote_showup_rate, 0.6)));

    v_result.inside_ahead := v_position - 1;
    v_result.prearrival_ahead := v_remote_count;
    v_result.total_ahead := (v_position - 1) + v_remote_count;
    v_result.eligible_position := (v_position - 1) + v_remote_count + 1;

    -- After me count
    SELECT COUNT(*) INTO v_total_inside FROM tickets
    WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_ticket.visit_date AND status = 'INSIDE_WAITING';
    SELECT COUNT(*) INTO v_total_prearrival FROM tickets
    WHERE clinic_id = v_ticket.clinic_id AND visit_date = v_ticket.visit_date
      AND status IN ('REMOTE_BOOKED', 'LINK_SENT') AND id <> v_ticket.id;
    v_self_inside := CASE WHEN v_ticket.status = 'INSIDE_WAITING' THEN 1 ELSE 0 END;
    v_result.after_me := GREATEST(0, (v_total_inside - (v_position - 1) - v_self_inside) + (v_total_prearrival - v_remote_count));

    -- Single ETA
    v_expected_wait := ((v_position - 1) * v_avg + v_remote_count * v_rate * v_avg)::int;
    v_result.expected_wait_minutes := GREATEST(0, v_expected_wait);
    v_result.eta_min_minutes := GREATEST(1, v_expected_wait);
    v_result.eta_max_minutes := GREATEST(1, v_expected_wait);

    -- Stable anchor for progress bar
    v_eta_anchor := CASE
      WHEN v_ticket.status = 'INSIDE_WAITING' THEN COALESCE(v_ticket.arrival_confirmed_at, v_ticket.created_at, now())
      WHEN v_ticket.appointment_time IS NOT NULL THEN v_ticket.appointment_time
      ELSE COALESCE(v_link.created_at, v_ticket.created_at, now())
    END;

    v_result.expected_window_start := v_eta_anchor;
    v_result.expected_window_end := v_eta_anchor + (v_expected_wait || ' minutes')::interval;

    IF v_remote_count > 0 AND v_result.message NOT LIKE '%توسيع نطاق التقدير%' THEN
      v_result.message := v_result.message || ' — تم توسيع نطاق التقدير لاحتمال وصول بعض الحجوزات قبل الوصول.';
    END IF;
  END IF;

  IF v_clinic.session_paused THEN
    v_result.message := v_result.message || ' (الطبيب متوقف مؤقتاً — مكانك محفوظ)';
  END IF;

  RETURN v_result;
END;
$function$;
