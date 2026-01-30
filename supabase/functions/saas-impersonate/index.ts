import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { LogSafe } from '../../src/saas/logsafe/emitter.ts';
import { SecurityEventType, ActorType } from '../../src/saas/logsafe/types.ts';
import { validateRequest, createErrorResponse } from '../_shared/validation.ts';
import {
    checkDevAdminPermission,
    createImpersonationToken,
    verifyImpersonationToken,
    logImpersonationAudit
} from '../_shared/impersonation-jwt.ts';
import { handleCORS } from '../_shared/security-headers.ts';

/**
 * Dev Admin API - Impersonation System
 *
 * Routes:
 * - POST /saas/support/impersonate - Start impersonation session
 * - POST /saas/support/end-impersonation - End impersonation session
 *
 * Security:
 * - Requires Dev Admin role in database (not hardcoded)
 * - Creates signed JWT with 15-minute expiration
 * - Comprehensive audit logging
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const impersonateSchema = z.object({
    tenant_id: z.string().uuid('tenant_id deve ser um UUID válido'),
    user_id: z.string().uuid('user_id deve ser um UUID válido'),
    reason: z.string()
        .min(10, 'Razão deve ter no mínimo 10 caracteres')
        .max(500, 'Razão muito longa (máx 500 caracteres)'),
});

const endImpersonationSchema = z.object({
    session_id: z.string().uuid('session_id deve ser um UUID válido'),
});

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return handleCORS();
    }

    let traceId: string | undefined;

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const authHeader = req.headers.get('Authorization');
        // Verify SaaS Access
        const context = await pipeline.check(authHeader);
        const { user, adminCheck } = context;
        traceId = context.traceId;

        // Get SaaS User ID
        const { data: saasUser } = await supabase.from('saas_users').select('id, email').eq('email', user.email).single();
        if (!saasUser) throw new AppError(ErrorCode.FORBIDDEN, 'SaaS user not found', 403);

        // RATE LIMITING for impersonation
        const { EdgeRateLimiter, EdgeRateLimits } = await import('../_shared/rate-limiter.ts');
        const limiter = new EdgeRateLimiter();
        const rateLimitKey = `impersonate:${adminCheck.userId}`;

        try {
            await limiter.check(rateLimitKey, EdgeRateLimits.IMPERSONATION);
        } catch (error: any) {
            if (error.code === 'RATE_LIMIT_EXCEEDED') {
                return new Response(
                    JSON.stringify({
                        error: error.message,
                        code: 'RATE_LIMIT_EXCEEDED',
                        retryAfter: error.retryAfter,
                    }),
                    {
                        status: 429,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(error.retryAfter) },
                    }
                );
            }
            throw error;
        }

        const url = new URL(req.url);
        const pathParts = url.pathname.split('/').filter(Boolean);

        // Route: POST /saas/support/impersonate
        if (req.method === 'POST' && pathParts[pathParts.length - 1] === 'impersonate') {
            // VALIDATE INPUT
            const { tenant_id, user_id, reason } = await validateRequest(req, impersonateSchema);

            // Validate user exists and belongs to tenant
            const { data: targetUser, error: userError } = await supabase
                .from('users')
                .select('id, name, email, tenant_id')
                .eq('id', user_id)
                .eq('tenant_id', tenant_id)
                .single();

            if (userError || !targetUser) {
                return new Response(
                    JSON.stringify({ error: 'User not found or does not belong to specified tenant' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Generate session ID
            const sessionId = crypto.randomUUID();

            // CREATE SIGNED JWT TOKEN
            const token = await createImpersonationToken({
                sessionId,
                adminUserId: adminCheck.userId!,
                adminEmail: user.email!,
                targetTenantId: tenant_id,
                targetUserId: user_id,
                reason,
            });

            // Store session in database
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
            await supabase.from('support_sessions').insert({
                id: sessionId,
                admin_id: adminCheck.userId,
                tenant_id,
                user_id,
                tenant_id,
                saas_user_id: saasUser.id,
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
            // VALIDATE INPUT
            const { session_id } = await validateRequest(req, endImpersonationSchema);

            // Get session
            const { data: session, error: sessionError } = await supabase
                .from('support_sessions')
                .select('*')
                .eq('id', session_id)
                .single();

            if (sessionError || !session) {
                return new Response(
                    JSON.stringify({ error: 'Session not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // VERIFY JWT TOKEN
            try {
                await verifyImpersonationToken(session.token);
            } catch (error) {
                // Token invalid or expired - still allow end, but log it
                await logImpersonationAudit(supabase, {
                    sessionId: session_id,
                    adminUserId: adminCheck.userId!,
                    adminEmail: user.email!,
                    targetTenantId: session.tenant_id,
                    targetUserId: session.user_id,
                    action: 'EXPIRED',
                    reason: `Invalid token: ${error.message}`,
                });
            }

            // Mark session as ended
            await supabase
                .from('support_sessions')
                .update({ ended_at: new Date().toISOString() })
                .eq('id', session_id);

            // LOG AUDIT
            await logImpersonationAudit(supabase, {
                sessionId: session_id,
                adminUserId: adminCheck.userId!,
                adminEmail: user.email!,
                targetTenantId: session.tenant_id,
                targetUserId: session.user_id,
                action: 'END',
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: req.headers.get('user-agent') || 'unknown',
            });

            return new Response(
                JSON.stringify({ success: true, message: 'Impersonation session ended' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Route not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return createErrorResponse(
            error instanceof Error ? error : new Error('Unknown error'),
            500
        );
    }
});
