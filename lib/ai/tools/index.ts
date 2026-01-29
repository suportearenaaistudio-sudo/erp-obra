/**
 * AI Tools - Central Registry
 * 
 * Registra todos os tools disponíveis e fornece:
 * - Declarações para o Gemini (function declarations)
 * - Executor central (dispatcher)
 * - RBAC enforcement
 */

import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { ToolContext, ToolResult, ToolRegistry } from './types';

// Import all tool handlers
import * as crmTools from './crm';
import * as workTools from './works';
import * as systemTools from './system';
import * as inventoryTools from './inventory';
import * as financeTools from './finance';
import * as reportTools from './reports';

/**
 * Tool Declarations (for Gemini function calling)
 * Define os schemas que o Gemini usa para decidir quando chamar cada tool
 */
export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
    // ========== WORKS ==========
    {
        name: 'get_work_summary',
        description: 'Retorna resumo completo de uma obra específica, incluindo cliente, orçamento, timeline, fase atual e equipe',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                workId: {
                    type: SchemaType.STRING,
                    description: 'ID (UUID) da obra',
                },
            },
            required: ['workId'],
        },
    },
    {
        name: 'list_works',
        description: 'Lista obras com filtros opcionais. Retorna informações resumidas de múltiplas obras.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                status: {
                    type: SchemaType.STRING,
                    description: 'Filtrar por status da obra (opcional): active, paused, completed, cancelled',
                    enum: ['active', 'paused', 'completed', 'cancelled'],
                    format: 'enum',
                },
                limit: {
                    type: SchemaType.NUMBER,
                    description: 'Número máximo de resultados (default: 10, max: 50)',
                },
                clientId: {
                    type: SchemaType.STRING,
                    description: 'Filtrar por ID do cliente (opcional)',
                },
            },
        },
    },
    {
        name: 'get_work_phase_status',
        description: 'Retorna status detalhado das fases/etapas de uma obra específica',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                workId: {
                    type: SchemaType.STRING,
                    description: 'ID (UUID) da obra',
                },
            },
            required: ['workId'],
        },
    },

    // ========== INVENTORY ==========
    {
        name: 'list_inventory_items',
        description: 'Lista itens de estoque (materiais) com busca e filtro de baixo estoque',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                search: {
                    type: SchemaType.STRING,
                    description: 'Termo de busca (nome ou SKU)',
                },
                lowStock: {
                    type: SchemaType.BOOLEAN,
                    description: 'Se true, lista apenas itens com estoque abaixo do mínimo',
                },
                category: {
                    type: SchemaType.STRING,
                    description: 'Filtrar por categoria',
                },
                limit: {
                    type: SchemaType.NUMBER,
                    description: 'Máximo de resultados',
                },
            },
        },
    },
    {
        name: 'get_item_details',
        description: 'Retorna detalhes completos de um item de estoque, incluindo financeiro',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                itemId: {
                    type: SchemaType.STRING,
                    description: 'ID (UUID) do item',
                },
                sku: {
                    type: SchemaType.STRING,
                    description: 'SKU do item (alternativa ao ID)',
                },
            },
        },
    },
    {
        name: 'record_stock_movement',
        description: 'Registra entrada ou saída de estoque. USE COM CAUTELA.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                itemId: {
                    type: SchemaType.STRING,
                    description: 'ID (UUID) do item para movimentar',
                },
                quantity: {
                    type: SchemaType.NUMBER,
                    description: 'Quantidade a movimentar (absoluta)',
                },
                type: {
                    type: SchemaType.STRING,
                    description: 'Tipo de movimento: in (entrada/compra) ou out (saída/consumo)',
                    enum: ['in', 'out'],
                    format: 'enum',
                },
                reason: {
                    type: SchemaType.STRING,
                    description: 'Motivo do movimento (ex: "Compra NF 123", "Uso na Obra X")',
                },
            },
            required: ['itemId', 'quantity', 'type', 'reason'],
        },
    },

    // ========== FINANCE ==========
    {
        name: 'get_financial_summary',
        description: 'Retorna resumo financeiro do mês (entradas, saídas, saldo, inadimplência)',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                month: {
                    type: SchemaType.NUMBER,
                    description: 'Mês (1-12). Se omitido, usa mês atual',
                },
                year: {
                    type: SchemaType.NUMBER,
                    description: 'Ano (ex: 2024). Se omitido, usa ano atual',
                },
            },
        },
    },
    {
        name: 'list_transactions',
        description: 'Lista transações financeiras (contas a pagar/receber) com filtros',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                type: {
                    type: SchemaType.STRING,
                    description: 'AP = Contas a Pagar, AR = Contas a Receber',
                    enum: ['AP', 'AR'],
                    format: 'enum',
                },
                status: {
                    type: SchemaType.STRING,
                    description: 'Status da transação',
                    enum: ['PENDING', 'PAID', 'OVERDUE'],
                    format: 'enum',
                },
                limit: {
                    type: SchemaType.NUMBER,
                    description: 'Limite de resultados',
                },
                startDate: {
                    type: SchemaType.STRING,
                    description: 'Data inicial (YYYY-MM-DD)',
                },
                endDate: {
                    type: SchemaType.STRING,
                    description: 'Data final (YYYY-MM-DD)',
                },
            },
        },
    },

    // ========== REPORTS ==========
    {
        name: 'generate_report_summary',
        description: 'Gera um resumo consolidado de dados (financeiro, obras, estoque) para relatórios',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                type: {
                    type: SchemaType.STRING,
                    description: 'Tipo de relatório desejado',
                    enum: ['financial', 'works', 'inventory', 'executive'],
                    format: 'enum',
                },
                period: {
                    type: SchemaType.STRING,
                    description: 'Período do relatório (opcional, default: current_month)',
                    enum: ['current_month', 'last_month', 'year_to_date'],
                    format: 'enum',
                },
            },
            required: ['type'],
        },
    },

    // ========== CRM ==========
    {
        name: 'get_client_summary',
        description: 'Retorna informações detalhadas de um cliente específico, incluindo histórico de projetos',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                clientId: {
                    type: SchemaType.STRING,
                    description: 'ID (UUID) do cliente',
                },
            },
            required: ['clientId'],
        },
    },
    {
        name: 'search_clients',
        description: 'Busca clientes por nome, email, documento (CPF/CNPJ) ou empresa',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                query: {
                    type: SchemaType.STRING,
                    description: 'Termo de busca (nome, email, documento, etc.)',
                },
                limit: {
                    type: SchemaType.NUMBER,
                    description: 'Número máximo de resultados (default: 10)',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'get_pipeline_status',
        description: 'Retorna status do pipeline de vendas/CRM (total de clientes, projetos ativos, etc.)',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                filters: {
                    type: SchemaType.OBJECT,
                    description: 'Filtros opcionais (a definir)',
                    properties: {},
                },
            },
        },
    },

    // ========== SYSTEM/SUPPORT ==========
    {
        name: 'get_user_context',
        description: 'Retorna informações do usuário logado, empresa e plano atual',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_recent_errors',
        description: 'Retorna erros recentes do sistema para o usuário atual (útil para debug)',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                lastHours: {
                    type: SchemaType.NUMBER,
                    description: 'Últimas N horas (default: 24)',
                },
            },
        },
    },
    {
        name: 'create_support_ticket',
        description: 'Cria um ticket de suporte. Use quando não conseguir resolver o problema do usuário.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                category: {
                    type: SchemaType.STRING,
                    description: 'Categoria do ticket',
                    enum: ['question', 'bug', 'feature', 'urgent'],
                    format: 'enum',
                },
                severity: {
                    type: SchemaType.STRING,
                    description: 'Severidade do problema',
                    enum: ['low', 'normal', 'high', 'urgent'],
                    format: 'enum',
                },
                summary: {
                    type: SchemaType.STRING,
                    description: 'Resumo do problema (máximo 255 caracteres)',
                },
                steps: {
                    type: SchemaType.STRING,
                    description: 'Passos para reproduzir o problema (opcional)',
                },
                transcriptRef: {
                    type: SchemaType.STRING,
                    description: 'Referência à transcrição da conversa (opcional)',
                },
            },
            required: ['category', 'summary'],
        },
    },
    {
        name: 'handoff_to_human',
        description: 'Transfere uma conversa/ticket para atendimento humano',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                ticketId: {
                    type: SchemaType.STRING,
                    description: 'ID do ticket a transferir',
                },
                reason: {
                    type: SchemaType.STRING,
                    description: 'Motivo da transferência',
                },
            },
            required: ['ticketId', 'reason'],
        },
    },
];

