/**
 * Supabase Edge Function: ai-chat
 * 
 * DEPLOY:
 * supabase functions deploy ai-chat
 * 
 * SET SECRETS:
 * supabase secrets set GEMINI_API_KEY=your_key_here
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const GEMINI_MODEL = 'gemini-1.5-pro'

serve(async (req) => {
    // CORS headers
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        })
    }

    try {
        // Get user from auth header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        )

        // Get authenticated user
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Get user profile
        const { data: profile } = await supabaseClient
            .from('users')
            .select('id, name, email, tenant_id')
            .eq('auth_user_id', user.id)
            .single()

        if (!profile) {
            return new Response(JSON.stringify({ error: 'User profile not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Parse request body
        const { conversationId, message } = await req.json()

        if (!message) {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        const startTime = Date.now()

        // Load or create conversation
        let conversation
        if (conversationId) {
            const { data } = await supabaseClient
                .from('ai_conversations')
                .select('*')
                .eq('id', conversationId)
                .eq('user_id', profile.id)
                .single()
            conversation = data
        } else {
            const { data } = await supabaseClient
                .from('ai_conversations')
                .insert({
                    tenant_id: profile.tenant_id,
                    user_id: profile.id,
                    assistant_type: 'system',
                    title: message.substring(0, 50),
                })
                .select()
                .single()
            conversation = data
        }

        // Load message history
        const { data: messages } = await supabaseClient
            .from('ai_messages')
            .select('role, content')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true })
            .limit(10)

        // Build chat history
        const history = messages || []

        // Save user message
        await supabaseClient.from('ai_messages').insert({
            conversation_id: conversation.id,
            role: 'user',
            content: message,
        })

        // Call Gemini API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    text: `Você é um assistente do sistema Obra360 ERP para construção civil.
                  
Contexto do usuário:
- Nome: ${profile.name}
- Email: ${profile.email}
- Tenant ID: ${profile.tenant_id}

Histórico:
${history.map((h) => `${h.role}: ${h.content}`).join('\n')}

Mensagem atual: ${message}

Responda de forma clara e objetiva. Use emojis quando apropriado.`,
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                    },
                    safetySettings: [
                        {
                            category: 'HARM_CATEGORY_HARASSMENT',
                            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                        },
                        {
                            category: 'HARM_CATEGORY_HATE_SPEECH',
                            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                        },
                    ],
                }),
            }
        )

        if (!geminiResponse.ok) {
            throw new Error('Gemini API error: ' + (await geminiResponse.text()))
        }

        const geminiData = await geminiResponse.json()
        const aiMessage =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
            'Desculpe, não consegui processar sua mensagem.'

        // Save AI response
        await supabaseClient.from('ai_messages').insert({
            conversation_id: conversation.id,
            role: 'assistant',
            content: aiMessage,
        })

        // Log audit
        const latency = Date.now() - startTime
        await supabaseClient.from('ai_audit_logs').insert({
            tenant_id: profile.tenant_id,
            user_id: profile.id,
            conversation_id: conversation.id,
            prompt_tokens: geminiData.usageMetadata?.promptTokenCount || 0,
            completion_tokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: geminiData.usageMetadata?.totalTokenCount || 0,
            latency_ms: latency,
            tool_calls_count: 0,
            safety_blocked: false,
        })

        return new Response(
            JSON.stringify({
                conversationId: conversation.id,
                message: aiMessage,
                metadata: {
                    tokensUsed: geminiData.usageMetadata?.totalTokenCount || 0,
                    latencyMs: latency,
                },
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({
                error: error.message || 'Internal server error',
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    }
})
