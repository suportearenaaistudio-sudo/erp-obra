/**
 * useAIChat Hook (Supabase Edge Functions version)
 * 
 * Custom hook for System Assistant chat
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    tool_calls?: any[];
    created_at?: string;
}

interface UseAIChatReturn {
    messages: Message[];
    loading: boolean;
    error: string | null;
    sendMessage: (message: string) => Promise<void>;
    loadMessages: (conversationId: string) => Promise<void>;
    clearConversation: () => void;
    currentConversationId: string | null;
}

export function useAIChat(): UseAIChatReturn {
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = useCallback(async (message: string) => {
        if (!message.trim()) return;

        setLoading(true);
        setError(null);

        // Add user message optimistically
        const userMessage: Message = {
            role: 'user',
            content: message,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            // Call Supabase Edge Function
            const { data, error: invokeError } = await supabase.functions.invoke('ai-chat', {
                body: {
                    conversationId: currentConversationId,
                    message,
                },
            });

            if (invokeError) {
                throw new Error(invokeError.message || 'Failed to send message');
            }

            // Update conversation ID if new
            if (!currentConversationId && data.conversationId) {
                setCurrentConversationId(data.conversationId);
            }

            // Add assistant response
            const assistantMessage: Message = {
                role: 'assistant',
                content: data.message || 'Sem resposta',
                tool_calls: data.toolCalls,
                created_at: new Date().toISOString(),
            };

            setMessages(prev => [...prev, assistantMessage]);

        } catch (err: any) {
            console.error('Error sending message:', err);
            setError(err.message || 'Failed to send message');

            // Remove optimistic user message on error
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setLoading(false);
        }
    }, [currentConversationId]);

    const loadMessages = useCallback(async (conversationId: string) => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('ai_messages')
                .select('role, content, tool_calls, created_at')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;

            setMessages(data as Message[]);
            setCurrentConversationId(conversationId);

        } catch (err: any) {
            console.error('Error loading messages:', err);
            setError(err.message || 'Failed to load messages');
        } finally {
            setLoading(false);
        }
    }, []);

    const clearConversation = useCallback(() => {
        setCurrentConversationId(null);
        setMessages([]);
        setError(null);
    }, []);

    return {
        messages,
        loading,
        error,
        sendMessage,
        loadMessages,
        clearConversation,
        currentConversationId,
    };
}