/**
 * Tool Registry - Mapeia nome → handler
 */
export const TOOL_HANDLERS: ToolRegistry = {
    // Works
    get_work_summary: workTools.getWorkSummary,
    list_works: workTools.listWorks,
    get_work_phase_status: workTools.getWorkPhaseStatus,

    // Inventory
    list_inventory_items: inventoryTools.listInventoryItems,
    get_item_details: inventoryTools.getItemDetails,
    record_stock_movement: inventoryTools.recordStockMovement,

    // Finance
    get_financial_summary: financeTools.getFinancialSummary,
    list_transactions: financeTools.listTransactions,

    // Reports
    generate_report_summary: reportTools.generateReportSummary,

    // CRM
    get_client_summary: crmTools.getClientSummary,
    search_clients: crmTools.searchClients,
    get_pipeline_status: crmTools.getPipelineStatus,

    // System
    get_user_context: systemTools.getUserContext,
    get_recent_errors: systemTools.getRecentErrors,
    create_support_ticket: systemTools.createSupportTicket,
    handoff_to_human: systemTools.handoffToHuman,
};

/**
 * Execute Tool - Central Dispatcher
 * 
 * Valida RBAC e executa o tool handler correspondente
 */
export async function executeTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
): Promise<ToolResult> {
    const handler = TOOL_HANDLERS[toolName];

    if (!handler) {
        return {
            success: false,
            error: `Tool '${toolName}' não encontrado. Tools disponíveis: ${Object.keys(TOOL_HANDLERS).join(', ')}`,
        };
    }

    try {
        // RBAC Check
        if (handler.requiredPermission) {
            if (!context.permissions.includes(handler.requiredPermission)) {
                return {
                    success: false,
                    error: `Sem permissão para executar '${toolName}'. Permissão necessária: ${handler.requiredPermission}. Contate seu administrador para obter acesso.`,
                };
            }
        }

        // Execute handler
        const result = await handler.execute(args, context);

        return {
            success: true,
            data: result,
        };
    } catch (error: any) {
        console.error(`Error executing tool '${toolName}':`, error);

        return {
            success: false,
            error: error.message || 'Erro desconhecido ao executar tool',
        };
    }
}
