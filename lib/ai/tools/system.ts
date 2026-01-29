/**
 * AI Tools - System Module
 * 
 * Tools relacionados ao sistema (contexto do usuário, erros, suporte)
 */

import { supabase } from '@/lib/supabase';
import { ToolContext, ToolHandler } from './types';

/**
 * get_user_context
 * Retorna informações do usuário logado e seu tenant
 */
export const getUserContext: ToolHandler = {
    requiredPermission: undefined, // Todos podem ver próprio contexto

    async execute(args: {}, context: ToolContext) {
        // Buscar informações do tenant
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id, name, slug, status')
            .eq('id', context.tenantId)
            .single();

        // Buscar subscription
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select(`
        status,
        trial_end,
        current_period_end,
        plans (
          name,
          display_name
        )
      `)
            .eq('tenant_id', context.tenantId)
            .single();

        return {
            user: {
                id: context.userId,
                name: context.userName,
                email: context.userEmail,
                permissions: context.permissions,
            },
            company: {
                id: tenant?.id,
                name: tenant?.name,
                status: tenant?.status,
            },
            plan: {
                name: (subscription?.plans as any)?.display_name || 'Free',
                status: subscription?.status || 'trial',
                trialEnd: subscription?.trial_end,
            },
        };
    },
};

/**
 * get_recent_errors
 * Retorna erros recentes do usuário (se houver log de erros)
 */
export const getRecentErrors: ToolHandler = {
    requiredPermission: undefined,

    async execute(args: { lastHours?: number }, context: ToolContext) {
        const hoursAgo = new Date();
        hoursAgo.setHours(hoursAgo.getHours() - (args.lastHours || 24));

        // Se houver tabela de error_logs
        const { data: errors } = await supabase
            .from('error_logs')
            .select('id, error_message, page, created_at')
            .eq('user_id', context.userId)
            .gte('created_at', hoursAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(5);

        if (!errors || errors.length === 0) {
            return {
                hasErrors: false,
                message: 'Nenhum erro recente encontrado',
            };
        }

        return {
            hasErrors: true,
            count: errors.length,
            errors: errors.map(e => ({
                message: e.error_message,
                page: e.page,
                timestamp: e.created_at,
            })),
        };
    },
};

/**
 * create_support_ticket
 * Cria um ticket de suporte (usado pelo Support Bot)
 */
export const createSupportTicket: ToolHandler = {
    requiredPermission: undefined, // Todos podem criar tickets

    async execute(
        args: {
            category: 'question' | 'bug' | 'feature' | 'urgent';
            severity?: 'low' | 'normal' | 'high' | 'urgent';
            summary: string;
            steps?: string;
            transcriptRef?: string;
            attachments?: string[];
        },
        context: ToolContext
    ) {
        // Criar ticket
        const { data: ticket, error } = await supabase
            .from('support_tickets')
            .insert({
                tenant_id: context.tenantId,
                user_id: context.userId,
                subject: args.summary.substring(0, 255), // Limitar tamanho
                category: args.category,
                status: 'open',
                priority: args.severity === 'urgent' ? 'urgent' : 'normal',
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Erro ao criar ticket: ${error.message}`);
        }

        // Criar mensagem inicial com detalhes
        const messageContent = `
**Resumo:** ${args.summary}

${args.steps ? `**Passos para reproduzir:**\n${args.steps}` : ''}

${args.transcriptRef ? `**Referência da conversa:** ${args.transcriptRef}` : ''}

---
_Ticket criado automaticamente pelo Assistente de IA_
    `.trim();

        await supabase
            .from('support_messages')
            .insert({
                ticket_id: ticket.id,
                sender_type: 'user',
                sender_id: context.userId,
                message: messageContent,
            });

        return {
            ticketId: ticket.id,
            ticketNumber: `#${ticket.id.substring(0, 8).toUpperCase()}`,
            status: 'open',
            message: 'Ticket criado com sucesso. Nossa equipe irá revisar em breve.',
        };
    },
};

/**
 * handoff_to_human
 * Faz handoff de uma conversa para atendimento humano
 */
export const handoffToHuman: ToolHandler = {
    requiredPermission: undefined,

    async execute(
        args: {
            ticketId: string;
            reason: string;
        },
        context: ToolContext
    ) {
        // Verificar se ticket existe
        const { data: ticket, error } = await supabase
            .from('support_tickets')
            .select('id, status')
            .eq('id', args.ticketId)
            .eq('tenant_id', context.tenantId)
            .single();

        if (error || !ticket) {
            throw new Error('Ticket não encontrado');
        }

        // Adicionar mensagem de handoff
        await supabase
            .from('support_messages')
            .insert({
                ticket_id: args.ticketId,
                sender_type: 'system',
                sender_id: context.userId,
                message: `🤖 → 👤 **Transferência para atendimento humano**\n\n${args.reason}`,
            });

        return {
            success: true,
            message: 'Conversa transferida para atendimento humano. Um membro da nossa equipe irá responder em breve.',
        };
    },
};
