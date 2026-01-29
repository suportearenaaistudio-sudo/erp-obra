/**
 * AI Tools - Finance Module
 * 
 * Tools relacionados a Finanças (Contas a Pagar/Receber)
 */

import { supabase } from '@/lib/supabase';
import { ToolContext, ToolHandler } from './types';

/**
 * get_financial_summary
 * Retorna resumo financeiro (Entradas, Saídas, Saldo, Inadimplência)
 */
export const getFinancialSummary: ToolHandler = {
    requiredPermission: 'view_finance',

    async execute(args: { month?: number; year?: number }, context: ToolContext) {
        // Se não informado, pega mês atual
        const now = new Date();
        const month = args.month || now.getMonth() + 1;
        const year = args.year || now.getFullYear();

        // Calcular range de datas
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0).toISOString(); // Último dia do mês

        // Buscar todas transações do período
        const { data: records, error } = await supabase
            .from('financial_records')
            .select('*')
            .eq('tenant_id', context.tenantId)
            .gte('due_date', startDate)
            .lte('due_date', endDate);

        if (error) {
            throw new Error(`Erro ao buscar dados financeiros: ${error.message}`);
        }

        const data = records || [];

        // Calcular totais
        const summary = {
            period: `${month}/${year}`,
            receivables: {
                total: 0,
                received: 0,
                pending: 0,
                overdue: 0,
            },
            payables: {
                total: 0,
                paid: 0,
                pending: 0,
                overdue: 0,
            },
            balance: {
                projected: 0, // Tudo
                realized: 0, // Só pagos
            }
        };

        for (const record of data) {
            const amount = Number(record.amount || 0);

            if (record.type === 'AR') { // Accounts Receivable (Receita)
                summary.receivables.total += amount;
                if (record.status === 'PAID') {
                    summary.receivables.received += amount;
                } else if (record.status === 'OVERDUE') {
                    summary.receivables.overdue += amount;
                } else {
                    summary.receivables.pending += amount;
                }
            } else { // Accounts Payable (Despesa)
                summary.payables.total += amount;
                if (record.status === 'PAID') {
                    summary.payables.paid += amount;
                } else if (record.status === 'OVERDUE') {
                    summary.payables.overdue += amount;
                } else {
                    summary.payables.pending += amount;
                }
            }
        }

        summary.balance.projected = summary.receivables.total - summary.payables.total;
        summary.balance.realized = summary.receivables.received - summary.payables.paid;

        return summary;
    },
};

/**
 * list_transactions
 * Lista transações financeiras com filtros
 */
export const listTransactions: ToolHandler = {
    requiredPermission: 'view_finance',

    async execute(
        args: {
            type?: 'AP' | 'AR'; // AP = Contas a Pagar, AR = Contas a Receber
            status?: 'PENDING' | 'PAID' | 'OVERDUE';
            limit?: number;
            startDate?: string;
            endDate?: string;
        },
        context: ToolContext
    ) {
        let query = supabase
            .from('financial_records')
            .select(`
        id,
        type,
        description,
        amount,
        due_date,
        status,
        category,
        project_id,
        projects (name)
      `)
            .eq('tenant_id', context.tenantId)
            .order('due_date', { ascending: true })
            .limit(args.limit || 20);

        if (args.type) {
            query = query.eq('type', args.type);
        }

        if (args.status) {
            query = query.eq('status', args.status);
        }

        if (args.startDate) {
            query = query.gte('due_date', args.startDate);
        }

        if (args.endDate) {
            query = query.lte('due_date', args.endDate);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Erro ao listar transações: ${error.message}`);
        }

        return {
            total: data?.length || 0,
            transactions: data?.map(t => ({
                id: t.id,
                type: t.type === 'AR' ? 'Receita' : 'Despesa',
                description: t.description,
                amount: t.amount,
                dueDate: t.due_date,
                status: t.status,
                category: t.category || 'Geral',
                project: (t.projects as any)?.name || 'Sem projeto',
            })) || [],
        };
    },
};
