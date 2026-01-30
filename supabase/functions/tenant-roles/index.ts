import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SecurityPipeline } from '../_shared/security/pipeline.ts';
import { RequestContext, UserType } from '../_shared/types/context.ts';
import { AppError, ErrorCode, errorResponse } from '../_shared/errors/errors.ts';
import { generateTraceId } from '../_shared/logging/logger.ts';
import { validateRequest } from '../_shared/validation/validation.ts';
import { z } from 'zod';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation Schemas
const createRoleSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional(),
});

const updateRoleSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
});

const updatePermissionsSchema = z.object({
    permissions: z.array(z.string()),
});

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const traceId = generateTraceId();

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new AppError(ErrorCode.UNAUTHORIZED, 'Missing authorization header', 401);

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized', 401);

        // Build Tenant Context
        const { data: profile } = await supabase
            .from('users')
            .select('tenant_id, role:roles(is_tenant_admin)')
            .eq('auth_user_id', user.id)
            .single();

        if (!profile) throw new AppError(ErrorCode.UNAUTHORIZED, 'Profile not found', 401);

        const context: RequestContext = {
            userType: UserType.TENANT,
            userId: user.id,
            email: user.email,
            tenantId: profile.tenant_id,
            traceId,
            ipAddress: req.headers.get('x-forwarded-for') || '',
            userAgent: req.headers.get('user-agent') || '',
        };

        const pipeline = new SecurityPipeline(supabase);
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/').filter(Boolean);

        // Standard Routing Logic
        // pathParts might be ['tenant-roles'] or ['tenant-roles', 'ID'] ...

        // Route: GET / (List)
        if (req.method === 'GET' && pathParts.length <= 1) {
            await pipeline.check(context, { permission: 'ROLES:READ' });

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

            return new Response(JSON.stringify({ roles }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Route: POST / (Create)
        if (req.method === 'POST' && pathParts.length <= 1) {
            await pipeline.check(context, { permission: 'ROLES:WRITE' });

            const { name, description, permissions: rolePermissions } = await validateRequest(req, createRoleSchema);

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
                const { error: permError } = await supabase.from('role_permissions').insert(permissionInserts);
                if (permError) throw permError;
            }

            // Need internal User ID for audit
            const { data: internalUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();

            // Audit
            await supabase.from('audit_logs').insert({
                tenant_id: context.tenantId,
                user_id: internalUser?.id,
                action: 'CREATE_ROLE',
                entity_type: 'ROLE',
                entity_id: newRole.id,
                new_values: { name, description, permissions: rolePermissions },
            });

            return new Response(JSON.stringify({ role: newRole }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (pathParts.length >= 2) {
            const roleId = pathParts[1];
            const subResource = pathParts[2]; // e.g. 'permissions'

            // GET /:id/permissions
            if (subResource === 'permissions' && req.method === 'GET') {
                await pipeline.check(context, { permission: 'ROLES:READ' });
                const { data: permissions, error } = await supabase
                    .from('role_permissions')
                    .select('permission_key')
                    .eq('tenant_id', context.tenantId)
                    .eq('role_id', roleId);
                if (error) throw error;

                return new Response(JSON.stringify({ permissions: permissions.map(p => p.permission_key) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // PUT /:id/permissions
            if (subResource === 'permissions' && req.method === 'PUT') {
                await pipeline.check(context, { permission: 'ROLES:WRITE' });
                const { permissions: newPermissions } = await validateRequest(req, updatePermissionsSchema);

                // Audit - get old
                const { data: oldPerms } = await supabase.from('role_permissions').select('permission_key').eq('tenant_id', context.tenantId).eq('role_id', roleId);

                // Delete existing
                await supabase.from('role_permissions').delete().eq('tenant_id', context.tenantId).eq('role_id', roleId);

                // Insert new
                if (newPermissions && newPermissions.length > 0) {
                    const permissionInserts = newPermissions.map((perm: string) => ({
                        tenant_id: context.tenantId,
                        role_id: roleId,
                        permission_key: perm,
                    }));
                    const { error: insertError } = await supabase.from('role_permissions').insert(permissionInserts);
                    if (insertError) throw insertError;
                }

                const { data: internalUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();

                await supabase.from('audit_logs').insert({
                    tenant_id: context.tenantId,
                    user_id: internalUser?.id,
                    action: 'UPDATE_PERMISSIONS',
                    entity_type: 'ROLE',
                    entity_id: roleId,
                    old_values: { permissions: oldPerms?.map(p => p.permission_key) || [] },
                    new_values: { permissions: newPermissions },
                });

                return new Response(JSON.stringify({ success: true, permissions: newPermissions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // PUT /:id (Update Role Metadata)
            if (req.method === 'PUT' && !subResource) {
                await pipeline.check(context, { permission: 'ROLES:WRITE' });
                const updates = await validateRequest(req, updateRoleSchema);

                const { data: updatedRole, error } = await supabase
                    .from('roles')
                    .update(updates)
                    .eq('id', roleId)
                    .eq('tenant_id', context.tenantId)
                    .select()
                    .single();
                if (error) throw error;

                const { data: internalUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();

                await supabase.from('audit_logs').insert({
                    tenant_id: context.tenantId,
                    user_id: internalUser?.id,
                    action: 'UPDATE_ROLE',
                    entity_type: 'ROLE',
                    entity_id: roleId,
                    new_values: updates,
                });

                return new Response(JSON.stringify({ role: updatedRole }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // DELETE /:id
            if (req.method === 'DELETE' && !subResource) {
                await pipeline.check(context, { permission: 'ROLES:WRITE' });

                const { error } = await supabase.from('roles').delete().eq('id', roleId).eq('tenant_id', context.tenantId);
                if (error) throw error;

                const { data: internalUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();

                await supabase.from('audit_logs').insert({
                    tenant_id: context.tenantId,
                    user_id: internalUser?.id,
                    action: 'DELETE_ROLE',
                    entity_type: 'ROLE',
                    entity_id: roleId,
                });

                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        throw new AppError(ErrorCode.NOT_FOUND, 'Route not found', 404);

    } catch (error) {
        const appError = error instanceof AppError ? error : new AppError(ErrorCode.INTERNAL_ERROR, error.message);
        const response = errorResponse(appError, traceId);
        return new Response(JSON.stringify(response), { status: appError.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
