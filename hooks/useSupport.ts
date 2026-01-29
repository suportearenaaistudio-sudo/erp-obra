import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SupportTicket {
    id: string;
    tenant_id: string;
    user_id: string;
    subject: string;
    category: 'question' | 'bug' | 'feature_request' | 'urgent';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    resolved_by?: string;
    messageCount?: number;
}

export interface SupportMessage {
    id: string;
    ticket_id: string;
    sender_type: 'user' | 'dev_admin';
    sender_id: string;
    message: string;
    created_at: string;
    read_at?: string;
    sender_name?: string;
}

export const useSupport = () => {
    const { user, profile, tenant } = useAuth();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Criar novo ticket
    const createTicket = async (
        subject: string,
        message: string,
        category: SupportTicket['category'] = 'question'
    ) => {

        if (!profile?.id || !tenant?.id) {
            console.error('❌ Missing profile or tenant:', { profile, tenant });
            throw new Error('Usuário não autenticado ou tenant não encontrado');
        }

        setLoading(true);
        try {
            // 1. Criar ticket
            const { data: ticket, error: ticketError } = await supabase
                .from('support_tickets')
                .insert({
                    tenant_id: tenant.id,
                    user_id: profile.id,
                    subject,
                    category,
                    status: 'open',
                    priority: category === 'urgent' ? 'urgent' : 'normal',
                })
                .select()
                .single();

            if (ticketError) {
                console.error('❌ Ticket creation error:', ticketError);
                throw ticketError;
            }

            // 2. Criar primeira mensagem
            const { error: messageError } = await supabase
                .from('support_messages')
                .insert({
                    ticket_id: ticket.id,
                    sender_type: 'user',
                    sender_id: profile.id,
                    message,
                });

            if (messageError) {
                console.error('❌ Message creation error:', messageError);
                throw messageError;
            }

            // Recarregar tickets
            await loadMyTickets();

            return ticket;
        } catch (error: any) {
            console.error('❌ Error creating ticket:', error);
            // Mensagem mais amigável baseada no erro
            if (error.code === '42501') {
                throw new Error('Sem permissão para criar ticket. Verifique as políticas RLS.');
            } else if (error.message?.includes('violates')) {
                throw new Error('Dados inválidos. Verifique os campos.');
            }
            throw new Error(`Erro ao criar ticket: ${error.message || 'Tente novamente'}`);
        } finally {
            setLoading(false);
        }
    };

    // Carregar meus tickets
    const loadMyTickets = async () => {
        if (!profile?.id) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select(`
          *,
          messages:support_messages(count)
        `)
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Adicionar contagem de mensagens
            const ticketsWithCount = (data || []).map((ticket: any) => ({
                ...ticket,
                messageCount: ticket.messages?.[0]?.count || 0,
            }));

            setTickets(ticketsWithCount);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    // Carregar mensagens de um ticket
    const loadTicketMessages = async (ticketId: string): Promise<SupportMessage[]> => {
        try {
            const { data, error } = await supabase
                .from('support_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Enriquecer com nome do sender
            const messagesWithNames = await Promise.all(
                (data || []).map(async (msg: any) => {
                    if (msg.sender_type === 'user') {
                        const { data: userData } = await supabase
                            .from('users')
                            .select('name')
                            .eq('id', msg.sender_id)
                            .single();
                        return { ...msg, sender_name: userData?.name || 'Usuário' };
                    } else {
                        const { data: adminData } = await supabase
                            .from('saas_users')
                            .select('name')
                            .eq('id', msg.sender_id)
                            .single();
                        return { ...msg, sender_name: adminData?.name || 'Suporte' };
                    }
                })
            );

            return messagesWithNames;
        } catch (error) {
            console.error('Error loading messages:', error);
            return [];
        }
    };

    // Enviar mensagem em um ticket
    const sendMessage = async (ticketId: string, message: string) => {
        if (!profile?.id) throw new Error('User not authenticated');

        try {
            const { error } = await supabase.from('support_messages').insert({
                ticket_id: ticketId,
                sender_type: 'user',
                sender_id: profile.id,
                message,
            });

            if (error) throw error;

            // Atualizar status do ticket para waiting_user se estava resolvido
            await supabase
                .from('support_tickets')
                .update({ status: 'waiting_user', updated_at: new Date().toISOString() })
                .eq('id', ticketId)
                .eq('status', 'resolved');
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    };

    // Marcar mensagens como lidas
    const markAsRead = async (ticketId: string) => {
        if (!profile?.id) return;

        try {
            await supabase.rpc('mark_ticket_messages_as_read', {
                p_ticket_id: ticketId,
                p_user_id: profile.id,
            });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    // Obter contagem de não lidos
    const loadUnreadCount = async () => {
        if (!profile?.id) return;

        try {
            const count = await supabase.rpc('get_unread_ticket_count', {
                p_user_id: profile.id,
            });

            setUnreadCount(count.data || 0);
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    };

    // Carregar tickets ao montar
    useEffect(() => {
        if (profile?.id) {
            loadMyTickets();
            loadUnreadCount();
        }
    }, [profile?.id]);

    // Subscribe para novos tickets/mensagens (realtime)
    useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase
            .channel('support_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'support_tickets',
                    filter: `user_id=eq.${profile.id}`,
                },
                () => {
                    loadMyTickets();
                    loadUnreadCount();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                },
                () => {
                    loadUnreadCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id]);

    // Send message to AI Support
    const sendToAISupport = async (message: string, conversationId?: string) => {
        if (!message) return;

        const { data, error } = await supabase.functions.invoke('ai-support', {
            body: {
                conversationId,
                message,
            },
        });

        if (error) throw error;
        return data;
    };

    return {
        tickets,
        loading,
        unreadCount,
        createTicket,
        loadMyTickets,
        loadTicketMessages,
        sendMessage,
        markAsRead,
        sendToAISupport,
    };
};
