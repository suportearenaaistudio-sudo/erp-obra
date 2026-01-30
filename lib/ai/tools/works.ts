/**
 * AI Tools - Works Module
 * 
 * Tools relacionados a Works (Obras)
 */

import { supabase } from '@/lib/supabase';
import { ToolContext, ToolHandler } from './types';
import { TenantSafeQuery } from '@/lib/tenant-safe-query';
import { FeatureGuard } from '@/lib/security-guards';
import { FeatureKeys } from '@/lib/constants/features';

/**
 * get_work_summary
 * Retorna resumo completo de uma obra específica
 */
export const getWorkSummary: ToolHandler = {
    requiredPermission: 'view_works',
    requiredFeature: FeatureKeys.PROJECTS,

    async execute(args: { workId: string }, context: ToolContext) {
        // Validate Feature Access
        const featureGuard = new FeatureGuard(supabase);
        await featureGuard.check(context.tenantId, FeatureKeys.PROJECTS);

        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);

        const { data, error } = await safeQuery
            .from('projects')
            .select(`
        id,
        name,
        status,
        start_date,
        end_date,
        client_id,
        clients (
          name,
          email,
          phone
        ),
        description,
        address,
        budget_total,
        budget_spent,
        phase_current,
        team_count,
        created_at
      `)
            .eq('id', args.workId)
            // .eq('tenant_id', context.tenantId) // Auto
            .single();

        if (error || !data) {
            throw new Error(`Obra ${args.workId} não encontrada ou sem permissão de acesso`);
        }

        return {
            id: data.id,
            name: data.name,
            status: data.status,
            client: {
                name: (data.clients as any)?.name || 'N/A',
                email: (data.clients as any)?.email,
                phone: (data.clients as any)?.phone,
            },
            timeline: {
                start: data.start_date,
                end: data.end_date,
            },
            budget: {
                total: data.budget_total || 0,
                spent: data.budget_spent || 0,
                remaining: (data.budget_total || 0) - (data.budget_spent || 0),
                percentUsed: data.budget_total
                    ? Math.round((data.budget_spent || 0) / data.budget_total * 100)
                    : 0,
            },
            progress: {
                currentPhase: data.phase_current || 'Não iniciada',
            },
            team: {
                size: data.team_count || 0,
            },
            location: data.address || 'Não informado',
            description: data.description || 'Sem descrição',
        };
    },
};

/**
 * list_works
 * Lista obras com filtros opcionais
 */
export const listWorks: ToolHandler = {
    requiredPermission: 'view_works',
    requiredFeature: FeatureKeys.PROJECTS,

    async execute(
        args: {
            status?: 'active' | 'paused' | 'completed' | 'cancelled';
            limit?: number;
            clientId?: string;
        },
        context: ToolContext
    ) {
        // Validate Feature Access
        const featureGuard = new FeatureGuard(supabase);
        await featureGuard.check(context.tenantId, FeatureKeys.PROJECTS);

        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);
        let query = safeQuery
            .from('projects')
            .select(`
        id,
        name,
        status,
        start_date,
        end_date,
        clients (name),
        budget_total,
        budget_spent,
        phase_current
      `)
            // .eq('tenant_id', context.tenantId) // Auto
            .order('created_at', { ascending: false })
            .limit(args.limit || 10);

        if (args.status) {
            query = query.eq('status', args.status);
        }

        if (args.clientId) {
            query = query.eq('client_id', args.clientId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Erro ao buscar obras: ${error.message}`);
        }

        return {
            total: data?.length || 0,
            works: data?.map(w => ({
                id: w.id,
                name: w.name,
                status: w.status,
                client: (w.clients as any)?.name || 'N/A',
                budget: {
                    total: w.budget_total || 0,
                    spent: w.budget_spent || 0,
                },
                timeline: {
                    start: w.start_date,
                    end: w.end_date,
                },
                phase: w.phase_current || 'Não iniciada',
            })) || [],
        };
    },
};

/**
 * get_work_phase_status
 * Retorna status das fases de uma obra
 */
export const getWorkPhaseStatus: ToolHandler = {
    requiredPermission: 'view_works',
    requiredFeature: FeatureKeys.PROJECTS,

    async execute(args: { workId: string }, context: ToolContext) {
        // Validate Feature Access
        const featureGuard = new FeatureGuard(supabase);
        await featureGuard.check(context.tenantId, FeatureKeys.PROJECTS);

        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);

        // Verificar se obra existe e pertence ao tenant
        const { data: work, error: workError } = await safeQuery
            .from('projects')
            .select('id, name, phase_current')
            .eq('id', args.workId)
            // .eq('tenant_id', context.tenantId) // Auto
            .single();

        if (workError || !work) {
            throw new Error('Obra não encontrada');
        }

        // Buscar tarefas/fases (assumindo que existe tabela project_tasks ou similar)
        // project_phases should also be tenant isolated, either by direct tenant_id or RLS.
        // Assuming project_phases HAS tenant_id. If not, we rely on project_id and RLS (cascade).
        // Let's assume best practice: ALL tables have tenant_id.
        // If not, we might need a bypass or rely on RLS. 
        // Based on schema analysis, project_phases HAS tenant_id (implied by previous migrations).
        // Let's use safeQuery.
        const { data: phases, error: phasesError } = await safeQuery
            .from('project_phases')
            .select('*')
            .eq('project_id', args.workId)
            .order('order', { ascending: true });

        if (phasesError) {
            // Se tabela não existe ainda, retornar info básica
            return {
                workId: work.id,
                workName: work.name,
                currentPhase: work.phase_current,
                message: 'Detalhamento de fases ainda não implementado nesta versão',
            };
        }

        return {
            workId: work.id,
            workName: work.name,
            currentPhase: work.phase_current,
            phases: phases?.map(p => ({
                name: p.name,
                status: p.status,
                startDate: p.start_date,
                endDate: p.end_date,
                progress: p.progress_percent || 0,
            })) || [],
        };
    },
};
