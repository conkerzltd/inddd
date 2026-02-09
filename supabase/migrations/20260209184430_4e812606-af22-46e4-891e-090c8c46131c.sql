
-- =============================================
-- QueueLine MVP Schema — Step 2
-- =============================================

-- 1) ENUMS
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'secretary', 'doctor');
CREATE TYPE public.ticket_source AS ENUM ('EXTERNAL', 'PHONE_CALL', 'WALK_IN');
CREATE TYPE public.ticket_type AS ENUM ('SCHEDULED', 'NORMAL', 'URGENT');
CREATE TYPE public.visit_type AS ENUM ('NEW', 'CONSULTATION');
CREATE TYPE public.ticket_status AS ENUM (
  'REMOTE_BOOKED', 'LINK_SENT', 'INSIDE_WAITING', 'CALLED',
  'IN_SERVICE', 'DONE', 'MISSED', 'RETURNED', 'CANCELLED', 'CLOSED_OUT'
);
CREATE TYPE public.insert_position AS ENUM ('AFTER_CURRENT', 'AFTER_N', 'END');
CREATE TYPE public.audit_action AS ENUM (
  'TICKET_CREATED', 'LINK_SENT', 'ARRIVAL_CONFIRMED', 'CALLED',
  'SERVICE_STARTED', 'DONE', 'MARKED_MISSED', 'MARKED_RETURNED',
  'REINSERTED', 'SET_URGENT', 'PAUSED', 'RESUMED',
  'INTAKE_CLOSED', 'INTAKE_OPENED', 'CANCELLED'
);

-- 2) CLINICS TABLE
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  open_time TIME NOT NULL DEFAULT '09:00',
  close_time TIME NOT NULL DEFAULT '17:00',
  avg_service_minutes INT NOT NULL DEFAULT 15,
  grace_minutes INT NOT NULL DEFAULT 15,
  late_threshold_minutes INT NOT NULL DEFAULT 30,
  intake_open BOOLEAN NOT NULL DEFAULT TRUE,
  session_paused BOOLEAN NOT NULL DEFAULT FALSE,
  timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
  wa_message_template TEXT NOT NULL DEFAULT 'Your QueueLine link: {url} — Use it to track your turn and estimated wait time.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- 3) USER_ROLES TABLE (roles stored separately per instructions)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, clinic_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4) TICKETS TABLE
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  patient_phone TEXT NOT NULL,
  patient_name TEXT,
  source public.ticket_source NOT NULL,
  type public.ticket_type NOT NULL,
  visit_type public.visit_type NOT NULL DEFAULT 'CONSULTATION',
  status public.ticket_status NOT NULL DEFAULT 'REMOTE_BOOKED',
  appointment_time TIMESTAMPTZ,
  arrival_confirmed_at TIMESTAMPTZ,
  called_at TIMESTAMPTZ,
  service_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rank_key NUMERIC,
  miss_count INT NOT NULL DEFAULT 0,
  manual_insert_position public.insert_position,
  manual_insert_n INT,
  reinsert_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Index for fast eligible queue reads
CREATE INDEX idx_tickets_eligible ON public.tickets (clinic_id, visit_date, status, rank_key);
-- Index for phone search
CREATE INDEX idx_tickets_phone ON public.tickets (clinic_id, patient_phone);

-- 5) PATIENT_LINKS TABLE
CREATE TABLE public.patient_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  UNIQUE (token)
);
ALTER TABLE public.patient_links ENABLE ROW LEVEL SECURITY;

-- Index for token lookups (patient page)
CREATE INDEX idx_patient_links_token ON public.patient_links (token);

-- 6) AUDIT_LOG TABLE
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action public.audit_action NOT NULL,
  actor_role public.app_role,
  previous_status public.ticket_status,
  new_status public.ticket_status,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_log_clinic_date ON public.audit_log (clinic_id, created_at);

-- 7) SECURITY DEFINER HELPER FUNCTIONS

-- Check if user is a member of a clinic (any role)
CREATE OR REPLACE FUNCTION public.is_clinic_member(_user_id UUID, _clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND clinic_id = _clinic_id
  )
$$;

-- Check if user has a specific role in a clinic
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _clinic_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND clinic_id = _clinic_id AND role = _role
  )
$$;

-- Check if user is owner or admin of a clinic
CREATE OR REPLACE FUNCTION public.is_clinic_owner_or_admin(_user_id UUID, _clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND clinic_id = _clinic_id AND role IN ('owner', 'admin')
  )
$$;

-- Get all clinic IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_clinic_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM public.user_roles WHERE user_id = _user_id
$$;

-- 8) RLS POLICIES

-- CLINICS: members can read, owners can update
CREATE POLICY "Members can view their clinic"
  ON public.clinics FOR SELECT TO authenticated
  USING (public.is_clinic_member(auth.uid(), id));

CREATE POLICY "Owners can update clinic"
  ON public.clinics FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), id, 'owner'));

-- USER_ROLES: members can read, owner/admin can insert/delete
CREATE POLICY "Members can view roles in their clinic"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Owner/admin can add roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_clinic_owner_or_admin(auth.uid(), clinic_id));

CREATE POLICY "Owner/admin can remove roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_clinic_owner_or_admin(auth.uid(), clinic_id));

CREATE POLICY "Owner/admin can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_clinic_owner_or_admin(auth.uid(), clinic_id));

-- TICKETS: members can read, secretary/doctor/owner/admin can create/update
CREATE POLICY "Members can view clinic tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Staff can create tickets"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Staff can update tickets"
  ON public.tickets FOR UPDATE TO authenticated
  USING (public.is_clinic_member(auth.uid(), clinic_id));

-- PATIENT_LINKS: members can CRUD, anonymous can read by token
CREATE POLICY "Members can view clinic links"
  ON public.patient_links FOR SELECT TO authenticated
  USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Staff can create links"
  ON public.patient_links FOR INSERT TO authenticated
  WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Staff can update links"
  ON public.patient_links FOR UPDATE TO authenticated
  USING (public.is_clinic_member(auth.uid(), clinic_id));

-- Anonymous access to patient_links by token (for patient page)
CREATE POLICY "Public can read by token"
  ON public.patient_links FOR SELECT TO anon
  USING (token IS NOT NULL AND revoked_at IS NULL);

-- AUDIT_LOG: members can read their clinic's logs, inserts by authenticated
CREATE POLICY "Members can view audit logs"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Authenticated can insert audit logs"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));

-- 9) ENABLE REALTIME for tickets (live queue updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clinics;
