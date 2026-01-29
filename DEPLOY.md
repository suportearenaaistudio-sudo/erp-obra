# 🚀 Guia de Deploy - Obra360

Este documento contém instruções completas para fazer deploy do Obra360 na plataforma Vercel.

## 📋 Pré-requisitos

Antes de iniciar o deploy, certifique-se de ter:

- ✅ Conta na [Vercel](https://vercel.com) (pode usar login do GitHub)
- ✅ Projeto Supabase configurado e rodando
- ✅ Variáveis de ambiente do Supabase (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`)
- ✅ Código commitado e enviado para um repositório Git (GitHub, GitLab ou Bitbucket)

## 🎯 Método Recomendado: Deploy via GitHub

Este é o método mais simples e recomendado, com deploy automático a cada push.

### Passo 1: Preparar o Repositório

```bash
# Se ainda não fez, faça commit das alterações
git add .
git commit -m "Preparar projeto para deploy na Vercel"
git push origin main
```

### Passo 2: Importar Projeto na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New Project"**
3. Selecione **"Import Git Repository"**
4. Escolha o repositório `obra360`
5. A Vercel detectará automaticamente que é um projeto **Vite**

### Passo 3: Configurar Variáveis de Ambiente

Na tela de configuração:

1. Expanda a seção **"Environment Variables"**
2. Adicione as seguintes variáveis (uma por vez):

| Nome | Valor | Onde Obter |
|------|-------|------------|
| `VITE_SUPABASE_URL` | `https://seu-projeto.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Dashboard → Settings → API → anon public key |
| `GEMINI_API_KEY` | (opcional) | Google AI Studio (se usar IA) |

> **⚠️ IMPORTANTE**: Certifique-se de copiar os valores corretos do seu arquivo `.env.local` local.

### Passo 4: Deploy

1. Clique em **"Deploy"**
2. Aguarde 1-2 minutos enquanto a Vercel:
   - Instala as dependências (`npm install`)
   - Executa o build (`npm run build`)
   - Faz deploy do projeto

3. Quando concluído, você verá uma tela de sucesso com a URL do projeto! 🎉

### Passo 5: Testar o Deploy

1. Clique na URL fornecida (ex: `obra360.vercel.app`)
2. Teste as seguintes funcionalidades:
   - ✅ Página inicial carrega corretamente
   - ✅ Login/Cadastro funcionam
   - ✅ Navegação entre páginas
   - ✅ Dados do Supabase são carregados
   - ✅ Sem erros no console do navegador (F12)

---

## 🔧 Método Alternativo: Deploy via CLI

Para usuários avançados que preferem linha de comando.

### Passo 1: Instalar Vercel CLI

```bash
npm i -g vercel
```

### Passo 2: Login na Vercel

```bash
vercel login
```

### Passo 3: Deploy

```bash
# No diretório do projeto
cd c:\Users\vitor\Downloads\obra360

# Primeiro deploy (modo interativo)
vercel

# Siga o prompt:
# - Set up and deploy? Yes
# - Which scope? Selecione sua conta
# - Link to existing project? No
# - What's your project's name? obra360
# - In which directory is your code located? ./
# - Want to override settings? No
```

### Passo 4: Configurar Variáveis de Ambiente

```bash
# Adicionar variável VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_URL

# Quando solicitado:
# - Environment: Production, Preview, Development (selecione os necessários)
# - Value: cole sua URL do Supabase

# Repetir para VITE_SUPABASE_ANON_KEY
vercel env add VITE_SUPABASE_ANON_KEY
```

### Passo 5: Deploy de Produção

```bash
vercel --prod
```

---

## 🔄 Deploy Automático (GitHub)

Após o primeiro deploy via GitHub, toda vez que você fizer push para o repositório:

- **Push para `main`**: Deploy automático para **Produção**
- **Push para outras branches**: Deploy automático para **Preview** (URL temporária)

### Workflow Típico

```bash
# Fazer alterações no código
git add .
git commit -m "Descrição das mudanças"
git push origin main

# A Vercel detecta automaticamente e faz deploy
# Você receberá notificação quando concluir
```

---

## 🐛 Troubleshooting

### Build falha com erro "Cannot find module"

**Solução**: Verificar se todas as dependências estão no `package.json`

```bash
# Local
npm install
npm run build

# Se funcionar local, o problema pode ser cache da Vercel
# No dashboard: Settings → General → Clear Cache and Redeploy
```

### Página em branco após deploy

**Causas comuns**:
1. **Variáveis de ambiente não configuradas**
   - Verificar em: Vercel Dashboard → Settings → Environment Variables
   - Garantir que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretas

2. **Erro de roteamento SPA**
   - Verificar se `vercel.json` existe e contém as rewrites corretas

3. **Erros no console**
   - Abrir DevTools (F12) → Console
   - Verificar mensagens de erro
   - Checar na aba Network se assets estão carregando

### Erro 404 ao navegar para rotas

**Solução**: Verificar arquivo `vercel.json`

O arquivo deve conter:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Dados do Supabase não carregam

**Verificações**:
1. URL e chave estão corretas nas variáveis de ambiente?
2. Projeto Supabase está ativo (não pausado)?
3. RLS (Row Level Security) está configurado corretamente?
4. Verificar logs da Vercel: Dashboard → Deployment → Logs

### Rebuild e Clear Cache

Se tudo mais falhar:

1. Acesse Vercel Dashboard → seu projeto
2. Settings → General
3. Clique em **"Redeploy"** ou **"Clear Cache and Redeploy"**

---

## 📊 Monitoramento

### Logs em Tempo Real

```bash
vercel logs <deployment-url> --follow
```

### Analytics

- Acesse: Vercel Dashboard → seu projeto → Analytics
- Visualize: Page views, visitantes, performance

### Notificações

Configure notificações no Vercel Dashboard para receber alertas de:
- Deploy concluído
- Falhas de build
- Erros de runtime

---

## 🔗 Links Úteis

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Supabase Dashboard](https://supabase.com/dashboard)

---

## 🎉 Próximos Passos

Após o deploy bem-sucedido:

1. **Custom Domain** (Opcional)
   - Vercel Dashboard → Settings → Domains
   - Adicionar seu domínio personalizado

2. **HTTPS Automático**
   - Vercel fornece SSL gratuito automaticamente
   - Nenhuma configuração necessária

3. **Monitorar Performance**
   - Use Vercel Analytics
   - Configure alertas para erros

4. **Continuous Deployment**
   - Seu workflow agora é: code → commit → push → deploy automático! 🚀

---

**Desenvolvido com ❤️ para Obra360**
