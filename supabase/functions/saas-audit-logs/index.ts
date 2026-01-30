import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ErrorHandler } from '../_shared/errors/error-handler.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditLogFilters {
    tenant_id?: string;
    action?: string;
    entity_type?: string;
    user_id?: string;
    is_impersonation?: boolean;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    return ErrorHandler.handle(req, async () => {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Verify user is SaaS admin
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Authorization required' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check if user is SaaS admin
        const { data: saasUser, error: saasError } = await supabase
            .from('saas_users')
            .select('id, role')
            .eq('id', user.id)
            .single();

        if (saasError || !saasUser) {
            return new Response(
                JSON.stringify({ error: 'Access denied: Not a SaaS admin' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse query parameters for filtering
        const url = new URL(req.url);
        const filters: AuditLogFilters = {
            tenant_id: url.searchParams.get('tenant_id') || undefined,
            action: url.searchParams.get('action') || undefined,
            entity_type: url.searchParams.get('entity_type') || undefined,
            user_id: url.searchParams.get('user_id') || undefined,
            is_impersonation: url.searchParams.get('is_impersonation') === 'true' ? true : undefined,
            start_date: url.searchParams.get('start_date') || undefined,
            end_date: url.searchParams.get('end_date') || undefined,
            limit: parseInt(url.searchParams.get('limit') || '100'),
            offset: parseInt(url.searchParams.get('offset') || '0'),
        };

        // Build query
        let query = supabase
            .from('audit_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.tenant_id) {
            query = query.eq('tenant_id', filters.tenant_id);
        }
        if (filters.action) {
            query = query.eq('action', filters.action);
        }
        if (filters.entity_type) {
            query = query.eq('entity_type', filters.entity_type);
        }
        if (filters.user_id) {
            query = query.eq('user_id', filters.user_id);
        }
        if (filters.is_impersonation !== undefined) {
            query = query.eq('is_impersonation', filters.is_impersonation);
        }
        if (filters.start_date) {
            query = query.gte('created_at', filters.start_date);
        }
        if (filters.end_date) {
            query = query.lte('created_at', filters.end_date);
        }

        // Apply pagination
        query = query.range(filters.offset!, filters.offset! + filters.limit! - 1);

        const { data: logs, error: logsError, count } = await query;

        if (logsError) {
            return new Response(
                JSON.stringify({ error: 'Failed to fetch audit logs', details: logsError }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({
                data: logs,
                total: count,
                limit: filters.limit,
                offset: filters.offset,
                filters: filters,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    });
});
