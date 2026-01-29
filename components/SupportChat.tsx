import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, AlertCircle } from 'lucide-react';
import { useSupport, type SupportMessage } from '../hooks/useSupport';

export const SupportChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'list' | 'create' | 'thread'>('list');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);

    // Form states
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState<'question' | 'bug' | 'feature_request' | 'urgent'>('question');
    const [message, setMessage] = useState('');
    const [replyMessage, setReplyMessage] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const {
        tickets,
        loading,
        unreadCount,
        createTicket,
        loadTicketMessages,
        sendMessage,
        markAsRead,
    } = useSupport();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) return;

        try {
            await createTicket(subject, message, category);
            setSubject('');
            setMessage('');
            setCategory('question');
            setView('list');
        } catch (error) {
            console.error('Error creating ticket:', error);
            alert('Erro ao criar ticket. Tente novamente.');
        }
    };

    const handleOpenTicket = async (ticketId: string) => {
        setSelectedTicketId(ticketId);
        setView('thread');
        const msgs = await loadTicketMessages(ticketId);
        setMessages(msgs);
        await markAsRead(ticketId);
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedTicketId) return;

        try {
            await sendMessage(selectedTicketId, replyMessage);
            setReplyMessage('');

            // Recarregar mensagens
            const msgs = await loadTicketMessages(selectedTicketId);
            setMessages(msgs);
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Erro ao enviar mensagem. Tente novamente.');
        }
    };

    const getCategoryLabel = (cat: string) => {
        const labels: Record<string, string> = {
            question: 'Dúvida',
            bug: 'Problema Técnico',
            feature_request: 'Sugestão',
            urgent: 'Urgente',
        };
        return labels[cat] || cat;
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            open: 'Aberto',
            in_progress: 'Em Andamento',
            waiting_user: 'Aguardando Resposta',
            resolved: 'Resolvido',
            closed: 'Fechado',
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            open: 'bg-blue-100 text-blue-700',
            in_progress: 'bg-yellow-100 text-yellow-700',
            waiting_user: 'bg-purple-100 text-purple-700',
            resolved: 'bg-green-100 text-green-700',
            closed: 'bg-gray-100 text-gray-700',
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all z-50"
                title="Suporte"
            >
                <MessageCircle className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                        {unreadCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    <h3 className="font-semibold">
                        {view === 'list' && 'Suporte Obra360'}
                        {view === 'create' && 'Novo Ticket'}
                        {view === 'thread' && 'Conversa'}
                    </h3>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-blue-700 p-1 rounded"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* List View */}
                {view === 'list' && (
                    <>
                        <div className="p-4 border-b">
                            <button
                                onClick={() => setView('create')}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium"
                            >
                                + Novo Ticket
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loading && (
                                <div className="text-center text-gray-500 py-8">Carregando...</div>
                            )}

                            {!loading && tickets.length === 0 && (
                                <div className="text-center text-gray-500 py-8">
                                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>Nenhum ticket ainda</p>
                                    <p className="text-sm">Clique em "Novo Ticket" para começar</p>
                                </div>
                            )}

                            {tickets.map((ticket) => (
                                <button
                                    key={ticket.id}
                                    onClick={() => handleOpenTicket(ticket.id)}
                                    className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <h4 className="font-medium text-sm">{ticket.subject}</h4>
                                        <span
                                            className={`text-xs px-2 py-1 rounded ${getStatusColor(ticket.status)}`}
                                        >
                                            {getStatusLabel(ticket.status)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {getCategoryLabel(ticket.category)} • {ticket.messageCount} mensagens
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(ticket.created_at).toLocaleString('pt-BR')}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Create View */}
                {view === 'create' && (
                    <form onSubmit={handleCreateTicket} className="flex-1 flex flex-col p-4">
                        <button
                            type="button"
                            onClick={() => setView('list')}
                            className="text-blue-600 text-sm mb-4 text-left hover:underline"
                        >
                            ← Voltar
                        </button>

                        <div className="space-y-3 flex-1">
                            <div>
                                <label className="block text-sm font-medium mb-1">Assunto</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder="Ex: Problema com login"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Categoria</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as any)}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                >
                                    <option value="question">Dúvida</option>
                                    <option value="bug">Problema Técnico</option>
                                    <option value="feature_request">Sugestão</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-medium mb-1">Mensagem</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full border rounded px-3 py-2 text-sm flex-1 resize-none"
                                    placeholder="Descreva sua dúvida ou problema..."
                                    required
                                    rows={8}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium disabled:opacity-50"
                        >
                            {loading ? 'Enviando...' : 'Enviar Ticket'}
                        </button>
                    </form>
                )}

                {/* Thread View */}
                {view === 'thread' && (
                    <>
                        <button
                            onClick={() => {
                                setView('list');
                                setSelectedTicketId(null);
                                setMessages([]);
                            }}
                            className="text-blue-600 text-sm p-4 pb-2 text-left hover:underline"
                        >
                            ← Voltar
                        </button>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-3 ${msg.sender_type === 'user'
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
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendReply} className="p-4 border-t">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    className="flex-1 border rounded px-3 py-2 text-sm"
                                    placeholder="Digite sua mensagem..."
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded disabled:opacity-50"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};
