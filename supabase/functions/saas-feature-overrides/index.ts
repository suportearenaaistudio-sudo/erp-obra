import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Dev Admin API - Feature Overrides
 * 
 * Routes:
 * - GET /saas/feature-overrides - List all feature overrides
 * - POST /saas/feature-overrides - Create feature override
 * - DELETE /saas/feature-overrides/:id - Remove feature override
 * 
 * Security: Requires Dev Admin authentication
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

async function isDevAdmin(supabase: any, authHeader: string): Promise<{ isAdmin: boolean; saasUserId?: string }> {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (error || !user || !DEV_ADMIN_EMAILS.includes(user.email)) {
        return { isAdmin: false };
    }

    const { data: saasUser } = await supabase
        .from('saas_users')
        .select('id')
        .eq('email', user.email)
        .single();

    return {
        isAdmin: !!saasUser,
        saasUserId: saasUser?.id,
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

        // Route: GET /saas/feature-overrides
        if (req.method === 'GET' && pathParts.length === 2) {
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

            return new Response(
                JSON.stringify({ overrides }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: POST /saas/feature-overrides
        if (req.method === 'POST' && pathParts.length === 2) {
            const { tenant_id, feature_key, enabled, reason, expires_at } = await req.json();

            if (!tenant_id || !feature_key || typeof enabled !== 'boolean' || !reason) {
                throw new Error('Missing required fields: tenant_id, feature_key, enabled, reason');
            }

            // Check if override already exists
            const { data: existing } = await supabase
                .from('tenant_feature_overrides')
                .select('id')
                .eq('tenant_id', tenant_id)
                .eq('feature_key', feature_key)
                .single();

            let result;

            if (existing) {
                // Update existing override
                const { data, error } = await supabase
                    .from('tenant_feature_overrides')
                    .update({
                        enabled,
                        reason,
                        expires_at: expires_at || null,
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // Create new override
                const { data, error } = await supabase
                    .from('tenant_feature_overrides')
                    .insert({
                        tenant_id,
                        feature_key,
                        enabled,
                        reason,
                        expires_at: expires_at || null,
                        created_by_saas_user_id: adminCheck.saasUserId,
                    })
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id,
                saas_user_id: adminCheck.saasUserId,
                action: enabled ? 'ENABLE_FEATURE' : 'DISABLE_FEATURE',
                entity_type: 'FEATURE_OVERRIDE',
                entity_id: result.id,
                new_values: { feature_key, enabled, reason, expires_at },
            });

            return new Response(
                JSON.stringify({ override: result }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: DELETE /saas/feature-overrides/:id
        if (req.method === 'DELETE' && pathParts.length === 3) {
            const overrideId = pathParts[2];

            const { data: override } = await supabase
                .from('tenant_feature_overrides')
                .select('tenant_id, feature_key')
                .eq('id', overrideId)
                .single();

            const { error } = await supabase
                .from('tenant_feature_overrides')
                .delete()
                .eq('id', overrideId);

            if (error) throw error;

            // Audit log
            if (override) {
                await supabase.from('audit_logs').insert({
                    tenant_id: override.tenant_id,
                    saas_user_id: adminCheck.saasUserId,
                    action: 'REMOVE_FEATURE_OVERRIDE',
                    entity_type: 'FEATURE_OVERRIDE',
                    entity_id: overrideId,
                    old_values: { feature_key: override.feature_key },
                });
            }

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
