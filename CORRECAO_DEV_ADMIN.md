# 🔧 CORREÇÃO: Dev Admin não vê tenants

## ❌ **PROBLEMA**
A página Dev Admin mostra "Nenhum tenant encontrado" porque as **RLS policies** estão bloqueando o acesso.

## ✅ **SOLUÇÃO**
Executar a migration `013_dev_admin_permissions.sql` que dá permissões especiais aos Dev Admins.

---

## 🚀 **COMO CORRIGIR (2 Passos)**

### **PASSO 1: Executar Migration no Supabase Dashboard**

1. **Acesse:** https://supabase.com/dashboard
2. **Selecione** o projeto **Obra 360**
3. **Vá em:** SQL Editor → + New query
4. **Abra o arquivo:** `supabase/migrations/013_dev_admin_permissions.sql`
5. **Copie TODO o conteúdo**
6. **Cole** no editor SQL
7. **Clique em RUN** (Ctrl+Enter)
8. **Aguarde** a mensagem de sucesso ✅

### **PASSO 2: Recarregar a Página**

1. **Volte para:** http://localhost:5173/#/dev-admin
2. **Recarregue a página** (F5)
3. **Vá na aba "Tenants"**
4. ✅ **Agora você deve ver todos os tenants!**

---

## 📋 **O QUE A MIGRATION FAZ**

A migration cria:

1. ✅ **Função `is_dev_admin()`** - Verifica se o email é de um Dev Admin
2. ✅ **Policies para tenants** - Dev Admins podem ver todos
3. ✅ **Policies para users** - Dev Admins podem ver todos
4. ✅ **Policies para subscriptions** - Dev Admins podem ver e editar
5. ✅ **Policies para feature_overrides** - Dev Admins podem criar/editar/deletar
6. ✅ **Policies para plans, features, roles, projects** - Dev Admins podem ver

---

## 🎯 **EMAILS DE DEV ADMINS**

Os seguintes emails têm acesso de Dev Admin:
- `admin@obra360.com`
- `suporte@obra360.com`
- `vitorpradotamos@gmail.com`
- `marcospaulotrindade3@gmail.com`

**Se você usa outro email**, adicione na migration:

```sql
RETURN auth.jwt() ->> 'email' IN (
  'admin@obra360.com',
  'suporte@obra360.com',
  'vitorpradotamos@gmail.com',
  'marcospaulotrindade3@gmail.com',
  'SEU_EMAIL_AQUI@gmail.com'  -- Adicione aqui
);
```

---

## 🧪 **COMO TESTAR**

Depois de executar a migration:

1. **Recarregue** a página `/dev-admin`
2. **Vá na aba "Tenants"**
3. **Você deve ver:**
   - ✅ Lista de todos os tenants
   - ✅ Informações de cada tenant
   - ✅ Botão "Ver Detalhes" funcionando

4. **Clique em "Ver Detalhes":**
   - ✅ Veja usuários do tenant
   - ✅ Veja features
   - ✅ Botões de habilitar/desabilitar funcionam

---

## 🆘 **PROBLEMAS COMUNS**

### **"Ainda não vejo os tenants"**
➡️ Verifique se você está logado com um email de Dev Admin
➡️ Faça logout e login novamente
➡️ Verifique se a migration foi executada com sucesso

### **"Erro ao executar migration"**
➡️ Verifique se todas as tabelas existem
➡️ Execute as migrations anteriores primeiro (001 a 012)

### **"Meu email não é Dev Admin"**
➡️ Adicione seu email na função `is_dev_admin()`
➡️ Execute a migration novamente

---

## ✅ **CHECKLIST**

- [ ] Abrir Supabase Dashboard
- [ ] Ir em SQL Editor
- [ ] Copiar conteúdo de `013_dev_admin_permissions.sql`
- [ ] Colar e executar
- [ ] Ver mensagem de sucesso
- [ ] Recarregar página `/dev-admin`
- [ ] Ver lista de tenants ✅

---

**Execute a migration agora e me avise se funcionou!** 🚀
