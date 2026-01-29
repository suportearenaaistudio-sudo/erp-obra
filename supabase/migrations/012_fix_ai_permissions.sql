-- Migration 012: Fix AI Permissions
-- Correção de permissões para service_role garantindo que a Edge Function possa escrever

DO $$
BEGIN
    -- 1. Policies para ai_knowledge_chunks
    -- Remover policy antiga se existir para recriar correta
    DROP POLICY IF EXISTS "Service role manages knowledge" ON public.ai_knowledge_chunks;
    
    -- Criar policy permissiva para service_role
    -- Nota: Usamos execute dynamic SQL para evitar erros se a tabela não existir (embora deva existir)
    -- e para encapsular comando CREATE POLICY dentro do bloco DO
    EXECUTE 'CREATE POLICY "Service role manages knowledge" ON public.ai_knowledge_chunks
             FOR ALL TO service_role
             USING (true) WITH CHECK (true)';

    -- 2. Policies para ai_embeddings
    DROP POLICY IF EXISTS "Service role manages embeddings" ON public.ai_embeddings;
    
    EXECUTE 'CREATE POLICY "Service role manages embeddings" ON public.ai_embeddings
             FOR ALL TO service_role
             USING (true) WITH CHECK (true)';

    -- 3. Grant explícito (redundancia de segurança)
    GRANT ALL ON public.ai_knowledge_chunks TO service_role;
    GRANT ALL ON public.ai_embeddings TO service_role;

    RAISE NOTICE '✅ Permissions fixed for service_role';
END $$;
