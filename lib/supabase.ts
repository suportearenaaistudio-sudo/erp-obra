import { createClient } from '@supabase/supabase-js'

// Obtém as variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Valida se as credenciais existem
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        '❌ Faltam as variáveis de ambiente do Supabase!\n' +
        'Verifique se você configurou:\n' +
        '- VITE_SUPABASE_URL\n' +
        '- VITE_SUPABASE_ANON_KEY\n' +
        'no arquivo .env.local'
    )
}

// Cria e exporta o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
})

// Helper para verificar a conexão
export async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('_health_check').select('count')

        // Se o erro for de tabela não existente, significa que a conexão está OK
        // Supabase pode retornar diferentes mensagens de erro dependendo da versão
        if (error && (
            error.message.includes('does not exist') ||
            error.message.includes('not find') ||
            error.message.includes('schema cache')
        )) {
            return { connected: true, message: '✅ Conexão com Supabase estabelecida!' }
        }

        if (error) {
            return { connected: false, message: `❌ Erro: ${error.message}` }
        }

        return { connected: true, message: '✅ Conexão com Supabase estabelecida!' }
    } catch (error) {
        return {
            connected: false,
            message: `❌ Erro de conexão: ${error instanceof Error ? error.message : 'Desconhecido'}`
        }
    }
}
