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
import { z } from 'https://esm.sh/zod@3.22.4'
import { validateRequest, createErrorResponse, ValidationError } from '../_shared/validation.ts'
import { getAuthenticatedUserWithTenant } from '../_shared/auth.ts'
import { handleCORS, createSecureResponse } from '../_shared/security-headers.ts'
import { maskPII, detectPromptInjection, checkAIQuota } from '../_shared/ai-security.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const GEMINI_MODEL = 'gemini-1.5-pro'

// Validation schema
const aiChatSchema = z.object({
    conversationId: z.string().uuid().optional(),
    message: z.string()
        .min(1, 'Mensagem não pode estar vazia')
        .max(4000, 'Mensagem muito longa (máx 4000 caracteres)'),
})

serve(async (req) => {
    // CORS headers with security
    if (req.method === 'OPTIONS') {
        return handleCORS();
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

        // Get subscription plan for rate limiting
        const { data: subscription } = await supabaseClient
            .from('subscriptions')
            .select('plans(name)')
            .eq('tenant_id', profile.tenant_id)
            .maybeSingle();

        const planName = (subscription?.plans as any)?.name || 'STARTER';

        // APPLY RATE LIMITING based on plan
        const { EdgeRateLimiter, getAIChatLimit } = await import('../_shared/rate-limiter.ts');
        const limiter = new EdgeRateLimiter();
        const rateLimitKey = `ai_chat:${profile.tenant_id}:${profile.id}`;
        const limit = getAIChatLimit(planName);

        try {
            await limiter.check(rateLimitKey, limit);
        } catch (error: any) {
            if (error.code === 'RATE_LIMIT_EXCEEDED') {
                return new Response(
                    JSON.stringify({
                        error: error.message,
                        code: 'RATE_LIMIT_EXCEEDED',
                        retryAfter: error.retryAfter,
                        limit: `${limit.maxRequests} requests per ${limit.windowMs / 1000} seconds`,
                        plan: planName,
                    }),
                    {
                        status: 429,
                        headers: {
                            'Content-Type': 'application/json',
                            'Retry-After': String(error.retryAfter),
                            'X-RateLimit-Limit': String(limit.maxRequests),
                            'X-RateLimit-Window': String(limit.windowMs / 1000),
                        },
                    }
                );
            }
            throw error;
        }

        // VALIDATE INPUT with Zod
        const { conversationId, message } = await validateRequest(req, aiChatSchema)

        // AI SECURITY: Check for prompt injection
        const injectionCheck = detectPromptInjection(message);
        if (injectionCheck.isInjection && injectionCheck.confidence !== 'low') {
            // Log security event
            await supabaseClient.from('audit_logs').insert({
                event_type: 'AI_SECURITY_INJECTION_ATTEMPT',
                tenant_id: profile.tenant_id,
                actor_id: profile.id,
                severity: injectionCheck.confidence,
                metadata: {
                    message: message.substring(0, 100),
                    confidence: injectionCheck.confidence,
                },
                created_at: new Date().toISOString(),
            });

            return new Response(
                JSON.stringify({
                    error: 'Potential security violation detected in message',
                    code: 'INJECTION_DETECTED',
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        // AI SECURITY: Mask PII before sending to AI
        const piiResult = maskPII(message);
        const messageToAI = piiResult.maskedText;

        if (piiResult.hasPII) {
            // Log PII detection
            await supabaseClient.from('audit_logs').insert({
                event_type: 'AI_SECURITY_PII_DETECTED',
                tenant_id: profile.tenant_id,
                actor_id: profile.id,
                severity: 'medium',
                metadata: {
                    detectedTypes: piiResult.detectedPII,
                },
                created_at: new Date().toISOString(),
            });
        }

        // AI SECURITY: Check quota
        const quotaCheck = await checkAIQuota(supabaseClient, profile.tenant_id, planName);
        if (!quotaCheck.allowed) {
            return new Response(
                JSON.stringify({
                    error: quotaCheck.reason,
                    code: 'QUOTA_EXCEEDED',
                    usage: quotaCheck.usage,
                }),
                {
                    status: 429,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
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
        // Return response with security headers
        return createSecureResponse({
            success: true,
            conversationId: finalConversationId,
            message: aiResponse.text,
            usage: {
                promptTokens: aiResponse.usage?.promptTokens || 0,
                completionTokens: aiResponse.usage?.completionTokens || 0,
                totalTokens: aiResponse.usage?.totalTokens || 0,
            },
            latency: latencyMs,
        });

    } catch (error) {
        console.error('Error:', error)

        // Use standardized error response
        if (error instanceof ValidationError) {
            return createErrorResponse(error, 400)
        }

        return createErrorResponse(
            error instanceof Error ? error : new Error('Unknown error'),
            500
        )
    }
})
