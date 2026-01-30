import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Tenant Admin API - Role Management
 * 
 * Routes:
 * - GET /tenant/roles - List all roles in tenant
 * - POST /tenant/roles - Create new role
 * - PUT /tenant/roles/:id - Update role
 * - DELETE /tenant/roles/:id - Delete role
 * - GET /tenant/roles/:id/permissions - Get role permissions
 * - PUT /tenant/roles/:id/permissions - Update role permissions
 * 
 * Security: Requires ROLES:READ or ROLES:WRITE permission
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

        // Route: GET /tenant/roles
        if (req.method === 'GET' && pathParts.length === 2) {
            if (!hasPermission(context.permissions, 'ROLES:READ')) {
                return new Response(
                    JSON.stringify({ error: 'Permission denied. Required: ROLES:READ' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const { data: roles, error } = await supabase
                .from('roles')
                .select(`
          id,
          name,
          description,
          is_tenant_admin,
          is_default,
          created_at,
          permissions:role_permissions(permission_key)
        `)
                .eq('tenant_id', context.tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return new Response(
                JSON.stringify({ roles }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: POST /tenant/roles
        if (req.method === 'POST' && pathParts.length === 2) {
            if (!hasPermission(context.permissions, 'ROLES:WRITE')) {
                return new Response(
                    JSON.stringify({ error: 'Permission denied. Required: ROLES:WRITE' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const { name, description, permissions: rolePermissions } = await req.json();

            // Create role
            const { data: newRole, error: roleError } = await supabase
                .from('roles')
                .insert({
                    tenant_id: context.tenantId,
                    name,
                    description,
                    is_tenant_admin: false,
                    is_default: false,
                })
                .select()
                .single();

            if (roleError) throw roleError;

            // Add permissions
            if (rolePermissions && rolePermissions.length > 0) {
                const permissionInserts = rolePermissions.map((perm: string) => ({
                    tenant_id: context.tenantId,
                    role_id: newRole.id,
                    permission_key: perm,
                }));

                const { error: permError } = await supabase
                    .from('role_permissions')
                    .insert(permissionInserts);

                if (permError) throw permError;
            }

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id: context.tenantId,
                user_id: context.userId,
                action: 'CREATE_ROLE',
                entity_type: 'ROLE',
                entity_id: newRole.id,
                new_values: { name, description, permissions: rolePermissions },
            });

            return new Response(
                JSON.stringify({ role: newRole }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: PUT /tenant/roles/:id
        if (req.method === 'PUT' && pathParts.length === 3 && pathParts[2] !== 'permissions') {
            if (!hasPermission(context.permissions, 'ROLES:WRITE')) {
                return new Response(
                    JSON.stringify({ error: 'Permission denied. Required: ROLES:WRITE' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const roleId = pathParts[2];
            const updates = await req.json();

            const { data: updatedRole, error } = await supabase
                .from('roles')
                .update(updates)
                .eq('id', roleId)
                .eq('tenant_id', context.tenantId)
                .select()
                .single();

            if (error) throw error;

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id: context.tenantId,
                user_id: context.userId,
                action: 'UPDATE_ROLE',
                entity_type: 'ROLE',
                entity_id: roleId,
                new_values: updates,
            });

            return new Response(
                JSON.stringify({ role: updatedRole }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: DELETE /tenant/roles/:id
        if (req.method === 'DELETE' && pathParts.length === 3) {
            if (!hasPermission(context.permissions, 'ROLES:WRITE')) {
                return new Response(
                    JSON.stringify({ error: 'Permission denied. Required: ROLES:WRITE' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const roleId = pathParts[2];

            const { error } = await supabase
                .from('roles')
                .delete()
                .eq('id', roleId)
                .eq('tenant_id', context.tenantId);

            if (error) throw error;

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id: context.tenantId,
                user_id: context.userId,
                action: 'DELETE_ROLE',
                entity_type: 'ROLE',
                entity_id: roleId,
            });

            return new Response(
                JSON.stringify({ success: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: GET /tenant/roles/:id/permissions
        if (req.method === 'GET' && pathParts.length === 4 && pathParts[3] === 'permissions') {
            if (!hasPermission(context.permissions, 'ROLES:READ')) {
                return new Response(
                    JSON.stringify({ error: 'Permission denied. Required: ROLES:READ' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const roleId = pathParts[2];

            const { data: permissions, error } = await supabase
                .from('role_permissions')
                .select('permission_key')
                .eq('tenant_id', context.tenantId)
                .eq('role_id', roleId);

            if (error) throw error;

            return new Response(
                JSON.stringify({ permissions: permissions.map(p => p.permission_key) }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: PUT /tenant/roles/:id/permissions
        if (req.method === 'PUT' && pathParts.length === 4 && pathParts[3] === 'permissions') {
            if (!hasPermission(context.permissions, 'ROLES:WRITE')) {
                return new Response(
                    JSON.stringify({ error: 'Permission denied. Required: ROLES:WRITE' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const roleId = pathParts[2];
            const { permissions: newPermissions } = await req.json();

            // Get old permissions for audit
            const { data: oldPerms } = await supabase
                .from('role_permissions')
                .select('permission_key')
                .eq('tenant_id', context.tenantId)
                .eq('role_id', roleId);

            // Delete existing permissions
            await supabase
                .from('role_permissions')
                .delete()
                .eq('tenant_id', context.tenantId)
                .eq('role_id', roleId);

            // Insert new permissions
            if (newPermissions && newPermissions.length > 0) {
                const permissionInserts = newPermissions.map((perm: string) => ({
                    tenant_id: context.tenantId,
                    role_id: roleId,
                    permission_key: perm,
                }));

                const { error: insertError } = await supabase
                    .from('role_permissions')
                    .insert(permissionInserts);

                if (insertError) throw insertError;
            }

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id: context.tenantId,
                user_id: context.userId,
                action: 'UPDATE_PERMISSIONS',
                entity_type: 'ROLE',
                entity_id: roleId,
                old_values: { permissions: oldPerms?.map(p => p.permission_key) || [] },
                new_values: { permissions: newPermissions },
            });

            return new Response(
                JSON.stringify({ success: true, permissions: newPermissions }),
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
