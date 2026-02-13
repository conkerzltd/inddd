
-- Step 1: Update audit_log.actor_role to text temporarily
ALTER TABLE public.audit_log ALTER COLUMN actor_role TYPE text USING actor_role::text;

-- Step 2: Drop dependent functions and policies that reference old enum
DROP FUNCTION IF EXISTS public.has_role(uuid, uuid, app_role_old);

DROP POLICY IF EXISTS "Doctors can update their clinic" ON public.clinics;

-- Step 3: Drop old enum type
DROP TYPE IF EXISTS public.app_role_old;

-- Step 4: Now has_role needs to be recreated with the NEW app_role type
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _clinic_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND clinic_id = _clinic_id AND role = _role
  )
$$;

-- Step 5: Recreate the clinic update policy
CREATE POLICY "Doctors can update their clinic"
ON public.clinics FOR UPDATE
USING (has_role(auth.uid(), id, 'doctor'::app_role));

-- Step 6: Convert audit_log.actor_role back to the new app_role enum
ALTER TABLE public.audit_log ALTER COLUMN actor_role TYPE app_role USING actor_role::app_role;
