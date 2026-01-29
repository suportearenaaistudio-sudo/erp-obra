import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, AlertCircle } from 'lucide-react';
import { useSupport, type SupportMessage } from '../hooks/useSupport';

export const SupportChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'list' | 'create' | 'thread' | 'history'>('list');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

    // Ticket State
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState<'question' | 'bug' | 'feature_request' | 'urgent'>('question');
    const [message, setMessage] = useState('');
    const [replyMessage, setReplyMessage] = useState('');

    // AI State
    const [aiInput, setAiInput] = useState('');
    const [isAIProcessing, setIsAIProcessing] = useState(false);
    const [aiConversationId, setAiConversationId] = useState<string | undefined>(undefined);
    const inputRef = useRef<HTMLInputElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const {
        tickets,
        loading,
        unreadCount,
        createTicket,
        loadTicketMessages,
        sendMessage,
        markAsRead,
        sendToAISupport
    } = useSupport();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, view]);

    // Handle Ticket Creation (Handoff)
    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) return;

        try {
            await createTicket(subject, message, category);
            setSubject('');
            setMessage('');
            setCategory('question');
            setView('history'); // Go to history after creating
        } catch (error) {
            console.error('Error creating ticket:', error);
            alert('Erro ao criar ticket. Tente novamente.');
        }
    };

    // Handle Opening a Ticket
    const handleOpenTicket = async (ticketId: string) => {
        setSelectedTicketId(ticketId);
        setView('thread');
        const msgs = await loadTicketMessages(ticketId);
        setMessages(msgs);
        await markAsRead(ticketId);
    };

    // Handle Sending Reply to Ticket
    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedTicketId) return;

        try {
            await sendMessage(selectedTicketId, replyMessage);
            setReplyMessage('');
            const msgs = await loadTicketMessages(selectedTicketId);
            setMessages(msgs);
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Erro ao enviar mensagem. Tente novamente.');
        }
    };

    // Handle Sending Message to AI
    const handleSendAI = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiInput.trim()) return;

        const userText = aiInput;
        setAiInput('');
        setIsAIProcessing(true);

        // Optimistic UI update
        // We reuse the 'SupportMessage' type locally for simple AI chat history
        const tempUserMsg: SupportMessage = {
            id: Date.now().toString(),
            ticket_id: 'ai-temp',
            sender_type: 'user',
            sender_id: 'me',
            message: userText,
            created_at: new Date().toISOString(),
            sender_name: 'Você'
        };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            const response = await sendToAISupport(userText, aiConversationId);

            if (response) {
                if (response.conversationId) {
                    setAiConversationId(response.conversationId);
                }

                const aiMsg: SupportMessage = {
                    id: Date.now().toString() + '-ai',
                    ticket_id: 'ai-temp',
                    sender_type: 'dev_admin', // Treat AI as admin/support for UI
                    sender_id: 'ai',
                    message: response.message,
                    created_at: new Date().toISOString(),
                    sender_name: 'Obra360 IA 🤖'
                };
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (error) {
            console.error('AI Error:', error);
            const errorMsg: SupportMessage = {
                id: Date.now().toString() + '-err',
                ticket_id: 'ai-temp',
                sender_type: 'dev_admin',
                sender_id: 'system',
                message: 'Desculpe, tive um erro ao processar. Tente novamente ou abra um ticket.',
                created_at: new Date().toISOString(),
                sender_name: 'Sistema'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsAIProcessing(false);
            setTimeout(() => inputRef.current?.focus(), 100);
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
            waiting_user: 'Aguardando',
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
                className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all z-50 flex items-center gap-2"
                title="Suporte Inteligente"
            >
                <div className="relative">
                    <MessageCircle className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {/* <span className="font-medium pr-1">Suporte</span> */}
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 font-sans">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                        <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">
                            {view === 'list' && 'Suporte Inteligente'}
                            {view === 'create' && 'Novo Ticket'}
                            {view === 'history' && 'Meus Tickets'}
                            {view === 'thread' && 'Detalhes do Ticket'}
                        </h3>
                        <p className="text-[11px] opacity-90">
                            {view === 'list' ? 'Online • Resposta imediata' : 'Equipe de Suporte'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-white/20 p-2 rounded-lg transition"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white">

                {/* AI Chat View (default) */}
                {view === 'list' && (
                    <div className="flex-1 flex flex-col">
                        {/* AI / Human Toggle */}
                        <div className="px-4 py-3 border-b bg-gray-50/50 flex justify-between items-center backdrop-blur-sm sticky top-0">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {isAIProcessing ? 'Digitando...' : 'Chat ao Vivo'}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setView('history')}
                                    className="text-xs font-medium text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-100 transition"
                                >
                                    Tickets ({unreadCount})
                                </button>
                                <button
                                    onClick={() => setView('create')}
                                    className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm font-medium"
                                >
                                    Falar com Humano
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                            {/* Mensagem inicial do sistema */}
                            {messages.length === 0 && (
                                <div className="flex justify-start animate-fade-in-up">
                                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm p-4 bg-white border border-gray-100 shadow-sm text-gray-800">
                                        <p className="text-sm leading-relaxed">
                                            Olá! Sou o assistente virtual do <strong>Obra360</strong>. 🤖<br /><br />
                                            Posso te ajudar com dúvidas sobre o sistema, obras, ou qualquer outra coisa. Se eu não souber, você pode abrir um ticket para nossa equipe humana!
                                        </p>
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                    <div
                                        className={`max-w-[85%] p-3 shadow-sm text-sm leading-relaxed
                                            ${msg.sender_type === 'user'
                                                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                                                : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                    </div>
                                </div>
                            ))}

                            {isAIProcessing && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                                        <div className="flex gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendAI} className="p-3 border-t bg-white flex gap-2 items-center">
                            <input
                                ref={inputRef}
                                type="text"
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                placeholder="Digite sua dúvida aqui..."
                                className="flex-1 bg-gray-50 border-gray-200 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all placeholder:text-gray-400"
                                disabled={isAIProcessing}
                            />
                            <button
                                type="submit"
                                disabled={!aiInput.trim() || isAIProcessing}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </form>
                    </div>
                )}

                {/* History View */}
                {view === 'history' && (
                    <>
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                            <button
                                onClick={() => setView('list')}
                                className="text-sm text-gray-600 hover:text-blue-600 hover:underline flex items-center gap-1"
                            >
                                ← Voltar ao Chat IA
                            </button>
                            <button
                                onClick={() => setView('create')}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg shadow-sm transition font-medium"
                            >
                                + Novo Ticket
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                            {loading && (
                                <div className="text-center text-gray-500 py-8 flex flex-col items-center">
                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                    Carregando tickets...
                                </div>
                            )}

                            {!loading && tickets.length === 0 && (
                                <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                                    <div className="bg-gray-100 p-4 rounded-full mb-3">
                                        <AlertCircle className="h-8 w-8 opacity-50" />
                                    </div>
                                    <p className="font-medium text-gray-600">Nenhum ticket encontrado</p>
                                    <p className="text-xs mt-1 max-w-[200px]">Seu histórico de suporte aparecerá aqui.</p>
                                </div>
                            )}

                            {tickets.map((ticket) => (
                                <button
                                    key={ticket.id}
                                    onClick={() => handleOpenTicket(ticket.id)}
                                    className="w-full text-left p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-semibold text-sm text-gray-900 line-clamp-1 group-hover:text-blue-700 transition-colors">
                                            {ticket.subject}
                                        </h4>
                                        <span
                                            className={`text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-bold ${getStatusColor(ticket.status)}`}
                                        >
                                            {getStatusLabel(ticket.status)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span>{getCategoryLabel(ticket.category)}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-medium text-gray-600">
                                                {ticket.messageCount} msg(s)
                                            </span>
                                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Create View */}
                {view === 'create' && (
                    <div className="flex-1 flex flex-col bg-gray-50/30">
                        <div className="p-4 border-b bg-white">
                            <button
                                onClick={() => setView('list')}
                                className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
                            >
                                ← Cancelar e voltar
                            </button>
                        </div>

                        <form onSubmit={handleCreateTicket} className="flex-1 flex flex-col p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">Assunto</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
                                    placeholder="Resumo do problema"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">Categoria</label>
                                <div className="relative">
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as any)}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm appearance-none"
                                    >
                                        <option value="question">❓ Dúvida Geral</option>
                                        <option value="bug">🐛 Problema Técnico / Bug</option>
                                        <option value="feature_request">💡 Sugestão de Melhoria</option>
                                        <option value="urgent">🔥 Urgente / Crítico</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">Mensagem Detalhada</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm flex-1 resize-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm leading-relaxed"
                                    placeholder="Descreva o problema ou dúvida em detalhes..."
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-bold shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Enviando...' : 'Enviar Ticket para Suporte'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Thread View */}
                {view === 'thread' && (
                    <>
                        <div className="p-3 border-b bg-gray-50/50 flex items-center justify-between">
                            <button
                                onClick={() => {
                                    setView('history');
                                    setSelectedTicketId(null);
                                    setMessages([]);
                                }}
                                className="text-sm text-gray-600 hover:text-blue-600 hover:underline flex items-center gap-1"
                            >
                                ← Voltar
                            </button>
                            <span className="text-xs font-mono text-gray-400">#{selectedTicketId?.slice(0, 8)}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className="flex flex-col max-w-[85%]">
                                        <div
                                            className={`rounded-2xl p-4 shadow-sm text-sm leading-relaxed
                                                ${msg.sender_type === 'user'
                                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.message}</p>
                                        </div>
                                        <div className={`text-[10px] mt-1 text-gray-400 flex items-center gap-1 ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <span>{msg.sender_name}</span>
                                            <span>•</span>
                                            <span>
                                                {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendReply} className="p-3 border-t bg-gray-50 flex gap-2 items-center">
                            <input
                                type="text"
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm"
                                placeholder="Responder ao suporte..."
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};
