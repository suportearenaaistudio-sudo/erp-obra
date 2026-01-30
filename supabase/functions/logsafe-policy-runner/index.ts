/**
 * LogSafe Guardian - Policy Runner Job
 * Avalia políticas e cria incidentes automaticamente
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { PolicyEngine } from '../_shared/policy-engine.ts';

serve(async (req) => {
    try {
        // Apenas permitir requisições POST (segurança)
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Verifica autorização (service role ou cron)
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.includes('Bearer')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log('🔒 [LogSafe Policy Runner] Starting evaluation...');

        // Criar Supabase client com service role
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        // Criar Policy Engine
        const policyEngine = new PolicyEngine(supabaseClient);

        // Avaliar todas as políticas
        const startTime = Date.now();
        const results = await policyEngine.evaluateAllPolicies();
        const duration = Date.now() - startTime;

        // Estatísticas
        const triggered = results.filter((r) => r.triggered);
        const incidentsCreated = triggered.filter((r) => r.incidentId).length;
        const actionsApplied = triggered.filter((r) => r.actionLogId).length;

        console.log(`✅ [LogSafe Policy Runner] Completed in ${duration}ms`, {
            totalPolicies: results.length,
            triggered: triggered.length,
            incidentsCreated,
            actionsApplied,
        });

        return new Response(
            JSON.stringify({
                success: true,
                duration,
                stats: {
                    totalPolicies: results.length,
                    triggered: triggered.length,
                    incidentsCreated,
                    actionsApplied,
                },
                results: triggered.map((r) => ({
                    policyName: r.policyName,
                    eventCount: r.eventCount,
                    threshold: r.threshold,
                    incidentId: r.incidentId,
                    actionLogId: r.actionLogId,
                })),
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    } catch (error) {
        console.error('❌ [LogSafe Policy Runner] Error:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }
});
