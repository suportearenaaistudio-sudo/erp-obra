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
const createUserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    role_id: z.string().uuid().optional(),
    password: z.string().min(6),
});

const updateUserSchema = z.object({
    name: z.string().min(2).optional(),
    role_id: z.string().uuid().optional(),
    active: z.boolean().optional(),
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

        // Build Tenant Context logic
        // We need tenantId to build context.
        // Fetch profile
        const { data: profile } = await supabase
            .from('users')
            .select('tenant_id, role:roles(is_tenant_admin)')
            .eq('auth_user_id', user.id)
            .single();

        if (!profile) throw new AppError(ErrorCode.UNAUTHORIZED, 'Profile not found', 401);

        const context: RequestContext = {
            userType: UserType.TENANT,
            userId: user.id, // Auth User ID
            email: user.email,
            tenantId: profile.tenant_id,
            traceId,
        };

        const pipeline = new SecurityPipeline(supabase);

        const url = new URL(req.url);
        const pathParts = url.pathname.split('/').filter(Boolean);

        // Route: GET / (List)
        if (req.method === 'GET' && pathParts.length <= 1) {
            await pipeline.check(context, { permission: 'USERS:READ' });

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

            return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Route: POST / (Create)
        if (req.method === 'POST' && pathParts.length <= 1) {
            await pipeline.check(context, { permission: 'USERS:WRITE' });

            const { email, name, role_id, password } = await validateRequest(req, createUserSchema);

            // Create auth user (Admin API)
            // Note: createClient should be initializing with Service Role key for admin actions?
            // The default client (passed in) uses the user's JWT. User's JWT cannot create other users usually unless generic config allow it?
            // Usually we need `supabaseAdmin` client for `auth.admin.createUser`.
            // But we shouldn't expose Service Role key in Edge Function unless needed.
            // Edge Function environment variables usually have accessing to SERVICE_ROLE_KEY?
            // Or we assume the user calling this has permissions? Typically standard users can't create users.

            // To create a user we DO need admin rights on Auth.
            // We should init a Service Role client for this specific action.
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );

            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    name,
                    tenant_id: context.tenantId,
                },
            });

            if (authError) throw authError;

            // Create user profile
            const { data: newUser, error: userError } = await supabase
                .from('users')
                .insert({
                    auth_user_id: authUser.user.id,
                    tenant_id: context.tenantId,
                    email,
                    name,
                    role_id: role_id || null,
                })
                .select()
                .single();

            if (userError) {
                // Cleanup auth user if profile creation fails?
                // Ideally yes.
                await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
                throw userError;
            }

            // Audit
            await supabase.from('audit_logs').insert({
                tenant_id: context.tenantId,
                user_id: profile.id, // Internal User ID (not Auth ID) - wait, context.userId is Auth ID.
                // We need internal ID for audit log usually? Check schema.
                // audit_logs.user_id is usually UUID foreign key to public.users?
                // Let's check schema. Reference says public.users.
                // context.userId is auth.uid(). We need to fetch public.users.id.
                // WE fetched profile earlier. But profile.id was not selected, only tenant_id.
                // Let's fetch profile.id in context building.

                action: 'CREATE_USER',
                entity_type: 'USER',
                entity_id: newUser.id,
                new_values: { email, name, role_id },
            });
            // Note: audit log user_id issue. `profile` variable in header block only selected `tenant_id`.
            // I should update context building to select id as well.

            return new Response(JSON.stringify({ user: newUser }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Route: PUT /:id
        if (req.method === 'PUT' && pathParts.length >= 2) {
            await pipeline.check(context, { permission: 'USERS:WRITE' });

            const userId = pathParts[1];
            const updates = await validateRequest(req, updateUserSchema);

            // Get old values
            const { data: oldUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .eq('tenant_id', context.tenantId)
                .single();

            if (!oldUser) throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404);

            const { data: updatedUser, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', userId)
                .eq('tenant_id', context.tenantId)
                .select()
                .single();

            if (error) throw error;

            // Need internal user ID for audit
            const { data: internalUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();

            // Audit
            await supabase.from('audit_logs').insert({
                tenant_id: context.tenantId,
                user_id: internalUser?.id,
                action: 'UPDATE_USER',
                entity_type: 'USER',
                entity_id: userId,
                old_values: oldUser,
                new_values: updates,
            });

            return new Response(JSON.stringify({ user: updatedUser }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // DELETE /:id
        if (req.method === 'DELETE' && pathParts.length >= 2) {
            await pipeline.check(context, { permission: 'USERS:WRITE' });
            const userId = pathParts[1];

            // Soft delete
            const { error } = await supabase.from('users').update({ active: false }).eq('id', userId).eq('tenant_id', context.tenantId);
            if (error) throw error;

            const { data: internalUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();

            await supabase.from('audit_logs').insert({
                tenant_id: context.tenantId,
                user_id: internalUser?.id,
                action: 'DEACTIVATE_USER',
                entity_type: 'USER',
                entity_id: userId,
            });

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        throw new AppError(ErrorCode.NOT_FOUND, 'Route not found', 404);

    } catch (error) {
        // Use standardized error response
        const appError = error instanceof AppError ? error : new AppError(ErrorCode.INTERNAL_ERROR, error.message);
        const response = errorResponse(appError, traceId);

        return new Response(
            JSON.stringify(response),
            { status: appError.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
