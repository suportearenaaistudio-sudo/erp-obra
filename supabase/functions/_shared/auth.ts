
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface UserContext {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
}

/**
 * Validates the tenant context claimed by the request against the authenticated user's actual tenant.
 * Throws an error if they don't match.
 */
export async function validateTenantContext(
    supabase: SupabaseClient,
    authUserId: string,
    claimedTenantId: string
): Promise<boolean> {
    if (!authUserId || !claimedTenantId) {
        throw new Error('Missing required auth context');
    }

    const { data: user, error } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', authUserId)
        .single();

    if (error || !user) {
        throw new Error('User context not found');
    }

    if (user.tenant_id !== claimedTenantId) {
        console.error(`Security Alert: Tenant mismatch. User ${authUserId} (Tenant ${user.tenant_id}) tried to access Tenant ${claimedTenantId}`);
        throw new Error('Unauthorized: Tenant context mismatch');
    }

    return true;
}

/**
 * Higher-order function to ensure tenant context is valid
 */
export async function getAuthenticatedUserWithTenant(
    supabase: SupabaseClient,
    claimedTenantId?: string
): Promise<UserContext> {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error('Not authenticated');
    }

    const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, tenant_id, email, role:roles(name)')
        .eq('auth_user_id', user.id)
        .single();

    if (profileError || !profile) {
        throw new Error('User profile not found');
    }

    // If a specific tenant was requested, validate access
    if (claimedTenantId && profile.tenant_id !== claimedTenantId) {
        // Check if Dev Admin (impersonation logic would go here)
        const isDevAdmin = ['admin@obra360.com'].includes(user.email || ''); // Simplified check
        if (!isDevAdmin) {
            throw new Error('Unauthorized access to this tenant');
        }
    }

    return {
        userId: profile.id,
        tenantId: profile.tenant_id,
        email: profile.email,
        role: (profile.role as any)?.name || 'viewer'
    };
}
