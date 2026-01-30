import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { MessageCircle, Clock, CheckCircle, AlertCircle, Send, X, Filter } from 'lucide-react';

interface Ticket {
    id: string;
    tenant_id: string;
    user_id: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    updated_at: string;
    tenant?: { name: string };
    user?: { name: string; email: string };
    messageCount?: number;
}

interface Message {
    id: string;
    ticket_id: string;
    sender_type: 'user' | 'dev_admin';
    sender_id: string;
    message: string;
    created_at: string;
    sender_name?: string;
}

export const DevAdminSupport: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyMessage, setReplyMessage] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    // Load all tickets (Dev Admin sees ALL)
    const loadTickets = async () => {
        setLoading(true);
        try {
            // Dev Admins precisam usar service_role ou RPC function
            // Por enquanto, vamos usar select direto (precisa ajustar RLS depois)
            const { data, error } = await supabase
                .from('support_tickets')
                .select(`
          *,
          tenant:tenants(name),
          user:users(name, email),
          messages:support_messages(count)
        `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading tickets:', error);
                return;
            }

            const ticketsWithCount = (data || []).map((ticket: any) => ({
                ...ticket,
                messageCount: ticket.messages?.[0]?.count || 0,
            }));

            setTickets(ticketsWithCount);
            setFilteredTickets(ticketsWithCount);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Apply filters
    useEffect(() => {
        let filtered = [...tickets];

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.status === statusFilter);
        }

        // Priority filter
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(t => t.priority === priorityFilter);
        }

        // Search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                t =>
                    t.subject.toLowerCase().includes(query) ||
                    t.user?.name?.toLowerCase().includes(query) ||
                    t.tenant?.name?.toLowerCase().includes(query)
            );
        }

        setFilteredTickets(filtered);
    }, [tickets, statusFilter, priorityFilter, searchQuery]);

    // Load ticket messages
    const loadTicketMessages = async (ticketId: string) => {
        try {
            const { data, error } = await supabase
                .from('support_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Enrich with sender names
            const enriched = await Promise.all(
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
                        return { ...msg, sender_name: adminData?.name || 'Dev Admin' };
                    }
                })
            );

            setMessages(enriched);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    // Send reply as Dev Admin
    const sendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedTicket) return;

        setSendingReply(true);
        try {
            // Assumindo que temos saas_user_id (você precisará pegar do contexto)
            const devAdminId = '10000000-0000-0000-0000-000000000001'; // Placeholder - pegar do auth

            const { error } = await supabase.from('support_messages').insert({
                ticket_id: selectedTicket.id,
                sender_type: 'dev_admin',
                sender_id: devAdminId,
                message: replyMessage,
            });

            if (error) throw error;

            // Update ticket status to in_progress
            await supabase
                .from('support_tickets')
                .update({ status: 'in_progress', updated_at: new Date().toISOString() })
                .eq('id', selectedTicket.id)
                .eq('status', 'open');

            setReplyMessage('');
            await loadTicketMessages(selectedTicket.id);
            await loadTickets(); // Refresh list
        } catch (error) {
            console.error('Error sending reply:', error);
            alert('Erro ao enviar resposta');
        } finally {
            setSendingReply(false);
        }
    };

    // Mark as resolved
    const markAsResolved = async () => {
        if (!selectedTicket) return;

        try {
            const devAdminId = '10000000-0000-0000-0000-000000000001'; // Placeholder

            await supabase
                .from('support_tickets')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString(),
                    resolved_by: devAdminId,
                })
                .eq('id', selectedTicket.id);

            setSelectedTicket(null);
            await loadTickets();
        } catch (error) {
            console.error('Error resolving ticket:', error);
        }
    };

    useEffect(() => {
        loadTickets();

        // Subscribe to realtime updates
        const channel = supabase
            .channel('admin_support_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'support_tickets',
                },
                () => loadTickets()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { color: string; label: string; icon: any }> = {
            open: { color: 'bg-blue-100 text-blue-700', label: 'Aberto', icon: AlertCircle },
            in_progress: { color: 'bg-yellow-100 text-yellow-700', label: 'Em Andamento', icon: Clock },
            waiting_user: { color: 'bg-purple-100 text-purple-700', label: 'Aguardando', icon: Clock },
            resolved: { color: 'bg-green-100 text-green-700', label: 'Resolvido', icon: CheckCircle },
            closed: { color: 'bg-gray-100 text-gray-700', label: 'Fechado', icon: CheckCircle },
        };
        const badge = badges[status] || badges.open;
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
                <Icon className="h-3 w-3" />
                {badge.label}
            </span>
        );
    };

    const getPriorityBadge = (priority: string) => {
        const colors: Record<string, string> = {
            low: 'bg-gray-100 text-gray-600',
            normal: 'bg-blue-100 text-blue-600',
            high: 'bg-orange-100 text-orange-600',
            urgent: 'bg-red-100 text-red-600',
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${colors[priority] || colors.normal}`}>
                {priority.toUpperCase()}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Suporte</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                        {filteredTickets.length} tickets
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Filter className="h-4 w-4" />
                    Filtros
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="all">Todos</option>
                            <option value="open">Aberto</option>
                            <option value="in_progress">Em Andamento</option>
                            <option value="waiting_user">Aguardando Usuário</option>
                            <option value="resolved">Resolvido</option>
                            <option value="closed">Fechado</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Prioridade</label>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="all">Todas</option>
                            <option value="low">Baixa</option>
                            <option value="normal">Normal</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Buscar</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Assunto, usuário, empresa..."
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>
                </div>
            </div>

            {/* Tickets List */}
            <div className="space-y-3">
                {loading && (
                    <div className="text-center py-12 text-gray-500">Carregando tickets...</div>
                )}

                {!loading && filteredTickets.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhum ticket encontrado</p>
                    </div>
                )}

                {filteredTickets.map((ticket) => (
                    <div
                        key={ticket.id}
                        className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition cursor-pointer"
                        onClick={() => {
                            setSelectedTicket(ticket);
                            loadTicketMessages(ticket.id);
                        }}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold">{ticket.subject}</h3>
                                    {getStatusBadge(ticket.status)}
                                    {getPriorityBadge(ticket.priority)}
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>
                                        👤 <span className="font-medium">{ticket.user?.name}</span> ({ticket.user?.email})
                                    </p>
                                    <p>
                                        🏢 <span className="font-medium">{ticket.tenant?.name}</span>
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        🕐 {new Date(ticket.created_at).toLocaleString('pt-BR')} • {ticket.messageCount} mensagens
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Ticket Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b flex items-start justify-between">
                            <div>
                                <h3 className="font-bold text-lg mb-2">{selectedTicket.subject}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>{selectedTicket.user?.name}</span>
                                    <span>•</span>
                                    <span>{selectedTicket.tenant?.name}</span>
                                    <span>•</span>
                                    {getStatusBadge(selectedTicket.status)}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTicket(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender_type === 'dev_admin' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-3 ${msg.sender_type === 'dev_admin'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-800'
                                            }`}
                                    >
                                        <p className="text-xs font-medium mb-1 opacity-75">
                                            {msg.sender_name}
                                        </p>
                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                        <p className="text-xs mt-1 opacity-75">
                                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reply Form */}
                        <form onSubmit={sendReply} className="p-4 border-t space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Digite sua resposta..."
                                    className="flex-1 border rounded px-3 py-2"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={sendingReply}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={markAsResolved}
                                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                                >
                                    ✓ Marcar como Resolvido
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
