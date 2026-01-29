# 🚀 Como Executar a Migração do Banco de Dados

## Passo a Passo

### 1. Acesse o Dashboard do Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Entre com sua conta
3. Selecione o projeto **Obra 360**

### 2. Execute a Migração SQL

1. No menu lateral, clique em **SQL Editor**
2. Clique em **+ New query**
3. Abra o arquivo `migrations/001_initial_schema.sql` deste projeto
4. **Copie todo o conteúdo** do arquivo
5. **Cole** no editor SQL do Supabase
6. Clique no botão **Run** (ou pressione Ctrl+Enter)

### 3. Verifique se funcionou

Após executar, você deve ver uma mensagem de sucesso. Para confirmar:

1. Vá em **Table Editor** no menu lateral
2. Você deve ver todas as tabelas criadas:
   - profiles
   - clients
   - deals
   - projects
   - project_phases
   - budget_line_items
   - materials
   - suppliers
   - procurement_orders
   - procurement_order_items
   - contractors
   - contracts
   - measurements
   - financial_records

### 4. Teste a Conexão

Após executar a migração:

1. Volte para o seu projeto React
2. Recarregue a página no navegador
3. O badge verde "✅ Conectado ao Supabase com sucesso!" deve aparecer

---

## 📊 Estrutura do Banco de Dados

A migração cria as seguintes tabelas:

### Usuários e Autenticação
- **profiles** - Perfis de usuários com roles (ADMIN, FINANCE, etc.)

### CRM
- **clients** - Clientes e leads
- **deals** - Negociações e vendas

### Gestão de Projetos
- **projects** - Projetos de construção
- **project_phases** - Fases dos projetos (Fundação, Estrutura, etc.)
- **budget_line_items** - Itens do orçamento por fase

### Inventário
- **materials** - Catálogo de materiais
- **suppliers** - Fornecedores

### Compras
- **procurement_orders** - Pedidos de compra
- **procurement_order_items** - Itens dos pedidos

### Contratos e Empreiteiros
- **contractors** - Empreiteiros e prestadores
- **contracts** - Contratos com empreiteiros
- **measurements** - Medições de serviços

### Financeiro
- **financial_records** - Contas a pagar e receber

---

## 🔐 Segurança

A migração já configura:

✅ **Row Level Security (RLS)** em todas as tabelas
✅ **Políticas básicas** para usuários autenticados
✅ **Índices** para melhor performance
✅ **Triggers** para atualizar `updated_at` automaticamente

---

## 🔄 Próximos Passos

Após executar a migração:

1. **Criar um usuário de teste** (via Authentication no Supabase)
2. **Testar as queries** no projeto React
3. **Configurar autenticação** no frontend
4. **Refinar as políticas RLS** conforme necessário

---

## ❓ Problemas?

Se encontrar erros ao executar a migração:

1. **Verifique se as extensões estão habilitadas** (uuid-ossp, pgcrypto)
2. **Certifique-se de estar no schema public**
3. **Execute os comandos em ordem** (não pule partes)
4. **Verifique os logs de erro** no SQL Editor

---

## 📝 Notas Importantes

- Esta migração usa **UUID** como chave primária (padrão Supabase)
- Todos os timestamps são em **UTC**
- As políticas RLS atuais permitem **acesso completo para usuários autenticados**
- Campos calculados (como `total`) são gerados automaticamente
