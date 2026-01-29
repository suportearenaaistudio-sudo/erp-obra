/**
 * AIChat Component
 * 
 * Floating AI Assistant widget (System Assistant)
 * Positioned separately from Support Chat
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAIChat } from '@/hooks/useAIChat';
import { Sparkles, X, Send, Loader, AlertCircle } from 'lucide-react';

export const AIChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, loading, error, sendMessage, clearConversation } = useAIChat();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const messageText = input;
        setInput('');
        await sendMessage(messageText);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-28 z-50"
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.5)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
                }}
            >
                <Sparkles size={28} />
            </button>

            {/* Chat Modal */}
            {isOpen && (
                <div
                    className="fixed bottom-28 right-28 z-50"
                    style={{
                        width: '420px',
                        height: '650px',
                        background: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: '20px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <div>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                                ✨ Assistente IA
                            </h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
                                Powered by Gemini
                            </p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            background: '#f8f9fa',
                        }}
                    >
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                                <Sparkles size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
                                    Olá! Como posso ajudar?
                                </p>
                                <p style={{ fontSize: '14px', opacity: 0.7 }}>
                                    Pergunte sobre suas obras, clientes, estoque...
                                </p>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                style={{
                                    marginBottom: '16px',
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: '80%',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        background: msg.role === 'user'
                                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                            : 'white',
                                        color: msg.role === 'user' ? 'white' : '#333',
                                        boxShadow: msg.role === 'assistant' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                    }}
                                >
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                                    {/* Tool calls indicator */}
                                    {msg.tool_calls && msg.tool_calls.length > 0 && (
                                        <details style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                                            <summary style={{ cursor: 'pointer' }}>
                                                🔧 {msg.tool_calls.length} ferramenta(s) usada(s)
                                            </summary>
                                            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                                                {msg.tool_calls.map((tc: any, j: number) => (
                                                    <li key={j}>{tc.name}</li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#667eea' }}>
                                <Loader size={16} className="animate-spin" />
                                <span style={{ fontSize: '14px' }}>Pensando...</span>
                            </div>
                        )}

                        {error && (
                            <div
                                style={{
                                    padding: '12px',
                                    background: '#fee',
                                    border: '1px solid #fcc',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'start',
                                    fontSize: '14px',
                                    color: '#c00',
                                }}
                            >
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div
                        style={{
                            padding: '16px',
                            borderTop: '1px solid #e0e0e0',
                            background: 'white',
                            display: 'flex',
                            gap: '12px',
                        }}
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Pergunte algo..."
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                border: '1px solid #ddd',
                                borderRadius: '12px',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            style={{
                                padding: '12px 16px',
                                background: loading || !input.trim()
                                    ? '#ccc'
                                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'opacity 0.2s',
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>

                    {/* New conversation button */}
                    {messages.length > 0 && (
                        <div style={{ padding: '0 16px 16px', background: 'white' }}>
                            <button
                                onClick={clearConversation}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    background: 'transparent',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: '#666',
                                    cursor: 'pointer',
                                }}
                            >
                                🔄 Nova conversa
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};
