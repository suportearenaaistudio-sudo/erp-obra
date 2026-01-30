import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * User Info API
 * 
 * Routes:
 * - GET /me - Get current user info with tenant, role, permissions, and features
 * - GET /me/features - Get resolved features for current tenant
 * 
 * Security: Requires authentication
 */

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

        const url = new URL(req.url);
        const pathParts = url.pathname.split('/').filter(Boolean);

        // Route: GET /me
        if (req.method === 'GET' && pathParts.length === 1) {
            // Get user profile with full context
            const { data: profile } = await supabase
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

            if (!profile) {
                throw new Error('Profile not found');
            }

            // Get subscription
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
                .eq('tenant_id', profile.tenant_id)
                .single();

            // Get permissions
            let permissions: string[] = [];
            if (profile.role?.is_tenant_admin) {
                permissions = ['*']; // All permissions
            } else if (profile.role_id) {
                const { data: perms } = await supabase
                    .from('role_permissions')
                    .select('permission_key')
                    .eq('tenant_id', profile.tenant_id)
                    .eq('role_id', profile.role_id);

                permissions = perms?.map(p => p.permission_key) || [];
            }

            // Resolve features (plan + overrides)
            let features = [...(subscription?.plan?.included_features || [])];

            const { data: overrides } = await supabase
                .from('tenant_feature_overrides')
                .select('feature_key, enabled, expires_at')
                .eq('tenant_id', profile.tenant_id);

            if (overrides) {
                for (const override of overrides) {
                    // Check expiration
                    if (override.expires_at && new Date(override.expires_at) < new Date()) {
                        continue;
                    }

                    if (override.enabled) {
                        features.push(override.feature_key);
                    } else {
                        features = features.filter(f => f !== override.feature_key);
                    }
                }
            }

            features = [...new Set(features)]; // Unique

            return new Response(
                JSON.stringify({
                    user: {
                        id: profile.id,
                        email: profile.email,
                        name: profile.name,
                        avatar_url: profile.avatar_url,
                    },
                    tenant: profile.tenant,
                    role: profile.role,
                    subscription,
                    permissions,
                    features,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: GET /me/features
        if (req.method === 'GET' && pathParts.length === 2 && pathParts[1] === 'features') {
            const { data: profile } = await supabase
                .from('users')
                .select('tenant_id')
                .eq('auth_user_id', user.id)
                .single();

            if (!profile) {
                throw new Error('Profile not found');
            }

            // Get subscription
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('plan:plans(included_features)')
                .eq('tenant_id', profile.tenant_id)
                .single();

            // 1. Start with plan features
            const planFeatures = subscription?.plan?.included_features || [];
            let resolvedFeatures = new Set(planFeatures);

            // 2. Get overrides
            const { data: overrides } = await supabase
                .from('tenant_feature_overrides')
                .select('*')
                .eq('tenant_id', profile.tenant_id);

            // 3. Apply overrides
            if (overrides) {
                for (const override of overrides) {
                    // Check expiration
                    if (override.expires_at && new Date(override.expires_at) < new Date()) {
                        continue;
                    }

                    if (override.enabled) {
                        resolvedFeatures.add(override.feature_key);
                    } else {
                        resolvedFeatures.delete(override.feature_key);
                    }
                }
            }

            return new Response(
                JSON.stringify({
                    features: Array.from(resolvedFeatures),
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
