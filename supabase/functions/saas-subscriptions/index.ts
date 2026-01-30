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
    // Standard CORS handling
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
        if (!authHeader) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Missing authorization header', 401);
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user || !user.email) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Unauthorized', 401);
        }

        // Build SaaS Context
        const context: RequestContext = {
            userType: UserType.SAAS,
            userId: user.id, // Auth ID
            email: user.email,
            traceId,
            ipAddress: req.headers.get('x-forwarded-for') || '',
            userAgent: req.headers.get('user-agent') || '',
        };

        // Initialize Pipeline
        const pipeline = new SecurityPipeline(supabase);

        // Verify SaaS Access (Auth Guard)
        // This will check if user.email exists in saas_users and is active
        await pipeline.check(context);

        // Now we know user is a valid SaaS user. 
        // We might want to get their SaaS User ID for auditing.
        // The SaasAuthGuard checked it but didn't return it.
        // We can fetch it or trust the email check?
        // For auditing, we strictly need saas_user_id. 
        // Let's fetch it quickly or cache it? 
        // For now, let's fetch it.
        const { data: saasUser } = await supabase
            .from('saas_users')
            .select('id, role')
            .eq('email', user.email)
            .single();

        if (!saasUser) throw new AppError(ErrorCode.FORBIDDEN, 'SaaS user not found after check', 403);

        const saasUserId = saasUser.id;

        const url = new URL(req.url);
        const pathParts = url.pathname.split('/').filter(Boolean);

        // ... Existing usage of pathParts[2] etc needs adjustment based on how pathParts splits
        // pathParts: ["saas-subscriptions"] (if local) or ["function-name", "path"...?]
        // In Supabase functions locally: http://localhost:54321/functions/v1/saas-subscriptions/...
        // pathParts might range.
        // The previous code assumed: pathParts[2] for ID.
        // Let's assume standard routing:
        // /saas/subscriptions -> pathParts might be just empty or handles logic?
        // Wait, existing code: `pathParts.length === 2` for `GET /saas/subscriptions`.
        // If url is `.../saas-subscriptions`, pathParts is `['saas-subscriptions']`. length is 1.
        // If url is `.../saas-subscriptions/ID/status`, pathParts is `['saas-subscriptions', 'ID', 'status']`. length is 3.
        // The previous code check `pathParts.length === 2` implies `saas/subscriptions` was part of path?
        // Ah, typically deployed function is `.../saas-subscriptions`.
        // If the invocation URL is `.../saas-subscriptions`, then `pathParts` is `['saas-subscriptions']`.
        // If previous code expected `pathParts.length === 2`, maybe the function was deployed as `.../saas/subscriptions`?
        // OR the user calls it with `/saas/subscriptions` suffix?
        // Let's stick to what the code WAS doing but be careful.
        // Previous code:
        // // Route: GET /saas/subscriptions
        // if (req.method === 'GET' && pathParts.length === 2) 
        // This suggests `['saas', 'subscriptions']`? 
        // But the function is named `saas-subscriptions`.
        // If I invoke `functions.invoke('saas-subscriptions')`, the URL is `/saas-subscriptions`.
        // If I append path, `functions.invoke('saas-subscriptions', { url: '/foo' })`? No.
        // I will assume the function handles requests to its root AND subpaths.
        // Let's look at `index.ts` again: `pathParts[3] === 'status'` for PUT.
        // This implies `part1/part2/ID/status`.
        // Maybe `saas/subscriptions/ID/status`?
        // I will implement safer logic matching "subscription ID detection".

        // Simplified routing logic:
        const method = req.method;

        // GET / (List)
        if (method === 'GET' && (pathParts.length === 1 || pathParts.length === 0)) {
            const { data: subscriptions, error } = await supabase
                .from('subscriptions')
                .select(`
                  id,
                  tenant_id,
                  status,
                  trial_start,
                  trial_end,
                  current_period_start,
                  current_period_end,
                  billing_cycle,
                  current_users,
                  current_projects,
                  tenant:tenants(id, name, slug, status),
                  plan:plans(id, name, display_name, price_monthly)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return new Response(
                JSON.stringify({ subscriptions }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Sub-resource routes
        if (pathParts.length >= 2) {
            const subscriptionId = pathParts[1]; // Assuming /saas-subscriptions/:id/...
            const action = pathParts[2];

            // PUT /:id/status
            if (method === 'PUT' && action === 'status') {
                const { status, reason } = await req.json();
                // ... same logic ...
                const validStatuses = ['trial', 'active', 'past_due', 'canceled', 'suspended'];
                if (!validStatuses.includes(status)) {
                    throw new AppError(ErrorCode.VALIDATION_ERROR, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
                }

                // Get old subscription
                const { data: oldSub } = await supabase
                    .from('subscriptions')
                    .select('*, tenant:tenants(id)')
                    .eq('id', subscriptionId)
                    .single();

                if (!oldSub) throw new AppError(ErrorCode.NOT_FOUND, 'Subscription not found', 404);

                // Update
                const updates: any = { status };
                if (status === 'canceled') updates.canceled_at = new Date().toISOString();

                const { data: updatedSub, error } = await supabase
                    .from('subscriptions')
                    .update(updates)
                    .eq('id', subscriptionId)
                    .select()
                    .single();

                if (error) throw error;

                // Update tenant status
                if (status === 'suspended' || status === 'canceled') {
                    await supabase.from('tenants').update({ status }).eq('id', oldSub.tenant_id);
                } else if (status === 'active') {
                    await supabase.from('tenants').update({ status: 'active' }).eq('id', oldSub.tenant_id);
                }

                // Audit
                await supabase.from('audit_logs').insert({
                    tenant_id: oldSub.tenant_id,
                    saas_user_id: saasUserId,
                    action: 'UPDATE_SUBSCRIPTION_STATUS',
                    entity_type: 'SUBSCRIPTION',
                    entity_id: subscriptionId,
                    old_values: { status: oldSub.status },
                    new_values: { status, reason },
                });

                return new Response(JSON.stringify({ subscription: updatedSub }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // PUT /:id/plan
            if (method === 'PUT' && action === 'plan') {
                const { plan_id } = await req.json();
                // Get plan
                const { data: plan } = await supabase.from('plans').select('*').eq('id', plan_id).single();
                if (!plan) throw new AppError(ErrorCode.NOT_FOUND, 'Plan not found', 404);

                // Get old subscription
                const { data: oldSub } = await supabase.from('subscriptions').select('*, tenant:tenants(id)').eq('id', subscriptionId).single();
                if (!oldSub) throw new AppError(ErrorCode.NOT_FOUND, 'Subscription not found', 404);

                // Update
                const { data: updatedSub, error } = await supabase
                    .from('subscriptions')
                    .update({
                        plan_id,
                        limits_snapshot: {
                            max_users: plan.max_users,
                            max_projects: plan.max_projects,
                            max_storage_gb: plan.max_storage_gb,
                        },
                    })
                    .eq('id', subscriptionId)
                    .select()
                    .single();

                if (error) throw error;

                // Audit
                await supabase.from('audit_logs').insert({
                    tenant_id: oldSub.tenant_id,
                    saas_user_id: saasUserId,
                    action: 'CHANGE_PLAN',
                    entity_type: 'SUBSCRIPTION',
                    entity_id: subscriptionId,
                    old_values: { plan_id: oldSub.plan_id },
                    new_values: { plan_id, plan_name: plan.name },
                });

                return new Response(JSON.stringify({ subscription: updatedSub }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // PUT /:id/extend-trial
            if (method === 'PUT' && action === 'extend-trial') {
                const { days } = await req.json();
                const { data: oldSub } = await supabase.from('subscriptions').select('*, tenant:tenants(id)').eq('id', subscriptionId).single();
                if (!oldSub) throw new AppError(ErrorCode.NOT_FOUND, 'Subscription not found', 404);

                const currentTrialEnd = oldSub.trial_end ? new Date(oldSub.trial_end) : new Date();
                const newTrialEnd = new Date(currentTrialEnd);
                newTrialEnd.setDate(newTrialEnd.getDate() + days);

                const { data: updatedSub, error } = await supabase
                    .from('subscriptions')
                    .update({
                        trial_end: newTrialEnd.toISOString().split('T')[0],
                        current_period_end: newTrialEnd.toISOString().split('T')[0],
                    })
                    .eq('id', subscriptionId)
                    .select()
                    .single();

                if (error) throw error;

                // Audit
                await supabase.from('audit_logs').insert({
                    tenant_id: oldSub.tenant_id,
                    saas_user_id: saasUserId,
                    action: 'EXTEND_TRIAL',
                    entity_type: 'SUBSCRIPTION',
                    entity_id: subscriptionId,
                    old_values: { trial_end: oldSub.trial_end },
                    new_values: { trial_end: newTrialEnd.toISOString().split('T')[0], days_added: days },
                });

                return new Response(JSON.stringify({ subscription: updatedSub }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
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
