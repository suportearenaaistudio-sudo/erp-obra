-- Quick fix for RLS recursion
-- Apply directly via SQL editor in Supabase Studio

-- 1. Create SECURITY DEFINER function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- 2. Drop problematic policies
DROP POLICY IF EXISTS "Users see own tenant users" ON public.users;
DROP POLICY IF EXISTS "Users see own tenant" ON public.tenants;

-- 3. Recreate without recursion
CREATE POLICY "Users see own tenant users" ON public.users
  FOR SELECT
  USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Users see own tenant" ON public.tenants
  FOR SELECT
  USING (id = get_current_user_tenant_id());
