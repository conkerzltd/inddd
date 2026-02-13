
-- ═══════════════════════════════════════════════════════
-- PHASE 1: DATABASE SCHEMA UPGRADES
-- ═══════════════════════════════════════════════════════

-- 1A: Financial status enum for clinics
CREATE TYPE public.financial_status AS ENUM ('trial', 'paid', 'overdue');

-- 1A: Add billing/financial columns to clinics
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS subscription_fee numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_billing_date date,
  ADD COLUMN IF NOT EXISTS financial_status public.financial_status NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- 1B: Add HR override fields to marketers
ALTER TABLE public.marketers
  ADD COLUMN IF NOT EXISTS base_salary numeric NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS working_days_per_month int NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS absence_penalty_multiplier numeric NOT NULL DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS monthly_target_clinics int NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS commission_per_clinic numeric NOT NULL DEFAULT 100;

-- 1C: Commissions table (anti-fraud: UNIQUE clinic_id prevents double commission)
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_trial' CHECK (status IN ('pending_trial', 'earned', 'paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  earned_date timestamptz,
  paid_at timestamptz,
  UNIQUE(clinic_id)
);
CREATE INDEX idx_commissions_marketer_status ON public.commissions(marketer_id, status, earned_date);
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can view commissions" ON public.commissions FOR SELECT USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can insert commissions" ON public.commissions FOR INSERT WITH CHECK (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can update commissions" ON public.commissions FOR UPDATE USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can delete commissions" ON public.commissions FOR DELETE USING (is_superadmin(auth.uid()));

-- 1D: Attendance unique constraint (table already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marketer_attendance_unique_date'
  ) THEN
    ALTER TABLE public.marketer_attendance
      ADD CONSTRAINT marketer_attendance_unique_date UNIQUE (marketer_id, attendance_date);
  END IF;
END $$;

-- 1E: Clinic payments table (audit trail for subscriptions)
CREATE TABLE public.clinic_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  paid_at timestamptz NOT NULL DEFAULT now(),
  amount numeric NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clinic_payments_clinic ON public.clinic_payments(clinic_id, paid_at);
ALTER TABLE public.clinic_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can view clinic_payments" ON public.clinic_payments FOR SELECT USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can insert clinic_payments" ON public.clinic_payments FOR INSERT WITH CHECK (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can update clinic_payments" ON public.clinic_payments FOR UPDATE USING (is_superadmin(auth.uid()));

-- 1F: Add new audit action enum values
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'CLINIC_APPROVED';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'CLINIC_SUSPENDED';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'PAYMENT_LOGGED';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'COMMISSION_EARNED';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'OVERDUE_FLAGGED';

-- ═══════════════════════════════════════════════════════
-- PHASE 2: BACKEND RPCs (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════

-- 2.1 Approve Clinic → Sets active + trial + pending commission
CREATE OR REPLACE FUNCTION public.approve_clinic(p_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic clinics%ROWTYPE;
  v_commission_amount numeric;
BEGIN
  IF NOT is_superadmin(v_uid) THEN RAISE EXCEPTION 'Superadmin only'; END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = p_clinic_id FOR UPDATE;
  IF v_clinic IS NULL THEN RAISE EXCEPTION 'Clinic not found'; END IF;
  IF v_clinic.status = 'active' THEN RAISE EXCEPTION 'Clinic already active'; END IF;

  UPDATE clinics SET
    status = 'active',
    approved_at = now(),
    financial_status = 'trial',
    trial_ends_at = now() + interval '30 days',
    next_billing_date = CURRENT_DATE + 30
  WHERE id = p_clinic_id;

  -- Create pending commission if marketer linked
  IF v_clinic.marketer_id IS NOT NULL THEN
    SELECT commission_per_clinic INTO v_commission_amount
    FROM marketers WHERE id = v_clinic.marketer_id;

    INSERT INTO commissions (marketer_id, clinic_id, amount, status)
    VALUES (v_clinic.marketer_id, p_clinic_id, COALESCE(v_commission_amount, 100), 'pending_trial')
    ON CONFLICT (clinic_id) DO NOTHING;
  END IF;

  INSERT INTO audit_log (clinic_id, action, actor_id, details)
  VALUES (p_clinic_id, 'CLINIC_APPROVED', v_uid,
    jsonb_build_object('previous_status', v_clinic.status::text));

  RETURN jsonb_build_object('success', true, 'clinic_id', p_clinic_id);
END;
$$;

-- 2.2 Suspend Clinic
CREATE OR REPLACE FUNCTION public.suspend_clinic(p_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic clinics%ROWTYPE;
BEGIN
  IF NOT is_superadmin(v_uid) THEN RAISE EXCEPTION 'Superadmin only'; END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = p_clinic_id FOR UPDATE;
  IF v_clinic IS NULL THEN RAISE EXCEPTION 'Clinic not found'; END IF;

  UPDATE clinics SET
    status = 'blocked',
    suspended_at = now()
  WHERE id = p_clinic_id;

  INSERT INTO audit_log (clinic_id, action, actor_id, details)
  VALUES (p_clinic_id, 'CLINIC_SUSPENDED', v_uid,
    jsonb_build_object('previous_status', v_clinic.status::text));

  RETURN jsonb_build_object('success', true, 'clinic_id', p_clinic_id);
END;
$$;

-- 2.3 Log Payment → Marks paid + extends billing + earns commission
CREATE OR REPLACE FUNCTION public.log_clinic_payment(
  p_clinic_id uuid,
  p_amount numeric DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic clinics%ROWTYPE;
  v_pay_amount numeric;
  v_new_billing date;
BEGIN
  IF NOT is_superadmin(v_uid) THEN RAISE EXCEPTION 'Superadmin only'; END IF;

  SELECT * INTO v_clinic FROM clinics WHERE id = p_clinic_id FOR UPDATE;
  IF v_clinic IS NULL THEN RAISE EXCEPTION 'Clinic not found'; END IF;

  v_pay_amount := COALESCE(p_amount, v_clinic.subscription_fee, 100);
  v_new_billing := GREATEST(COALESCE(v_clinic.next_billing_date, CURRENT_DATE), CURRENT_DATE) + 30;

  INSERT INTO clinic_payments (clinic_id, amount, period_start, period_end, created_by, note)
  VALUES (p_clinic_id, v_pay_amount, CURRENT_DATE, CURRENT_DATE + 30, v_uid, p_note);

  UPDATE clinics SET
    financial_status = 'paid',
    next_billing_date = v_new_billing
  WHERE id = p_clinic_id;

  -- Upgrade pending commission to earned
  UPDATE commissions SET status = 'earned', earned_date = now()
  WHERE clinic_id = p_clinic_id AND status = 'pending_trial';

  INSERT INTO audit_log (clinic_id, action, actor_id, details)
  VALUES (p_clinic_id, 'PAYMENT_LOGGED', v_uid,
    jsonb_build_object('amount', v_pay_amount, 'next_billing_date', v_new_billing));

  RETURN jsonb_build_object('success', true, 'amount', v_pay_amount, 'next_billing_date', v_new_billing);
END;
$$;

-- 2.4 Mark overdue clinics (scheduled/manual)
CREATE OR REPLACE FUNCTION public.mark_overdue_clinics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  WITH overdue_ids AS (
    UPDATE clinics SET financial_status = 'overdue'
    WHERE status = 'active'
      AND financial_status != 'overdue'
      AND next_billing_date IS NOT NULL
      AND CURRENT_DATE > next_billing_date
    RETURNING id, next_billing_date
  )
  INSERT INTO audit_log (clinic_id, action, details)
  SELECT id, 'OVERDUE_FLAGGED', jsonb_build_object('next_billing_date', next_billing_date)
  FROM overdue_ids;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('updated', v_count);
END;
$$;
