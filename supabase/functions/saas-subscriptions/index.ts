import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Dev Admin API - Subscription Management
 * 
 * Routes:
 * - GET /saas/subscriptions - List all subscriptions
 * - PUT /saas/subscriptions/:id/status - Change subscription status
 * - PUT /saas/subscriptions/:id/plan - Change subscription plan
 * - PUT /saas/subscriptions/:id/extend-trial - Extend trial period
 * 
 * Security: Requires Dev Admin authentication (saas_users table)
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEV_ADMIN_EMAILS = [
    'admin@obra360.com',
    'suporte@obra360.com',
    'vitorpradotamos@gmail.com',
    'marcospaulotrindade3@gmail.com',
];

async function isDevAdmin(supabase: any, authHeader: string): Promise<{ isAdmin: boolean; saasUserId?: string; email?: string }> {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (error || !user) {
        return { isAdmin: false };
    }

    // Check if user is in dev admin list
    if (!DEV_ADMIN_EMAILS.includes(user.email)) {
        return { isAdmin: false };
    }

    // Get saas_user record
    const { data: saasUser } = await supabase
        .from('saas_users')
        .select('id, role')
        .eq('email', user.email)
        .single();

    if (!saasUser || !['dev_admin', 'support'].includes(saasUser.role)) {
        return { isAdmin: false };
    }

    return {
        isAdmin: true,
        saasUserId: saasUser.id,
        email: user.email,
    };
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

        const adminCheck = await isDevAdmin(supabase, authHeader);
        if (!adminCheck.isAdmin) {
            return new Response(
                JSON.stringify({ error: 'Forbidden. Dev Admin access required.' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const url = new URL(req.url);
        const pathParts = url.pathname.split('/').filter(Boolean);

        // Route: GET /saas/subscriptions
        if (req.method === 'GET' && pathParts.length === 2) {
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

        // Route: PUT /saas/subscriptions/:id/status
        if (req.method === 'PUT' && pathParts.length === 4 && pathParts[3] === 'status') {
            const subscriptionId = pathParts[2];
            const { status, reason } = await req.json();

            // Validate status
            const validStatuses = ['trial', 'active', 'past_due', 'canceled', 'suspended'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }

            // Get old subscription for audit
            const { data: oldSub } = await supabase
                .from('subscriptions')
                .select('*, tenant:tenants(id)')
                .eq('id', subscriptionId)
                .single();

            // Update subscription
            const updates: any = { status };
            if (status === 'canceled') {
                updates.canceled_at = new Date().toISOString();
            }

            const { data: updatedSub, error } = await supabase
                .from('subscriptions')
                .update(updates)
                .eq('id', subscriptionId)
                .select()
                .single();

            if (error) throw error;

            // Update tenant status if suspended/canceled
            if (status === 'suspended' || status === 'canceled') {
                await supabase
                    .from('tenants')
                    .update({ status: status === 'suspended' ? 'suspended' : 'canceled' })
                    .eq('id', oldSub.tenant_id);
            } else if (status === 'active') {
                await supabase
                    .from('tenants')
                    .update({ status: 'active' })
                    .eq('id', oldSub.tenant_id);
            }

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id: oldSub.tenant_id,
                saas_user_id: adminCheck.saasUserId,
                action: 'UPDATE_SUBSCRIPTION_STATUS',
                entity_type: 'SUBSCRIPTION',
                entity_id: subscriptionId,
                old_values: { status: oldSub.status },
                new_values: { status, reason },
            });

            return new Response(
                JSON.stringify({ subscription: updatedSub }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: PUT /saas/subscriptions/:id/plan
        if (req.method === 'PUT' && pathParts.length === 4 && pathParts[3] === 'plan') {
            const subscriptionId = pathParts[2];
            const { plan_id } = await req.json();

            // Get plan details
            const { data: plan } = await supabase
                .from('plans')
                .select('*')
                .eq('id', plan_id)
                .single();

            if (!plan) {
                throw new Error('Plan not found');
            }

            // Get old subscription
            const { data: oldSub } = await supabase
                .from('subscriptions')
                .select('*, tenant:tenants(id)')
                .eq('id', subscriptionId)
                .single();

            // Update subscription with new plan and limits snapshot
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

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id: oldSub.tenant_id,
                saas_user_id: adminCheck.saasUserId,
                action: 'CHANGE_PLAN',
                entity_type: 'SUBSCRIPTION',
                entity_id: subscriptionId,
                old_values: { plan_id: oldSub.plan_id },
                new_values: { plan_id, plan_name: plan.name },
            });

            return new Response(
                JSON.stringify({ subscription: updatedSub }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: PUT /saas/subscriptions/:id/extend-trial
        if (req.method === 'PUT' && pathParts.length === 4 && pathParts[3] === 'extend-trial') {
            const subscriptionId = pathParts[2];
            const { days } = await req.json();

            const { data: oldSub } = await supabase
                .from('subscriptions')
                .select('*, tenant:tenants(id)')
                .eq('id', subscriptionId)
                .single();

            // Calculate new trial end date
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

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id: oldSub.tenant_id,
                saas_user_id: adminCheck.saasUserId,
                action: 'EXTEND_TRIAL',
                entity_type: 'SUBSCRIPTION',
                entity_id: subscriptionId,
                old_values: { trial_end: oldSub.trial_end },
                new_values: { trial_end: newTrialEnd.toISOString().split('T')[0], days_added: days },
            });

            return new Response(
                JSON.stringify({ subscription: updatedSub }),
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
