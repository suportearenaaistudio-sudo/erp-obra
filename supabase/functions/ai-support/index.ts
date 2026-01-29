/**
 * Supabase Edge Function: ai-support
 * 
 * Handles Support Bot conversations with RAG (Retrieval Augmented Generation).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const GEMINI_MODEL = 'gemini-1.5-pro'
const EMBEDDING_MODEL = 'embedding-001'

// Helper: Cosine Similarity
function cosineSimilarity(a: number[], b: number[]) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
}

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
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Invalid token')

        const { data: profile } = await supabaseClient
            .from('users')
            .select('id, name, email, tenant_id')
            .eq('auth_user_id', user.id)
            .single()

        const { conversationId, message } = await req.json()
        const startTime = Date.now()

        // 1. Generate Embedding for Query
        const embedResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: { parts: [{ text: message }] }
                })
            }
        )
        const embedData = await embedResponse.json()
        const queryEmbedding = embedData.embedding?.values

        let contextText = ""

        // 2. Perform Retrieval (RAG)
        if (queryEmbedding) {
            // Fetch all chunks (naive approach for small KB, ideally use pgvector)
            const { data: allChunks } = await supabaseClient
                .from('ai_embeddings')
                .select('chunk_id, embedding, chunk:ai_knowledge_chunks(title, content)')
                .limit(200)

            if (allChunks) {
                // Calculate similarity
                const scoredChunks = allChunks.map(item => ({
                    ...item,
                    score: cosineSimilarity(queryEmbedding, JSON.parse(item.embedding))
                }))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3) // Top 3 relevant chunks

                contextText = scoredChunks.map(c =>
                    `-- ${c.chunk.title} --\n${c.chunk.content}`
                ).join('\n\n')
            }
        }

        // 3. Load Conversation
        let conversation
        if (conversationId) {
            const { data } = await supabaseClient
                .from('ai_conversations')
                .select('*')
                .eq('id', conversationId)
                .single()
            conversation = data
        } else {
            const { data } = await supabaseClient
                .from('ai_conversations')
                .insert({
                    tenant_id: profile.tenant_id,
                    user_id: profile.id,
                    assistant_type: 'support',
                    title: message.substring(0, 50),
                })
                .select()
                .single()
            conversation = data
        }

        // 4. Save User Message
        await supabaseClient.from('ai_messages').insert({
            conversation_id: conversation.id,
            role: 'user',
            content: message,
        })

        // 5. Build System Prompt with Context
        const systemPrompt = `Você é o Suporte Inteligente do Obra360.
Seu objetivo é ajudar o usuário com dúvidas sobre o sistema e resolver problemas comuns.

CONTEXTO DO USUÁRIO:
Nome: ${profile.name}
Email: ${profile.email}

BASE DE CONHECIMENTO (Use isso para responder):
${contextText || "Nenhuma informação relevante encontrada na base de conhecimento."}

DIRETRIZES:
1. Responda com base APENAS na Base de Conhecimento fornecida acima.
2. Se a informação não estiver lá, diga que não sabe e ofereça para abrir um ticket (handoff).
3. Seja educado, profissional e conciso.
4. Se o usuário relatar um "bug" ou "erro", sugira abrir um ticket imediatamente.
5. Use formatação Markdown (negrito, listas) para facilitar a leitura.
`

        // 6. Call Gemini
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: systemPrompt }] },
                        { role: 'user', parts: [{ text: message }] } // Send message again as user turn? Or just rely on system? Better prompt structure:
                        // Actually, best practice: System instruction -> History -> Current Message.
                        // But since this is a simple turn-based without keeping full history in context used here (for simplicity of this example),
                        // I'll send System + Message.
                    ],
                    generationConfig: { temperature: 0.3 }, // Lower temperature for support
                })
            }
        )

        if (!geminiResponse.ok) {
            throw new Error('Gemini API Error: ' + await geminiResponse.text())
        }

        const geminiResult = await geminiResponse.json()
        const aiMessage = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar."

        // 7. Save AI Response
        await supabaseClient.from('ai_messages').insert({
            conversation_id: conversation.id,
            role: 'assistant',
            content: aiMessage,
        })

        // 8. Audit
        await supabaseClient.from('ai_audit_logs').insert({
            tenant_id: profile.tenant_id,
            user_id: profile.id,
            conversation_id: conversation.id,
            latency_ms: Date.now() - startTime,
            total_tokens: geminiResult.usageMetadata?.totalTokenCount || 0,
        })

        return new Response(
            JSON.stringify({
                conversationId: conversation.id,
                message: aiMessage
            }),
            { headers: { 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
