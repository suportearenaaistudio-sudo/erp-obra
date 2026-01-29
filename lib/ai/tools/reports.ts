/**
 * AI Tools - Reports Module
 * 
 * Agrega dados de outros módulos para gerar relatórios completos.
 * A IA usa os dados estruturados retornados por este tool para escrever
 * o relatório em linguagem natural, com formatação rica (Markdown).
 */

import { ToolContext, ToolHandler } from './types';
import * as financeTools from './finance';
import * as workTools from './works';
import * as inventoryTools from './inventory';

/**
 * generate_report_summary
 * Coleta dados consolidados para relatórios
 */
export const generateReportSummary: ToolHandler = {
    requiredPermission: 'view_reports', // Ou specific permission do módulo

    async execute(
        args: {
            type: 'financial' | 'works' | 'inventory' | 'executive';
            period?: string; // 'current_month', 'last_month', 'year_to_date'
        },
        context: ToolContext
    ) {
        const period = args.period || 'current_month';
        const now = new Date();
        let month = now.getMonth() + 1;
        let year = now.getFullYear();

        if (period === 'last_month') {
            month -= 1;
            if (month === 0) {
                month = 12;
                year -= 1;
            }
        }

        const reportData: any = {
            type: args.type,
            period: period,
            generatedAt: now.toISOString(),
        };

        // 1. Relatório Financeiro
        if (args.type === 'financial' || args.type === 'executive') {
            // Reutiliza a lógica do tool de finanças
            // Como financeTools.getFinancialSummary é um objeto ToolHandler, chamamos .execute()
            try {
                const financeData = await financeTools.getFinancialSummary.execute(
                    { month, year },
                    context
                );
                reportData.financial = financeData;
            } catch (error: any) {
                console.error('Erro ao buscar dados financeiros para relatório:', error);
                reportData.financial = { error: error.message };
            }
        }

        // 2. Relatório de Obras
        if (args.type === 'works' || args.type === 'executive') {
            try {
                // Busca resumo de obras ativas
                // Nota: listWorks aceita filtros. Vamos pegar as ativas.
                const worksData = await workTools.listWorks.execute(
                    { status: 'active', limit: 50 },
                    context
                );
                reportData.works = {
                    active: worksData.works,
                    totalCount: worksData.total,
                };
            } catch (error: any) {
                reportData.works = { error: error.message };
            }
        }

        // 3. Relatório de Estoque
        if (args.type === 'inventory' || args.type === 'executive') {
            try {
                // Busca itens com baixo estoque
                const lowStockData = await inventoryTools.listInventoryItems.execute(
                    { lowStock: true, limit: 50 },
                    context
                );

                // Busca valor total (precisaria de uma query específica, mas vamos usar o que temos)
                // Vamos pegar uma amostragem geral também
                const generalData = await inventoryTools.listInventoryItems.execute(
                    { limit: 1 },
                    context
                );

                reportData.inventory = {
                    lowStockItems: lowStockData.items,
                    lowStockCount: lowStockData.total,
                    totalItemsCountEstimate: generalData.total
                };
            } catch (error: any) {
                reportData.inventory = { error: error.message };
            }
        }

        return reportData;
    },
};
