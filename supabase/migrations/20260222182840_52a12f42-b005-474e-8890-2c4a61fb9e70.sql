
-- =============================================
-- 1) marketer_leads table
-- =============================================
CREATE TABLE public.marketer_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  phone text NULL,
  location_notes text NULL,
  lat numeric NULL,
  lng numeric NULL,
  maps_url text NULL,
  status text NOT NULL DEFAULT 'pending_visit'
    CHECK (status IN ('pending_visit', 'follow_up', 'not_interested', 'converted')),
  visit_date timestamptz NULL,
  followup_date timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketer_leads ENABLE ROW LEVEL SECURITY;

-- Helper: get marketer_id for current user
CREATE OR REPLACE FUNCTION public.get_my_marketer_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT marketer_id FROM marketer_users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- RLS: Marketers can only access their own leads
CREATE POLICY "Marketer can view own leads"
  ON public.marketer_leads FOR SELECT
  USING (marketer_id = public.get_my_marketer_id());

CREATE POLICY "Marketer can insert own leads"
  ON public.marketer_leads FOR INSERT
  WITH CHECK (marketer_id = public.get_my_marketer_id());

CREATE POLICY "Marketer can update own leads"
  ON public.marketer_leads FOR UPDATE
  USING (marketer_id = public.get_my_marketer_id())
  WITH CHECK (marketer_id = public.get_my_marketer_id());

CREATE POLICY "Marketer can delete own leads"
  ON public.marketer_leads FOR DELETE
  USING (marketer_id = public.get_my_marketer_id());

-- Superadmin can view all leads
CREATE POLICY "Superadmin can view all leads"
  ON public.marketer_leads FOR SELECT
  USING (is_superadmin(auth.uid()));

-- =============================================
-- 2) RPC: get_marketer_pipeline
-- =============================================
CREATE OR REPLACE FUNCTION public.get_marketer_pipeline()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marketer_id uuid;
  v_active jsonb;
  v_archive jsonb;
BEGIN
  SELECT marketer_id INTO v_marketer_id FROM marketer_users WHERE user_id = auth.uid();
  IF v_marketer_id IS NULL THEN RAISE EXCEPTION 'Not a marketer'; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(l) ORDER BY
    CASE WHEN l.status = 'pending_visit' THEN COALESCE(l.visit_date, l.created_at)
         ELSE COALESCE(l.followup_date, l.created_at) END ASC
  ), '[]'::jsonb)
  INTO v_active
  FROM marketer_leads l
  WHERE l.marketer_id = v_marketer_id AND l.status IN ('pending_visit', 'follow_up');

  SELECT COALESCE(jsonb_agg(row_to_json(l) ORDER BY l.created_at DESC), '[]'::jsonb)
  INTO v_archive
  FROM marketer_leads l
  WHERE l.marketer_id = v_marketer_id AND l.status IN ('not_interested', 'converted');

  RETURN jsonb_build_object('active', v_active, 'archive', v_archive);
END;
$$;

-- =============================================
-- 3) RPC: get_clinic_details_marketer
-- =============================================
CREATE OR REPLACE FUNCTION public.get_clinic_details_marketer(p_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marketer_id uuid;
  v_clinic jsonb;
BEGIN
  SELECT marketer_id INTO v_marketer_id FROM marketer_users WHERE user_id = auth.uid();
  IF v_marketer_id IS NULL THEN RAISE EXCEPTION 'Not a marketer'; END IF;

  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'name_ar', c.name_ar,
    'status', c.status,
    'phone', c.phone,
    'whatsapp_local_1', c.whatsapp_local_1,
    'whatsapp_local_2', c.whatsapp_local_2,
    'clinic_whatsapp_phone', c.clinic_whatsapp_phone,
    'address_text', c.address_text,
    'maps_url', c.maps_url,
    'lat', c.lat,
    'lng', c.lng,
    'governorate_ar', c.governorate_ar,
    'locality_level2_ar', c.locality_level2_ar,
    'locality_level2_type', c.locality_level2_type,
    'locality_level3_ar', c.locality_level3_ar,
    'primary_specialty_id', c.primary_specialty_id,
    'specialty_ar', s.specialty_ar,
    'working_hours_json', c.working_hours_json,
    'serial_id', c.serial_id,
    'financial_status', c.financial_status,
    'created_at', c.created_at,
    'approved_at', c.approved_at,
    'profile_complete', c.profile_complete,
    'open_time', c.open_time,
    'close_time', c.close_time
  ) INTO v_clinic
  FROM clinics c
  LEFT JOIN specialties s ON s.id = c.primary_specialty_id
  WHERE c.id = p_clinic_id AND c.marketer_id = v_marketer_id;

  IF v_clinic IS NULL THEN RAISE EXCEPTION 'Clinic not found or not linked to your account'; END IF;

  RETURN v_clinic;
END;
$$;
