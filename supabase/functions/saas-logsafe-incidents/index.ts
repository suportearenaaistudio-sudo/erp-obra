/**
 * LogSafe Guardian - Incidents Management API
 * Endpoints para gestão de incidentes de segurança
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schemas de validação
const listIncidentsSchema = z.object({
    tenantId: z.string().uuid().optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    status: z.enum(['OPEN', 'ACK', 'RESOLVED']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
});

const acknowledgeSchema = z.object({
    incidentId: z.string().uuid(),
});

const resolveSchema = z.object({
    incidentId: z.string().uuid(),
    resolutionNotes: z.string().min(10).max(1000),
});

const applyActionSchema = z.object({
    incidentId: z.string().uuid(),
    actionType: z.enum(['LOCK_USER_TEMP', 'RATE_LIMIT', 'REQUIRE_REAUTH']),
    targetType: z.enum(['TENANT_USER', 'TENANT', 'IP']),
    targetId: z.string(),
    params: z.record(z.any()),
    reason: z.string().min(10).max(500),
});

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Verificar autenticação
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

        // Verificar se é SaaS Admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { data: saasUser } = await supabase
            .from('saas_users')
            .select('id, role, active')
            .eq('email', user.email)
            .single();

        if (!saasUser || !saasUser.active) {
            return new Response(
                JSON.stringify({ error: 'Forbidden: Not a SaaS Admin' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const url = new URL(req.url);
        const path = url.pathname;

        // ========================================
        // GET /saas/logsafe/incidents - Listar incidentes
        // ========================================
        if (req.method === 'GET' && path.endsWith('/incidents')) {
            const params = Object.fromEntries(url.searchParams);
            const filters = listIncidentsSchema.parse({
                ...params,
                limit: params.limit ? parseInt(params.limit) : 50,
                offset: params.offset ? parseInt(params.offset) : 0,
            });

            let query = supabase
                .from('logsafe_incident')
                .select('*, logsafe_policy(name)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(filters.offset, filters.offset + filters.limit - 1);

            if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId);
            if (filters.severity) query = query.eq('severity', filters.severity);
            if (filters.status) query = query.eq('status', filters.status);
            if (filters.startDate) query = query.gte('created_at', filters.startDate);
            if (filters.endDate) query = query.lte('created_at', filters.endDate);

            const { data, error, count } = await query;

            if (error) {
                return new Response(
                    JSON.stringify({ error: error.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({ incidents: data, total: count }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ========================================
        // GET /saas/logsafe/incidents/:id - Detalhes do incidente
        // ========================================
        if (req.method === 'GET' && path.includes('/incidents/')) {
            const incidentId = path.split('/').pop();

            const { data: incident, error } = await supabase
                .from('logsafe_incident')
                .select('*, logsafe_policy(name, event_type, threshold)')
                .eq('id', incidentId)
                .single();

            if (error || !incident) {
                return new Response(
                    JSON.stringify({ error: 'Incident not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Buscar eventos de evidência
            const evidenceIds = incident.evidence_event_ids || [];
            let evidenceEvents = [];

            if (evidenceIds.length > 0) {
                const { data: events } = await supabase
                    .from('logsafe_event')
                    .select('*')
                    .in('id', evidenceIds)
                    .order('created_at', { ascending: true });

                evidenceEvents = events || [];
            }

            // Buscar ações aplicadas
            const { data: actions } = await supabase
                .from('logsafe_action_log')
                .select('*')
                .eq('incident_id', incidentId)
                .order('applied_at', { ascending: false });

            return new Response(
                JSON.stringify({
                    incident,
                    evidence: evidenceEvents,
                    actions: actions || [],
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ========================================
        // POST /saas/logsafe/incidents/:id/ack - Reconhecer incidente
        // ========================================
        if (req.method === 'POST' && path.includes('/ack')) {
            const incidentId = path.split('/')[path.split('/').length - 2];

            const { error } = await supabase
                .from('logsafe_incident')
                .update({ status: 'ACK' })
                .eq('id', incidentId);

            if (error) {
                return new Response(
                    JSON.stringify({ error: error.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({ success: true, message: 'Incident acknowledged' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ========================================
        // POST /saas/logsafe/incidents/:id/resolve - Resolver incidente
        // ========================================
        if (req.method === 'POST' && path.includes('/resolve')) {
            const body = await req.json();
            const { resolutionNotes } = resolveSchema.parse(body);
            const incidentId = path.split('/')[path.split('/').length - 2];

            const { error } = await supabase
                .from('logsafe_incident')
                .update({
                    status: 'RESOLVED',
                    resolved_at: new Date().toISOString(),
                    resolved_by: saasUser.id,
                    resolution_notes: resolutionNotes,
                })
                .eq('id', incidentId);

            if (error) {
                return new Response(
                    JSON.stringify({ error: error.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({ success: true, message: 'Incident resolved' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ========================================
        // POST /saas/logsafe/incidents/:id/actions - Aplicar ação manual
        // ========================================
        if (req.method === 'POST' && path.includes('/actions')) {
            const body = await req.json();
            const { actionType, targetType, targetId, params, reason } = applyActionSchema.parse(body);
            const incidentId = path.split('/')[path.split('/').length - 2];

            // Usar service role para aplicar ação
            const supabaseServiceRole = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );

            // Calcular expiração
            const expiresAt = new Date();
            if (actionType === 'LOCK_USER_TEMP') {
                expiresAt.setMinutes(expiresAt.getMinutes() + (params.durationMinutes || 10));
            } else if (actionType === 'RATE_LIMIT') {
                expiresAt.setHours(expiresAt.getHours() + (params.durationHours || 1));
            } else {
                expiresAt.setHours(expiresAt.getHours() + 1);
            }

            // Criar action_log
            const { data: actionLog, error: actionError } = await supabaseServiceRole
                .from('logsafe_action_log')
                .insert({
                    incident_id: incidentId,
                    action_type: actionType,
                    target_type: targetType,
                    target_id: targetId,
                    scope: params.scope,
                    params_json: params,
                    status: 'APPLIED',
                    created_by: saasUser.id,
                    created_by_type: 'SAAS_USER',
                    applied_at: new Date().toISOString(),
                    expires_at: expiresAt.toISOString(),
                })
                .select()
                .single();

            if (actionError || !actionLog) {
                return new Response(
                    JSON.stringify({ error: actionError?.message || 'Failed to create action' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Criar enforcement_state
            await supabaseServiceRole
                .from('logsafe_enforcement_state')
                .insert({
                    action_log_id: actionLog.id,
                    target_type: targetType,
                    target_id: targetId,
                    action_type: actionType,
                    scope: params.scope,
                    params_json: params,
                    expires_at: expiresAt.toISOString(),
                });

            return new Response(
                JSON.stringify({
                    success: true,
                    actionId: actionLog.id,
                    expiresAt: expiresAt.toISOString(),
                }),
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
