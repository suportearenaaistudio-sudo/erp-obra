# 🔗 Configuração do Supabase - Obra360

## 📁 Arquivos Criados

### 1. `lib/supabase.ts`
Cliente principal do Supabase. Use-o para fazer queries:

```typescript
import { supabase } from './lib/supabase'

// Exemplo: buscar todas as empresas
const { data, error } = await supabase
  .from('empresas')
  .select('*')
```

### 2. `lib/database.types.ts`
Tipos TypeScript do banco de dados. Será atualizado quando você criar tabelas.

### 3. `hooks/useSupabase.ts`
Hooks React prontos para usar:

```typescript
// Hook de autenticação
import { useSupabaseAuth } from './hooks/useSupabase'

function MyComponent() {
  const { user, loading } = useSupabaseAuth()
  
  if (loading) return <div>Carregando...</div>
  if (!user) return <div>Faça login</div>
  
  return <div>Olá, {user.email}!</div>
}

// Hook de query
import { useSupabaseQuery } from './hooks/useSupabase'

function MyList() {
  const { data, loading, error } = useSupabaseQuery('empresas', {
    select: '*',
    order: { column: 'nome', ascending: true }
  })
  
  if (loading) return <div>Carregando...</div>
  if (error) return <div>Erro: {error}</div>
  
  return <ul>{data?.map(item => <li key={item.id}>{item.nome}</li>)}</ul>
}
```

### 4. `components/SupabaseTest.tsx`
Componente para testar a conexão. Adicione no seu App:

```typescript
import { SupabaseTest } from './components/SupabaseTest'

function App() {
  return (
    <>
      <SupabaseTest />
      {/* resto do app */}
    </>
  )
}
```

---

## ⚙️ Configuração (Próximos Passos)

### 1. Configure o .env.local

Edite o arquivo `.env.local` e adicione suas credenciais:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 2. Obtenha as credenciais

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto "Obra360"
3. Vá em **Settings** > **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 3. Reinicie o servidor

Após editar o `.env.local`:

```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

### 4. Teste a conexão

Adicione o componente `<SupabaseTest />` no seu App e veja se aparece ✅ verde.

---

## 🗄️ Próximos Passos: Criar Tabelas

### Opção 1: Pelo Dashboard do Supabase (Mais fácil)

1. Acesse seu projeto no [dashboard](https://supabase.com/dashboard)
2. Vá em **Table Editor**
3. Clique em **New Table**
4. Crie suas tabelas (empresas, projetos, etc.)

### Opção 2: Via SQL (Mais avançado)

1. No dashboard, vá em **SQL Editor**
2. Execute suas migrations:

```sql
-- Exemplo: Tabela de empresas
CREATE TABLE empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Política básica (permitir leitura pública por enquanto)
CREATE POLICY "Permitir leitura pública" ON empresas
  FOR SELECT USING (true);
```

---

## 🔐 Autenticação (Recomendado)

### Configurar Email/Password

1. No dashboard: **Authentication** > **Providers**
2. Habilite **Email**
3. Use o hook `useSupabaseAuth` no seu app

### Exemplo de Login

```typescript
import { supabase } from './lib/supabase'

async function handleLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    console.error('Erro:', error.message)
  } else {
    console.log('Logado!', data.user)
  }
}
```

---

## 📚 Recursos

- [Documentação Supabase](https://supabase.com/docs)
- [Guia React + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [SQL Tutorial](https://supabase.com/docs/guides/database/overview)

---

## ❓ Problemas Comuns

### Erro: "Invalid API key"
- Verifique se copiou a chave correta (anon, não service_role)
- Verifique espaços extras no .env.local

### Variáveis não carregam
- Variáveis devem começar com `VITE_` para serem expostas
- Reinicie o servidor após editar .env.local

### Erro de CORS
- Verifique se a URL está correta
- Certifique-se de que o projeto Supabase está ativo
