
-- Step 1: Add superadmin to app_role enum and create entity_status enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
CREATE TYPE public.entity_status AS ENUM ('pending', 'active', 'blocked');
