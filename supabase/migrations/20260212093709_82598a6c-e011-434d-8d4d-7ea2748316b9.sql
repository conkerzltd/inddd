
-- Extend patient_queue_view with clinic info
ALTER TYPE public.patient_queue_view ADD ATTRIBUTE clinic_name_ar text;
ALTER TYPE public.patient_queue_view ADD ATTRIBUTE clinic_lat double precision;
ALTER TYPE public.patient_queue_view ADD ATTRIBUTE clinic_lng double precision;
ALTER TYPE public.patient_queue_view ADD ATTRIBUTE clinic_maps_url text;

-- Update get_patient_queue_view with Arabic messages and clinic info
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

  IF v_clinic.session_paused THEN
    v_result.message := v_result.message || ' (الطبيب متوقف مؤقتاً — مكانك محفوظ)';
  END IF;

  RETURN v_result;
END;
$function$;
