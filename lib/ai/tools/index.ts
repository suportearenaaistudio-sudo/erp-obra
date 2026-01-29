/**
 * AI Tools - Central Registry
 * 
 * Registra todos os tools disponíveis e fornece:
 * - Declarações para o Gemini (function declarations)
 * - Executor central (dispatcher)
 * - RBAC enforcement
 */

import { FunctionDeclaration } from '@google/generative-ai';
import { ToolContext, ToolResult, ToolRegistry } from './types';

// Import all tool handlers
import * as crmTools from './crm';
import * as workTools from './works';
import * as systemTools from './system';

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
            type: 'object',
            properties: {
                workId: {
                    type: 'string',
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
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['active', 'paused', 'completed', 'cancelled'],
                    description: 'Filtrar por status da obra (opcional)',
                },
                limit: {
                    type: 'number',
                    description: 'Número máximo de resultados (default: 10, max: 50)',
                },
                clientId: {
                    type: 'string',
                    description: 'Filtrar por ID do cliente (opcional)',
                },
            },
        },
    },
    {
        name: 'get_work_phase_status',
        description: 'Retorna status detalhado das fases/etapas de uma obra específica',
        parameters: {
            type: 'object',
            properties: {
                workId: {
                    type: 'string',
                    description: 'ID (UUID) da obra',
                },
            },
            required: ['workId'],
        },
    },

    // ========== CRM ==========
    {
        name: 'get_client_summary',
        description: 'Retorna informações detalhadas de um cliente específico, incluindo histórico de projetos',
        parameters: {
            type: 'object',
            properties: {
                clientId: {
                    type: 'string',
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
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Termo de busca (nome, email, documento, etc.)',
                },
                limit: {
                    type: 'number',
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
            type: 'object',
            properties: {
                filters: {
                    type: 'object',
                    description: 'Filtros opcionais (a definir)',
                },
            },
        },
    },

    // ========== SYSTEM/SUPPORT ==========
    {
        name: 'get_user_context',
        description: 'Retorna informações do usuário logado, empresa e plano atual',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'get_recent_errors',
        description: 'Retorna erros recentes do sistema para o usuário atual (útil para debug)',
        parameters: {
            type: 'object',
            properties: {
                lastHours: {
                    type: 'number',
                    description: 'Últimas N horas (default: 24)',
                },
            },
        },
    },
    {
        name: 'create_support_ticket',
        description: 'Cria um ticket de suporte. Use quando não conseguir resolver o problema do usuário.',
        parameters: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    enum: ['question', 'bug', 'feature', 'urgent'],
                    description: 'Categoria do ticket',
                },
                severity: {
                    type: 'string',
                    enum: ['low', 'normal', 'high', 'urgent'],
                    description: 'Severidade do problema',
                },
                summary: {
                    type: 'string',
                    description: 'Resumo do problema (máximo 255 caracteres)',
                },
                steps: {
                    type: 'string',
                    description: 'Passos para reproduzir o problema (opcional)',
                },
                transcriptRef: {
                    type: 'string',
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
            type: 'object',
            properties: {
                ticketId: {
                    type: 'string',
                    description: 'ID do ticket a transferir',
                },
                reason: {
                    type: 'string',
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
