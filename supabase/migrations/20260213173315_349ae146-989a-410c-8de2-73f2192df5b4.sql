
-- Create update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create marketers table
CREATE TABLE public.marketers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  primary_phone text NOT NULL,
  whatsapp_link text,
  secondary_phone text,
  governorate_ar text,
  city_ar text,
  detailed_address text,
  target_areas text[],
  referral_code text NOT NULL UNIQUE,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns to clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS marketer_id uuid;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS status public.entity_status NOT NULL DEFAULT 'active';

ALTER TABLE public.clinics ADD CONSTRAINT clinics_marketer_id_fkey 
  FOREIGN KEY (marketer_id) REFERENCES public.marketers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.marketers ENABLE ROW LEVEL SECURITY;

-- Superadmin check function
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'superadmin')
$$;

-- Marketers RLS
CREATE POLICY "Superadmin can view all marketers" ON public.marketers FOR SELECT USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can insert marketers" ON public.marketers FOR INSERT WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can update marketers" ON public.marketers FOR UPDATE USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can delete marketers" ON public.marketers FOR DELETE USING (public.is_superadmin(auth.uid()));

-- Referral code generator
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text; v_exists boolean;
BEGIN
  LOOP
    v_code := 'IND-' || upper(substr(md5(random()::text), 1, 4));
    SELECT EXISTS (SELECT 1 FROM public.marketers WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END; $$;

-- Auto referral code trigger
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_set_referral_code BEFORE INSERT ON public.marketers FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();
CREATE TRIGGER update_marketers_updated_at BEFORE UPDATE ON public.marketers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validate referral code (accessible to authenticated users for signup)
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_marketer marketers%ROWTYPE;
BEGIN
  SELECT * INTO v_marketer FROM marketers WHERE referral_code = upper(trim(p_code));
  IF v_marketer IS NULL THEN RETURN jsonb_build_object('valid', false, 'message', 'كود الإحالة غير موجود'); END IF;
  IF v_marketer.status <> 'active' THEN RETURN jsonb_build_object('valid', false, 'message', 'كود الإحالة غير مفعّل'); END IF;
  RETURN jsonb_build_object('valid', true, 'marketer_id', v_marketer.id, 'marketer_name', v_marketer.name);
END; $$;

-- Superadmin policies for existing tables
CREATE POLICY "Superadmin can view all clinics" ON public.clinics FOR SELECT USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can update all clinics" ON public.clinics FOR UPDATE USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can view all roles" ON public.user_roles FOR SELECT USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can insert any role" ON public.user_roles FOR INSERT WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can update any role" ON public.user_roles FOR UPDATE USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can delete any role" ON public.user_roles FOR DELETE USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can view all tickets" ON public.tickets FOR SELECT USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can view all audit logs" ON public.audit_log FOR SELECT USING (public.is_superadmin(auth.uid()));
