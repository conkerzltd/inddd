
-- Attendance status enum
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'sick_leave');

-- Ledger transaction type enum  
CREATE TYPE public.ledger_tx_type AS ENUM ('commission', 'bonus', 'salary', 'deduction', 'penalty', 'payout');

-- Marketer attendance table
CREATE TABLE public.marketer_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'present',
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketer_id, attendance_date)
);

ALTER TABLE public.marketer_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can view marketer_attendance"
  ON public.marketer_attendance FOR SELECT
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can insert marketer_attendance"
  ON public.marketer_attendance FOR INSERT
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update marketer_attendance"
  ON public.marketer_attendance FOR UPDATE
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete marketer_attendance"
  ON public.marketer_attendance FOR DELETE
  USING (public.is_superadmin(auth.uid()));

-- Marketer ledger (financial transactions) table
CREATE TABLE public.marketer_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  tx_type public.ledger_tx_type NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  description text,
  reference_clinic_id uuid REFERENCES public.clinics(id),
  tx_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketer_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can view marketer_ledger"
  ON public.marketer_ledger FOR SELECT
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can insert marketer_ledger"
  ON public.marketer_ledger FOR INSERT
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update marketer_ledger"
  ON public.marketer_ledger FOR UPDATE
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete marketer_ledger"
  ON public.marketer_ledger FOR DELETE
  USING (public.is_superadmin(auth.uid()));

-- Add indexes for performance
CREATE INDEX idx_marketer_attendance_marketer_date ON public.marketer_attendance(marketer_id, attendance_date);
CREATE INDEX idx_marketer_ledger_marketer_date ON public.marketer_ledger(marketer_id, tx_date);
CREATE INDEX idx_marketer_ledger_type ON public.marketer_ledger(tx_type);
