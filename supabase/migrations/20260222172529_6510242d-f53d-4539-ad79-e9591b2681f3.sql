
-- 1) marketer_users: link auth users to marketers
CREATE TABLE public.marketer_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  marketer_id uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketer_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can view marketer_users"
  ON public.marketer_users FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can insert marketer_users"
  ON public.marketer_users FOR INSERT
  WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete marketer_users"
  ON public.marketer_users FOR DELETE
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Marketer can view own mapping"
  ON public.marketer_users FOR SELECT
  USING (auth.uid() = user_id);

-- 2) must_set_password flag on marketers
ALTER TABLE public.marketers
  ADD COLUMN IF NOT EXISTS must_set_password boolean NOT NULL DEFAULT false;

-- 3) marketer_password_reset_requests
CREATE TABLE public.marketer_password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  resolved_by uuid NULL
);
ALTER TABLE public.marketer_password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can view reset requests"
  ON public.marketer_password_reset_requests FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update reset requests"
  ON public.marketer_password_reset_requests FOR UPDATE
  USING (is_superadmin(auth.uid()));

-- 4) RPC: get_marketer_login_state (anon-safe)
CREATE OR REPLACE FUNCTION public.get_marketer_login_state(p_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marketer marketers%ROWTYPE;
  v_has_account boolean;
BEGIN
  SELECT * INTO v_marketer FROM marketers WHERE referral_code = upper(trim(p_referral_code));
  IF v_marketer IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'status', null, 'has_account', false);
  END IF;
  SELECT EXISTS (SELECT 1 FROM marketer_users WHERE marketer_id = v_marketer.id) INTO v_has_account;
  RETURN jsonb_build_object('valid', true, 'status', v_marketer.status::text, 'has_account', v_has_account);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketer_login_state(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_marketer_login_state(text) TO authenticated;

-- 5) RPC: request_marketer_password_reset (anon-safe)
CREATE OR REPLACE FUNCTION public.request_marketer_password_reset(p_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marketer_id uuid;
  v_existing_pending boolean;
BEGIN
  SELECT id INTO v_marketer_id FROM marketers
  WHERE referral_code = upper(trim(p_referral_code)) AND status = 'active';

  IF v_marketer_id IS NULL THEN
    -- Return generic ok to avoid code enumeration
    RETURN jsonb_build_object('ok', true, 'message', 'تم إرسال طلب إعادة التعيين للإدارة.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM marketer_password_reset_requests
    WHERE marketer_id = v_marketer_id AND status = 'pending'
  ) INTO v_existing_pending;

  IF NOT v_existing_pending THEN
    INSERT INTO marketer_password_reset_requests (marketer_id) VALUES (v_marketer_id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'message', 'تم إرسال طلب إعادة التعيين للإدارة.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_marketer_password_reset(text) TO anon;
GRANT EXECUTE ON FUNCTION public.request_marketer_password_reset(text) TO authenticated;

-- 6) RPC: get_my_marketer_crm (authenticated)
CREATE OR REPLACE FUNCTION public.get_my_marketer_crm()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_marketer_id uuid;
  v_marketer_name text;
  v_referral_code text;
  v_must_set_password boolean;
  v_clinics jsonb;
  v_counts jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT marketer_id INTO v_marketer_id FROM marketer_users WHERE user_id = v_uid;
  IF v_marketer_id IS NULL THEN RAISE EXCEPTION 'Not a marketer'; END IF;

  SELECT name, referral_code, must_set_password
  INTO v_marketer_name, v_referral_code, v_must_set_password
  FROM marketers WHERE id = v_marketer_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name_ar', c.name_ar,
    'name', c.name,
    'status', c.status,
    'governorate_ar', c.governorate_ar,
    'locality_level2_ar', c.locality_level2_ar,
    'maps_url', c.maps_url,
    'lat', c.lat,
    'lng', c.lng,
    'created_at', c.created_at
  ) ORDER BY c.created_at DESC), '[]'::jsonb)
  INTO v_clinics
  FROM clinics c WHERE c.marketer_id = v_marketer_id;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'draft', COUNT(*) FILTER (WHERE status = 'draft'),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'active', COUNT(*) FILTER (WHERE status = 'active'),
    'blocked', COUNT(*) FILTER (WHERE status = 'blocked')
  ) INTO v_counts
  FROM clinics WHERE marketer_id = v_marketer_id;

  RETURN jsonb_build_object(
    'marketer_name', v_marketer_name,
    'referral_code', v_referral_code,
    'must_set_password', v_must_set_password,
    'clinics', v_clinics,
    'counts', v_counts
  );
END;
$$;

-- 7) RPC: clear must_set_password after marketer changes password
CREATE OR REPLACE FUNCTION public.marketer_clear_must_set_password()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_marketer_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT marketer_id INTO v_marketer_id FROM marketer_users WHERE user_id = v_uid;
  IF v_marketer_id IS NULL THEN RAISE EXCEPTION 'Not a marketer'; END IF;
  UPDATE marketers SET must_set_password = false WHERE id = v_marketer_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;
