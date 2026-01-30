-- =============================================
-- MIGRATION 019: Apply Feature Guard RLS
-- =============================================
-- Aplica políticas RESTRICTIVE para bloquear acesso
-- a tabelas de módulos quando a feature está desabilitada.
--
-- NOTA: Políticas AS RESTRICTIVE funcionam como um "E" (AND).
-- Todas as políticas restritivas devem passar, além de pelo menos uma permissiva.
-- =============================================

-- 1. Helper function para pegar tenant_id da sessão ou do JWT
--    Já temos get_user_tenant_id() ou usamos session param?
--    O wrapper usa set_config('app.tenant_id', ...).
--    O tenant_has_feature espera tenant_id.
--    Vamos criar um wrapper ou usar casting direto na policy.
--    Melhor usar (select auth.uid()) para pegar tenant_id via users table, 
--    pois app.tenant_id pode não estar setado em chamadas diretas via client.

-- Recriando função helper se necessário para garantir performance e segurança
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


-- 2. PROCUREMENT (Compras)
-- Tabela: procurement_orders
DROP POLICY IF EXISTS "Feature Guard: PROCUREMENT" ON public.procurement_orders;
CREATE POLICY "Feature Guard: PROCUREMENT" ON public.procurement_orders
    AS RESTRICTIVE
    FOR ALL
    TO authenticated
    USING (
        public.tenant_has_feature(public.get_current_tenant_id(), 'PROCUREMENT')
    );

-- Tabela: procurement_order_items (cascata lógica, mas bom garantir)
DROP POLICY IF EXISTS "Feature Guard: PROCUREMENT" ON public.procurement_order_items;
CREATE POLICY "Feature Guard: PROCUREMENT" ON public.procurement_order_items
    AS RESTRICTIVE
    FOR ALL
    TO authenticated
    USING (
        public.tenant_has_feature(public.get_current_tenant_id(), 'PROCUREMENT')
    );


-- 3. INVENTORY (Estoque)
-- Tabela: materials
DROP POLICY IF EXISTS "Feature Guard: INVENTORY" ON public.materials;
CREATE POLICY "Feature Guard: INVENTORY" ON public.materials
    AS RESTRICTIVE
    FOR ALL
    TO authenticated
    USING (
        public.tenant_has_feature(public.get_current_tenant_id(), 'INVENTORY')
    );

-- 4. FINANCE (Financeiro)
-- Tabela: financial_records
DROP POLICY IF EXISTS "Feature Guard: FINANCE" ON public.financial_records;
CREATE POLICY "Feature Guard: FINANCE" ON public.financial_records
    AS RESTRICTIVE
    FOR ALL
    TO authenticated
    USING (
        public.tenant_has_feature(public.get_current_tenant_id(), 'FINANCE')
    );

-- 5. CRM (Vendas)
-- Tabela: deals
DROP POLICY IF EXISTS "Feature Guard: CRM" ON public.deals;
CREATE POLICY "Feature Guard: CRM" ON public.deals
    AS RESTRICTIVE
    FOR ALL
    TO authenticated
    USING (
        public.tenant_has_feature(public.get_current_tenant_id(), 'CRM')
    );

-- Tabela: clients (Clientes costumam ser CRM, mas as vezes compartilhados com Obras)
-- Se CRM for desligado, ainda precisa de clientes para Obras?
-- Vamos assumir que CRM é o módulo principal de clientes.
DROP POLICY IF EXISTS "Feature Guard: CRM" ON public.clients;
CREATE POLICY "Feature Guard: CRM" ON public.clients
    AS RESTRICTIVE
    FOR ALL
    TO authenticated
    USING (
        public.tenant_has_feature(public.get_current_tenant_id(), 'CRM')
    );


-- 6. WORKS (Obras) - geralmente core, mas pode ser feature
-- Tabela: projects
-- Se WORKS for parte do plano básico, ok. Se for feature 'WORKS':
-- Vamos deixar comentado ou aplicar se tiver certeza da key.
-- Assumindo que WORKS é core, não aplicamos guard restritivo, ou aplicamos feature 'PROJECTS'.
-- Deixaremos sem por enquanto para não bloquear o core, focar nos módulos extras.

-- 7. AI_CAHT / AI_SUPPORT (Features de IA)
-- Geralmente não tem tabelas restritas, mas sim uso de funções.
-- Se houver tabela de chat_history, aplicar.

