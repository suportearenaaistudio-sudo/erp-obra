/**
 * LogSafe Guardian - Cleanup Job
 * Remove enforcements expirados e limpa eventos antigos
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ActionEnforcer } from '../_shared/action-enforcer.ts';

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

        console.log('🧹 [LogSafe Cleanup] Starting cleanup...');

        // Criar Supabase client com service role
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        // Criar Action Enforcer
        const actionEnforcer = new ActionEnforcer(supabaseClient);

        // Limpar enforcements expirados
        const startTime = Date.now();
        const cleanedCount = await actionEnforcer.cleanupExpired();
        const duration = Date.now() - startTime;

        console.log(`✅ [LogSafe Cleanup] Completed in ${duration}ms`, {
            cleanedEnforcements: cleanedCount,
        });

        return new Response(
            JSON.stringify({
                success: true,
                duration,
                cleanedEnforcements: cleanedCount,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    } catch (error) {
        console.error('❌ [LogSafe Cleanup] Error:', error);

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
