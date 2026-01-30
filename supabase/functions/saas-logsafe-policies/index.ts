/**
 * LogSafe Guardian - Policies Management API
 * Endpoints para gestão de políticas de segurança
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schemas
const createPolicySchema = z.object({
    name: z.string().min(3).max(100),
    eventType: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    windowSeconds: z.number().min(60).max(86400),
    threshold: z.number().min(1).max(10000),
    groupBy: z.enum(['IP', 'ACTOR', 'TENANT', 'IP_OR_ACTOR']),
    actionType: z.enum(['LOCK_USER_TEMP', 'RATE_LIMIT', 'REQUIRE_REAUTH']).optional(),
    actionParams: z.record(z.any()).optional(),
    cooldownSeconds: z.number().min(0).max(86400).default(300),
});

const updatePolicySchema = z.object({
    enabled: z.boolean().optional(),
    windowSeconds: z.number().min(60).max(86400).optional(),
    threshold: z.number().min(1).max(10000).optional(),
    actionType: z.enum(['LOCK_USER_TEMP', 'RATE_LIMIT', 'REQUIRE_REAUTH']).nullable().optional(),
    actionParams: z.record(z.any()).optional(),
    cooldownSeconds: z.number().min(0).max(86400).optional(),
});

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Verificar SaaS Admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { data: saasUser } = await supabase
            .from('saas_users')
            .select('id, active')
            .eq('email', user.email)
            .single();

        if (!saasUser || !saasUser.active) {
            return new Response(
                JSON.stringify({ error: 'Forbidden' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const url = new URL(req.url);
        const path = url.pathname;

        // Service role para escrita
        const supabaseServiceRole = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // ========================================
        // GET /saas/logsafe/policies - Listar todas
        // ========================================
        if (req.method === 'GET' && path.endsWith('/policies')) {
            const { data, error } = await supabase
                .from('logsafe_policy')
                .select('*')
                .order('name');

            if (error) {
                return new Response(
                    JSON.stringify({ error: error.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({ policies: data }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ========================================
        // POST /saas/logsafe/policies - Criar política
        // ========================================
        if (req.method === 'POST' && path.endsWith('/policies')) {
            const body = await req.json();
            const policyData = createPolicySchema.parse(body);

            const { data, error } = await supabaseServiceRole
                .from('logsafe_policy')
                .insert({
                    name: policyData.name,
                    enabled: true,
                    event_type: policyData.eventType,
                    severity: policyData.severity,
                    window_seconds: policyData.windowSeconds,
                    threshold: policyData.threshold,
                    group_by: policyData.groupBy,
                    action_type: policyData.actionType || null,
                    action_params_json: policyData.actionParams || {},
                    cooldown_seconds: policyData.cooldownSeconds,
                })
                .select()
                .single();

            if (error) {
                return new Response(
                    JSON.stringify({ error: error.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({ policy: data }),
                { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ========================================
        // PUT /saas/logsafe/policies/:id - Atualizar política
        // ========================================
        if (req.method === 'PUT' && path.includes('/policies/')) {
            const policyId = path.split('/').pop();
            const body = await req.json();
            const updates = updatePolicySchema.parse(body);

            const updateData: any = {};
            if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
            if (updates.windowSeconds) updateData.window_seconds = updates.windowSeconds;
            if (updates.threshold) updateData.threshold = updates.threshold;
            if (updates.actionType !== undefined) updateData.action_type = updates.actionType;
            if (updates.actionParams) updateData.action_params_json = updates.actionParams;
            if (updates.cooldownSeconds !== undefined) updateData.cooldown_seconds = updates.cooldownSeconds;

            const { data, error } = await supabaseServiceRole
                .from('logsafe_policy')
                .update(updateData)
                .eq('id', policyId)
                .select()
                .single();

            if (error) {
                return new Response(
                    JSON.stringify({ error: error.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({ policy: data }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ========================================
        // POST /saas/logsafe/policies/:id/enable - Habilitar
        // ========================================
        if (req.method === 'POST' && path.includes('/enable')) {
            const policyId = path.split('/')[path.split('/').length - 2];

            const { error } = await supabaseServiceRole
                .from('logsafe_policy')
                .update({ enabled: true })
                .eq('id', policyId);

            if (error) {
                return new Response(
                    JSON.stringify({ error: error.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ========================================
        // POST /saas/logsafe/policies/:id/disable - Desabilitar
        // ========================================
        if (req.method === 'POST' && path.includes('/disable')) {
            const policyId = path.split('/')[path.split('/').length - 2];

            const { error } = await supabaseServiceRole
                .from('logsafe_policy')
                .update({ enabled: false })
                .eq('id', policyId);

            if (error) {
                return new Response(
                    JSON.stringify({ error: error.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
