/**
 * AI Tools - Budgets Module
 * 
 * Ferramentas para consultar orçamentos de obras
 */

import { supabase } from '@/lib/supabase';
import { ToolContext, ToolHandler } from './types';
import { TenantSafeQuery } from '@/lib/tenant-safe-query';
import { FeatureGuard } from '@/lib/security-guards';
import { FeatureKeys } from '@/lib/constants/features';

/**
 * get_budget_summary
 * Retorna resumo de orçamento de uma obra específica
 */
export const getBudgetSummary: ToolHandler = {
    requiredPermission: 'view_budgets',
    requiredFeature: FeatureKeys.PROJECTS,

    async execute(args: { budgetId: string }, context: ToolContext) {
        // Validate Feature Access
        const featureGuard = new FeatureGuard(supabase);
        await featureGuard.check(context.tenantId, FeatureKeys.PROJECTS);

        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);

        // Get budget with project details
        const { data: budget, error } = await safeQuery
            .from('budgets')
            .select(`
                id,
                project_id,
                total_amount,
                status,
                created_at,
                updated_at,
                project:projects (
                    id,
                    name,
                    client:clients (name)
                )
            `)
            .eq('id', args.budgetId)
            .single();

        if (error || !budget) {
            throw new Error(`Orçamento não encontrado: ${error?.message || 'ID inválido'}`);
        }

        // Get budget items to calculate spent
        const { data: items } = await safeQuery
            .from('budget_items')
            .select('quantity, unit_price, total_price')
            .eq('budget_id', args.budgetId);

        const totalBudgeted = items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
        const budgetRemaining = (budget.total_amount || 0) - totalBudgeted;

        return {
            budget_id: budget.id,
            project: {
                id: budget.project?.id,
                name: budget.project?.name,
                client: budget.project?.client?.name,
            },
            financial: {
                total_amount: budget.total_amount,
                total_budgeted: totalBudgeted,
                remaining: budgetRemaining,
                usage_percentage: budget.total_amount > 0
                    ? ((totalBudgeted / budget.total_amount) * 100).toFixed(2) + '%'
                    : '0%',
            },
            status: budget.status,
            items_count: items?.length || 0,
            created_at: budget.created_at,
            updated_at: budget.updated_at,
        };
    },
};

/**
 * list_budgets
 * Lista orçamentos com filtros
 */
export const listBudgets: ToolHandler = {
    requiredPermission: 'view_budgets',
    requiredFeature: FeatureKeys.PROJECTS,

    async execute(
        args: {
            status?: 'draft' | 'approved' | 'rejected';
            projectId?: string;
            limit?: number;
        },
        context: ToolContext
    ) {
        // Validate Feature Access
        const featureGuard = new FeatureGuard(supabase);
        await featureGuard.check(context.tenantId, FeatureKeys.PROJECTS);

        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);
        let query = safeQuery
            .from('budgets')
            .select(`
                id,
                project_id,
                total_amount,
                status,
                created_at,
                project:projects (
                    name,
                    client:clients (name)
                )
            `)
            .order('created_at', { ascending: false })
            .limit(args.limit || 20);

        // Apply filters
        if (args.status) {
            query = query.eq('status', args.status);
        }

        if (args.projectId) {
            query = query.eq('project_id', args.projectId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Erro ao listar orçamentos: ${error.message}`);
        }

        return {
            count: data?.length || 0,
            budgets: data?.map(b => ({
                id: b.id,
                project_name: b.project?.name,
                client_name: b.project?.client?.name,
                total_amount: b.total_amount,
                status: b.status,
                created_at: b.created_at,
            })) || [],
        };
    },
};

/**
 * get_budget_items
 * Lista itens de um orçamento específico
 */
export const getBudgetItems: ToolHandler = {
    requiredPermission: 'view_budgets',
    requiredFeature: FeatureKeys.PROJECTS,

    async execute(args: { budgetId: string }, context: ToolContext) {
        // Validate Feature Access
        const featureGuard = new FeatureGuard(supabase);
        await featureGuard.check(context.tenantId, FeatureKeys.PROJECTS);

        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);

        // Verify budget exists and belongs to tenant
        const { data: budget, error: budgetError } = await safeQuery
            .from('budgets')
            .select('id, project:projects(name)')
            .eq('id', args.budgetId)
            .single();

        if (budgetError || !budget) {
            throw new Error(`Orçamento não encontrado: ${budgetError?.message || 'ID inválido'}`);
        }

        // Get budget items
        const { data: items, error } = await safeQuery
            .from('budget_items')
            .select(`
                id,
                description,
                category,
                quantity,
                unit,
                unit_price,
                total_price,
                notes
            `)
            .eq('budget_id', args.budgetId)
            .order('category', { ascending: true });

        if (error) {
            throw new Error(`Erro ao buscar itens do orçamento: ${error.message}`);
        }

        // Group by category
        const itemsByCategory: Record<string, any[]> = {};
        items?.forEach(item => {
            const category = item.category || 'Outros';
            if (!itemsByCategory[category]) {
                itemsByCategory[category] = [];
            }
            itemsByCategory[category].push({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price,
                total_price: item.total_price,
                notes: item.notes,
            });
        });

        const totalAmount = items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;

        return {
            budget_id: args.budgetId,
            project_name: budget.project?.name,
            total_items: items?.length || 0,
            total_amount: totalAmount,
            items_by_category: itemsByCategory,
        };
    },
};
