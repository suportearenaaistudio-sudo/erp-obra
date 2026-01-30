import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SecurityPipeline } from '../_shared/security/pipeline.ts';
import { RequestContext, UserType } from '../_shared/types/context.ts';
import { AppError, ErrorCode, errorResponse } from '../_shared/errors/errors.ts';
import { generateTraceId } from '../_shared/logging/logger.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        if (authError || !user || !user.email) throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized', 401);

        // Build SaaS Context
        const context: RequestContext = {
            userType: UserType.SAAS,
            userId: user.id,
            email: user.email,
            traceId,
        };

        const pipeline = new SecurityPipeline(supabase);
        await pipeline.check(context);

        // Get SaaS User ID
        const { data: saasUser } = await supabase.from('saas_users').select('id').eq('email', user.email).single();
        if (!saasUser) throw new AppError(ErrorCode.FORBIDDEN, 'SaaS user not found', 403);

        const url = new URL(req.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // pathParts examples:
        // ['saas-feature-overrides'] (GET/POST root)
        // ['saas-feature-overrides', 'UUID'] (DELETE /:id)

        // Route: GET / (List)
        if (req.method === 'GET' && pathParts.length <= 1) {
            const { data: overrides, error } = await supabase
                .from('tenant_feature_overrides')
                .select(`
                  id,
                  tenant_id,
                  feature_key,
                  enabled,
                  reason,
                  expires_at,
                  created_at,
                  tenant:tenants(id, name, slug)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return new Response(JSON.stringify({ overrides }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Route: POST / (Create/Update)
        if (req.method === 'POST' && pathParts.length <= 1) {
            const { tenant_id, feature_key, enabled, reason, expires_at } = await req.json();

            if (!tenant_id || !feature_key || typeof enabled !== 'boolean' || !reason) {
                throw new AppError(ErrorCode.VALIDATION_ERROR, 'Missing required fields: tenant_id, feature_key, enabled, reason', 400);
            }

            // Check existing
            const { data: existing } = await supabase
                .from('tenant_feature_overrides')
                .select('id')
                .eq('tenant_id', tenant_id)
                .eq('feature_key', feature_key)
                .single();

            let result;
            if (existing) {
                // Update
                const { data, error } = await supabase
                    .from('tenant_feature_overrides')
                    .update({ enabled, reason, expires_at: expires_at || null })
                    .eq('id', existing.id)
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('tenant_feature_overrides')
                    .insert({
                        tenant_id,
                        feature_key,
                        enabled,
                        reason,
                        expires_at: expires_at || null,
                        created_by_saas_user_id: saasUser.id,
                    })
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            }

            // Audit
            await supabase.from('audit_logs').insert({
                tenant_id,
                saas_user_id: saasUser.id,
                action: enabled ? 'ENABLE_FEATURE' : 'DISABLE_FEATURE',
                entity_type: 'FEATURE_OVERRIDE',
                entity_id: result.id,
                new_values: { feature_key, enabled, reason, expires_at },
            });

            return new Response(JSON.stringify({ override: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Route: DELETE /:id
        if (req.method === 'DELETE' && pathParts.length >= 2) {
            const overrideId = pathParts[1];

            const { data: override } = await supabase
                .from('tenant_feature_overrides')
                .select('tenant_id, feature_key')
                .eq('id', overrideId)
                .single();

            if (!override) throw new AppError(ErrorCode.NOT_FOUND, 'Override not found', 404);

            const { error } = await supabase.from('tenant_feature_overrides').delete().eq('id', overrideId);
            if (error) throw error;

            // Audit
            await supabase.from('audit_logs').insert({
                tenant_id: override.tenant_id,
                saas_user_id: saasUser.id,
                action: 'REMOVE_FEATURE_OVERRIDE',
                entity_type: 'FEATURE_OVERRIDE',
                entity_id: overrideId,
                old_values: { feature_key: override.feature_key },
            });

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        throw new AppError(ErrorCode.NOT_FOUND, 'Route not found', 404);

    } catch (error) {
        const appError = error instanceof AppError ? error : new AppError(ErrorCode.INTERNAL_ERROR, error.message);
        const response = errorResponse(appError, traceId);
        return new Response(JSON.stringify(response), { status: appError.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
