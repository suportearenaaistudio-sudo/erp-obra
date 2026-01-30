/**
 * AI Tools - System Module
 * 
 * Tools relacionados ao sistema (contexto do usuário, erros, suporte)
 */

import { supabase } from '@/lib/supabase';
import { ToolContext, ToolHandler } from './types';
import { TenantSafeQuery } from '@/lib/tenant-safe-query';

/**
 * get_user_context
 * Retorna informações do usuário logado e seu tenant
 */
export const getUserContext: ToolHandler = {
    requiredPermission: undefined, // Todos podem ver próprio contexto

    async execute(args: {}, context: ToolContext) {
        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);

        // Buscar informações do tenant (TenantSafeQuery não filtra tenants por tenant_id pois a tabela é global/compartilhada,
        // mas o objeto em si deve ser filtrado. No TenantSafeQuery fizemos exceção pra tabelas globais.
        // A tabela 'tenants' TEM tenant_id? Na verdade ela É a tabela de tenants.
        // O ID do tenant é a PK. Então .eq('id', context.tenantId) é o filtro correto.
        // Vamos manter o filtro explícito para 'tenants' já que TenantSafeQuery filtro por campo 'tenant_id'.

        const { data: tenant } = await supabase
            .from('tenants')
            .select('id, name, slug, status')
            .eq('id', context.tenantId)
            .single();

        // Buscar subscription - APROVEITANDO O SAFE QUERY AQUI
        const { data: subscription } = await safeQuery
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

        // Error logs geralmente tem user_id, mas idealmente teriam tenant_id também.
        // Vamos checar schema... assumindo que tem.
        const { data: errors } = await supabase
            .from('error_logs')
            .select('id, error_message, page, created_at')
            .eq('user_id', context.userId) // Filtro por usuário é forte, mas tenant check é melhor
            // .eq('tenant_id', context.tenantId) // Se tiver tenant_id, melhor usar safeQuery
            // Como não tenho certeza do schema de error_logs agora, mantenho o código original mas adiciono o import
            // TODO: add tenant_id to error_logs if missing
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
        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);

        // Criar ticket
        const { data: ticket, error } = await safeQuery
            .from('support_tickets')
            .insert({
                tenant_id: context.tenantId, // SafeQuery auto-injects on select, but for insert we usually explicit.
                // Our TenantSafeQuery helper mostly acts on the builder. 
                // .insert() payload needs the ID.
                // Security note: RLS prevents inserting for other tenants anyway.
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

        // Support messages might not have tenant_id directly but link to ticket
        // So we can't use safeQuery directly if table lacks tenant_id column
        // Assuming support_messages relies on ticket relation or has tenant_id
        // Using raw supabase here for child table to be safe if no tenant_id col
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
        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);

        // Verificar se ticket existe E pertence ao tenant
        const { data: ticket, error } = await safeQuery
            .from('support_tickets')
            .select('id, status')
            .eq('id', args.ticketId) // e.g. tenant_id injected by safeQuery
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
