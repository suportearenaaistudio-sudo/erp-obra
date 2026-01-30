# 🚨 RLS Recursion - Troubleshooting Guide

## Problem Summary
O erro de **recursão infinita no RLS** persiste mesmo após múltiplas tentativas de correção.

##  Erro Atual
```
infinite recursion detected in policy for relation "users"
SQLSTATE: 42P17
```

## Root Cause
A policy `"Users see own tenant users"` na tabela `users` cria um loop:
```sql
CREATE POLICY "Users see own tenant users" ON public.users
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users  -- ❌ CONSULTA A PRÓPRIA TABELA!
      WHERE auth_user_id = auth.uid()
    )
  );
```

## Tentativas de Correção

### ❌ Tentativa 1: RLS_QUICK_FIX.sql
- Usou `SECURITY DEFINER` function
- **Falhou**: Recursão persistiu

### ❌ Tentativa 2: RLS_DEFINITIVE_FIX.sql  
- Criou `get_user_tenant_id()` com `SECURITY DEFINER` e `STABLE`
- **Falhou**: Recursão persistiu

### ⚠️ Tentativa 3: DISABLE_RLS_DEBUG.sql (Em teste)
- Desabilita RLS completamente nas tabelas `users` e `tenants`
- **Objetivo**: Confirmar que o problema é exclusivamente RLS

## Next Steps

### Se DISABLE_RLS_DEBUG funcionar:
1. ✅ Confirma que o problema é nas policies
2. ✅ Precisa refatorar a lógica de autenticação
3. ✅ Opções:
   - Usar session variables ao invés de subquery
   - Criar trigger que popula `current_tenant_id` em session
   - Usar Supabase funcões customizadas de autenticação

### Se DISABLE_RLS_DEBUG NÃO funcionar:
1. ❌ O problema pode estar em outro lugar
2. ❌ Pode ser cache de policies no Supabase
3. ❌ Pode precisar restart do banco

## Recommended Solution (Se RLS for confirmado)

```sql
-- 1. Criar função que usa auth.jwt() diretamente
CREATE OR REPLACE FUNCTION auth.user_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT tenant_id 
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$;

-- 2. Usar a função nas policies SEM subquery
CREATE POLICY "Users see own tenant users" ON public.users
  FOR SELECT
  USING (tenant_id = auth.user_tenant_id());
```

## Files Created
1. `RLS_QUICK_FIX.sql` - First attempt (failed)
2. `RLS_DEFINITIVE_FIX.sql` - Second attempt (failed)
3. `DISABLE_RLS_DEBUG.sql` - Debug solution (testing)
4. `RLS_TROUBLESHOOTING.md` - This file

## Impact
- ❌ Menu items (Finance, Inventory) hidden
- ❌ AI Chat returns 401 Unauthorized
- ❌ Dev Admin shows 0 users
- ❌ All features dependent on user profile fail
