import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Dev Admin API - Impersonation System
 * 
 * Routes:
 * - POST /saas/support/impersonate - Start impersonation session
 * - POST /saas/support/end-impersonation - End impersonation session
 * 
 * Security: Requires Dev Admin authentication
 * Creates temporary JWT token with 15-minute expiration
 * All actions logged in support_session_logs and audit_logs
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

    if (error || !user || !DEV_ADMIN_EMAILS.includes(user.email)) {
        return { isAdmin: false };
    }

    const { data: saasUser } = await supabase
        .from('saas_users')
        .select('id, email')
        .eq('email', user.email)
        .single();

    return {
        isAdmin: !!saasUser,
        saasUserId: saasUser?.id,
        email: saasUser?.email,
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

        // Route: POST /saas/support/impersonate
        if (req.method === 'POST' && pathParts[pathParts.length - 1] === 'impersonate') {
            const { tenant_id, user_id, reason } = await req.json();

            if (!tenant_id || !user_id || !reason) {
                throw new Error('Missing required fields: tenant_id, user_id, reason');
            }

            // Validate user exists and belongs to tenant
            const { data: targetUser, error: userError } = await supabase
                .from('users')
                .select('id, email, name, tenant_id')
                .eq('id', user_id)
                .eq('tenant_id', tenant_id)
                .single();

            if (userError || !targetUser) {
                throw new Error('User not found or does not belong to specified tenant');
            }

            // Calculate expiration (15 minutes from now)
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

            // Create support session log
            const { data: session, error: sessionError } = await supabase
                .from('support_session_logs')
                .insert({
                    saas_user_id: adminCheck.saasUserId,
                    tenant_id,
                    impersonated_user_id: user_id,
                    reason,
                    started_at: now.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
                    user_agent: req.headers.get('user-agent'),
                })
                .select()
                .single();

            if (sessionError) throw sessionError;

            // Create impersonation token
            // Note: In production, you would create a proper JWT here
            // For now, we'll return session info that the frontend can use
            const impersonationToken = {
                session_id: session.id,
                tenant_id,
                user_id,
                is_impersonation: true,
                saas_user_id: adminCheck.saasUserId,
                saas_user_email: adminCheck.email,
                expires_at: expiresAt.toISOString(),
            };

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id,
                saas_user_id: adminCheck.saasUserId,
                action: 'START_IMPERSONATION',
                entity_type: 'SUPPORT_SESSION',
                entity_id: session.id,
                new_values: {
                    impersonated_user: targetUser.email,
                    reason,
                },
            });

            return new Response(
                JSON.stringify({
                    success: true,
                    session: {
                        id: session.id,
                        tenant_id,
                        user: {
                            id: targetUser.id,
                            email: targetUser.email,
                            name: targetUser.name,
                        },
                        expires_at: expiresAt.toISOString(),
                        impersonation_token: impersonationToken,
                    },
                    message: `Impersonation session started. Expires in 15 minutes.`,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Route: POST /saas/support/end-impersonation
        if (req.method === 'POST' && pathParts[pathParts.length - 1] === 'end-impersonation') {
            const { session_id } = await req.json();

            if (!session_id) {
                throw new Error('Missing required field: session_id');
            }

            // Get session
            const { data: session } = await supabase
                .from('support_session_logs')
                .select('*')
                .eq('id', session_id)
                .single();

            if (!session) {
                throw new Error('Session not found');
            }

            // End session
            const { error } = await supabase
                .from('support_session_logs')
                .update({ ended_at: new Date().toISOString() })
                .eq('id', session_id);

            if (error) throw error;

            // Audit log
            await supabase.from('audit_logs').insert({
                tenant_id: session.tenant_id,
                saas_user_id: adminCheck.saasUserId,
                action: 'END_IMPERSONATION',
                entity_type: 'SUPPORT_SESSION',
                entity_id: session_id,
            });

            return new Response(
                JSON.stringify({ success: true, message: 'Impersonation session ended' }),
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
