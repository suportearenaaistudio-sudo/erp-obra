# Deploy da Edge Function AI Chat

## Pré-requisitos
- Supabase CLI instalado
- Projeto Supabase conectado

## 1. Instalar Supabase CLI (se não tiver)
```bash
npm install -g supabase
```

## 2. Login no Supabase
```bash
supabase login
```

## 3. Conectar ao projeto
```bash
supabase link --project-ref oburpzmvkpncaeaimue
h
```

## 4. Configurar a chave do Gemini como secret
```bash
supabase secrets set GEMINI_API_KEY=SUA_CHAVE_AQUI
```

## 5. Deploy da função
```bash
supabase functions deploy ai-chat
```

## 6. Testar
Depois do deploy, a função estará disponível em:
```
https://oburpzmvkpncaeaimueh.supabase.co/functions/v1/ai-chat
```

O frontend já está configurado para chamar automaticamente!

## Troubleshooting

### Erro: "Project not linked"
```bash
supabase link --project-ref oburpzmvkpncaeaimueh
```

### Erro: "Not logged in"
```bash
supabase login
```

### Ver logs da função
```bash
supabase functions logs ai-chat
```
