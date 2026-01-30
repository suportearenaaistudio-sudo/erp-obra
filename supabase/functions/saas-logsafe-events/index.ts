/**
 * LogSafe Guardian - Events Investigation API
 * Endpoints para investigação de eventos de segurança
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema de busca
const searchEventsSchema = z.object({
    tenantId: z.string().uuid().optional(),
    actorId: z.string().uuid().optional(),
    ipHash: z.string().optional(),
    eventType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.number().min(1).max(500).default(100),
    offset: z.number().min(0).default(0),
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

        // ========================================
        // GET /saas/logsafe/events - Buscar eventos
        // ========================================
        if (req.method === 'GET' && path.endsWith('/events')) {
            const params = Object.fromEntries(url.searchParams);
            const filters = searchEventsSchema.parse({
                ...params,
                limit: params.limit ? parseInt(params.limit) : 100,
                offset: params.offset ? parseInt(params.offset) : 0,
            });

            let query = supabase
                .from('logsafe_event')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(filters.offset, filters.offset + filters.limit - 1);

            if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId);
            if (filters.actorId) query = query.eq('actor_id', filters.actorId);
            if (filters.ipHash) query = query.eq('ip_hash', filters.ipHash);
            if (filters.eventType) query = query.eq('event_type', filters.eventType);
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
                JSON.stringify({ events: data, total: count }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ========================================
        // GET /saas/logsafe/events/timeline - Timeline de eventos
        // ========================================
        if (req.method === 'GET' && path.endsWith('/timeline')) {
            const tenantId = url.searchParams.get('tenantId');
            const actorId = url.searchParams.get('actorId');
            const ipHash = url.searchParams.get('ipHash');
            const hours = parseInt(url.searchParams.get('hours') || '24');

            if (!tenantId && !actorId && !ipHash) {
                return new Response(
                    JSON.stringify({ error: 'At least one filter required (tenantId, actorId, or ipHash)' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const startDate = new Date();
            startDate.setHours(startDate.getHours() - hours);

            let query = supabase
                .from('logsafe_event')
                .select('*')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true })
                .limit(1000);

            if (tenantId) query = query.eq('tenant_id', tenantId);
            if (actorId) query = query.eq('actor_id', actorId);
            if (ipHash) query = query.eq('ip_hash', ipHash);

            const { data, error } = await query;

            if (error) {
                return new Response(
                    JSON.stringify({ error: error.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Agrupar por hora
            const timeline: any = {};
            data?.forEach((event: any) => {
                const hour = new Date(event.created_at).toISOString().slice(0, 13);
                if (!timeline[hour]) {
                    timeline[hour] = { hour, events: [], count: 0 };
                }
                timeline[hour].events.push(event);
                timeline[hour].count++;
            });

            return new Response(
                JSON.stringify({
                    timeline: Object.values(timeline),
                    totalEvents: data?.length || 0,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ========================================
        // GET /saas/logsafe/events/stats - Estatísticas de eventos
        // ========================================
        if (req.method === 'GET' && path.endsWith('/stats')) {
            const hours = parseInt(url.searchParams.get('hours') || '24');
            const startDate = new Date();
            startDate.setHours(startDate.getHours() - hours);

            // Total de eventos
            const { count: totalEvents } = await supabase
                .from('logsafe_event')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startDate.toISOString());

            // Por tipo de evento
            const { data: eventsByType } = await supabase
                .from('logsafe_event')
                .select('event_type')
                .gte('created_at', startDate.toISOString());

            const typeStats: any = {};
            eventsByType?.forEach((e: any) => {
                typeStats[e.event_type] = (typeStats[e.event_type] || 0) + 1;
            });

            // Por severidade (de incidentes relacionados)
            const { data: incidents } = await supabase
                .from('logsafe_incident')
                .select('severity')
                .gte('created_at', startDate.toISOString());

            const severityStats: any = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
            incidents?.forEach((i: any) => {
                severityStats[i.severity]++;
            });

            return new Response(
                JSON.stringify({
                    totalEvents: totalEvents || 0,
                    eventsByType: typeStats,
                    incidentsBySeverity: severityStats,
                    timeRange: `Last ${hours} hours`,
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
