import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })

// Initialize Supabase with Service Role Key to bypass RLS
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        })
    }

    try {
        const { chunks } = await req.json() // Expect array of { title, content, doc_type, metadata }

        if (!chunks || !Array.isArray(chunks)) {
            throw new Error('Invalid input: "chunks" must be an array')
        }

        const results = []

        for (const chunk of chunks) {
            // 1. Generate Embedding
            const result = await embeddingModel.embedContent(chunk.content)
            const embedding = result.embedding.values

            // 2. Insert Chunk
            const { data: chunkData, error: chunkError } = await supabaseAdmin
                .from('ai_knowledge_chunks')
                .insert({
                    title: chunk.title,
                    content: chunk.content,
                    doc_type: chunk.doc_type,
                    metadata: chunk.metadata
                })
                .select()
                .single()

            if (chunkError) {
                console.error('Chunk Insert Error:', chunkError)
                results.push({ title: chunk.title, status: 'error', error: chunkError.message })
                continue
            }

            // 3. Insert Embedding
            const { error: embedError } = await supabaseAdmin
                .from('ai_embeddings')
                .insert({
                    chunk_id: chunkData.id,
                    embedding: JSON.stringify(embedding)
                })

            if (embedError) {
                console.error('Embedding Insert Error:', embedError)
                results.push({ title: chunk.title, status: 'error', error: embedError.message })
            } else {
                results.push({ title: chunk.title, status: 'success' })
            }
        }

        return new Response(
            JSON.stringify({ results }),
            { headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
