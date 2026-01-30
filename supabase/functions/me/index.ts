import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SecurityPipeline } from '../_shared/security/pipeline.ts';
import { RequestContext, UserType } from '../_shared/types/context.ts';
import { generateTraceId } from '../_shared/logging/logger.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
            throw new Error('Unauthorized');
        }

        // Build Request Context
        // We need to fetch tenant_id first to build context
        const { data: profile } = await supabase
            .from('users')
            .select('tenant_id, role:roles(is_tenant_admin)')
            .eq('auth_user_id', user.id)
            .single();

        const tenantId = profile?.tenant_id;
        const traceId = generateTraceId();

        const context: RequestContext = {
            userType: UserType.TENANT, // Default validation as tenant user
            userId: user.id, // Auth user ID
            email: user.email,
            tenantId: tenantId,
            traceId,
            ipAddress: req.headers.get('x-forwarded-for') || '',
            userAgent: req.headers.get('user-agent') || '',
        };

        const pipeline = new SecurityPipeline(supabase);

        const url = new URL(req.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const section = url.searchParams.get('section');

        // Route: GET /me (or ?section=full)
        if (req.method === 'GET' && (pathParts.length === 1 && !section || section === 'full')) {
            // Get full profile
            const { data: fullProfile } = await supabase
                .from('users')
                .select(`
                  id,
                  tenant_id,
                  email,
                  name,
                  avatar_url,
                  role_id,
                  role:roles(
                    id,
                    name,
                    is_tenant_admin
                  ),
                  tenant:tenants(
                    id,
                    name,
                    slug,
                    status
                  )
                `)
                .eq('auth_user_id', user.id)
                .single();

            if (!fullProfile) {
                throw new Error('Profile not found');
            }

            // Get Subscription
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select(`
                  id,
                  status,
                  trial_end,
                  current_period_end,
                  plan:plans(
                    name,
                    display_name,
                    included_features
                  )
                `)
                .eq('tenant_id', tenantId)
                .single();

            // Resolve features and permissions using pipeline
            const features = await pipeline.getFeatures(tenantId);

            // For permissions, we need to pass the INTERNAL user ID (uuid), not auth_user_id
            // But RBACGuard usually expects the user ID that is in the users table?
            // Let's check RBACGuard implementation.
            // "eq('id', userId)" -> It expects the PUBLIC.USERS.ID.
            // "user.id" from auth.getUser() is AUTH.USERS.ID.
            // We need to pass fullProfile.id to check permissions.
            const permissions = await pipeline.getPermissions(tenantId, fullProfile.id);

            return new Response(
                JSON.stringify({
                    user: {
                        id: fullProfile.id,
                        email: fullProfile.email,
                        name: fullProfile.name,
                        avatar_url: fullProfile.avatar_url,
                    },
                    tenant: fullProfile.tenant,
                    role: fullProfile.role,
                    subscription,
                    permissions,
                    features,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: GET /me/features
        if (req.method === 'GET' && ((pathParts.length === 2 && pathParts[1] === 'features') || section === 'features')) {
            if (!tenantId) throw new Error('Tenant context required');

            const features = await pipeline.getFeatures(tenantId);

            // Get simple subscription details for frontend context
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('status, plan:plans(included_features)')
                .eq('tenant_id', tenantId)
                .maybeSingle();

            return new Response(
                JSON.stringify({
                    features,
                    plan: subscription?.plan,
                    status: subscription?.status
                }),
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
