import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Tenant Admin API - User Management
 * 
 * Routes:
 * - GET /tenant/users - List all users in tenant
 * - POST /tenant/users - Create new user
 * - PUT /tenant/users/:id - Update user
 * - DELETE /tenant/users/:id - Deactivate user
 * 
 * Security: Requires USERS:READ or USERS:WRITE permission
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestContext {
    tenantId: string;
    userId: string;
    permissions: Set<string>;
}

async function getRequestContext(supabase: any, authHeader: string): Promise<RequestContext> {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (error || !user) {
        throw new Error('Unauthorized');
    }

    // Get user profile with tenant and permissions
    const { data: profile } = await supabase
        .from('users')
        .select(`
      id,
      tenant_id,
      role:roles(
        is_tenant_admin,
        permissions:role_permissions(permission_key)
      )
    `)
        .eq('auth_user_id', user.id)
        .single();

    if (!profile) {
        throw new Error('Profile not found');
    }

    const permissions = new Set<string>();

    // Tenant admins have all permissions
    if (profile.role?.is_tenant_admin) {
        permissions.add('*');
    } else if (profile.role?.permissions) {
        profile.role.permissions.forEach((p: any) => permissions.add(p.permission_key));
    }

    return {
        tenantId: profile.tenant_id,
        userId: profile.id,
        permissions,
    };
}

function hasPermission(permissions: Set<string>, required: string): boolean {
    return permissions.has('*') || permissions.has(required);
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing authorization header');
        }

        const context = await getRequestContext(supabase, authHeader);
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/').filter(Boolean);

        // Route: GET /tenant/users
        if (req.method === 'GET' && pathParts.length === 2) {
            if (!hasPermission(context.permissions, 'USERS:READ')) {
                return new Response(
                    JSON.stringify({ error: 'Permission denied. Required: USERS:READ' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const { data: users, error } = await supabase
                .from('users')
                .select(`
          id,
          email,
          name,
          avatar_url,
          active,
          last_login_at,
          created_at,
          role:roles(id, name, is_tenant_admin)
        `)
                .eq('tenant_id', context.tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return new Response(
                JSON.stringify({ users }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: POST /tenant/users
        if (req.method === 'POST' && pathParts.length === 2) {
            if (!hasPermission(context.permissions, 'USERS:WRITE')) {
                return new Response(
                    JSON.stringify({ error: 'Permission denied. Required: USERS:WRITE' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const { email, name, role_id, password } = await req.json();

            // Create auth user
            const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    name,
                    tenant_id: context.tenantId,
                },
            });

            if (authError) throw authError;

            // Create user profile (trigger will handle this, but we can do it explicitly)
            const { data: newUser, error: userError } = await supabase
                .from('users')
                .insert({
                    auth_user_id: authUser.user.id,
                    tenant_id: context.tenantId,
                    email,
                    name,
                    role_id,
                })
                .select()
                .single();

            if (userError) throw userError;

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id: context.tenantId,
                user_id: context.userId,
                action: 'CREATE_USER',
                entity_type: 'USER',
                entity_id: newUser.id,
                new_values: { email, name, role_id },
            });

            return new Response(
                JSON.stringify({ user: newUser }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: PUT /tenant/users/:id
        if (req.method === 'PUT' && pathParts.length === 3) {
            if (!hasPermission(context.permissions, 'USERS:WRITE')) {
                return new Response(
                    JSON.stringify({ error: 'Permission denied. Required: USERS:WRITE' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const userId = pathParts[2];
            const updates = await req.json();

            // Get old values for audit
            const { data: oldUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .eq('tenant_id', context.tenantId)
                .single();

            // Update user
            const { data: updatedUser, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', userId)
                .eq('tenant_id', context.tenantId)
                .select()
                .single();

            if (error) throw error;

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id: context.tenantId,
                user_id: context.userId,
                action: 'UPDATE_USER',
                entity_type: 'USER',
                entity_id: userId,
                old_values: oldUser,
                new_values: updates,
            });

            return new Response(
                JSON.stringify({ user: updatedUser }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: DELETE /tenant/users/:id (soft delete - set active = false)
        if (req.method === 'DELETE' && pathParts.length === 3) {
            if (!hasPermission(context.permissions, 'USERS:WRITE')) {
                return new Response(
                    JSON.stringify({ error: 'Permission denied. Required: USERS:WRITE' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const userId = pathParts[2];

            const { error } = await supabase
                .from('users')
                .update({ active: false })
                .eq('id', userId)
                .eq('tenant_id', context.tenantId);

            if (error) throw error;

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id: context.tenantId,
                user_id: context.userId,
                action: 'DEACTIVATE_USER',
                entity_type: 'USER',
                entity_id: userId,
            });

            return new Response(
                JSON.stringify({ success: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
