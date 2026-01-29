import { useEffect, useState } from 'react'
import { checkSupabaseConnection } from '../lib/supabase'

export function SupabaseTest() {
    const [status, setStatus] = useState<{
        loading: boolean
        connected: boolean
        message: string
    }>({
        loading: true,
        connected: false,
        message: 'Testando conexão com Supabase...'
    })

    useEffect(() => {
        async function testConnection() {
            try {
                const result = await checkSupabaseConnection()
                setStatus({
                    loading: false,
                    connected: result.connected,
                    message: result.message
                })
            } catch (error) {
                setStatus({
                    loading: false,
                    connected: false,
                    message: `❌ Erro ao testar: ${error instanceof Error ? error.message : 'Desconhecido'}`
                })
            }
        }

        testConnection()
    }, [])

    return (
        <div
            style={{
                padding: '20px',
                margin: '20px',
                borderRadius: '8px',
                background: status.loading
                    ? '#f0f0f0'
                    : status.connected
                        ? '#d4edda'
                        : '#f8d7da',
                border: `2px solid ${status.loading
                        ? '#ccc'
                        : status.connected
                            ? '#28a745'
                            : '#dc3545'
                    }`,
                fontFamily: 'monospace',
                fontSize: '14px'
            }}
        >
            <h3 style={{ margin: '0 0 10px 0' }}>
                {status.loading ? '⏳' : status.connected ? '✅' : '❌'} Teste de Conexão Supabase
            </h3>
            <p style={{ margin: 0 }}>{status.message}</p>

            {!status.loading && !status.connected && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#721c24' }}>
                    <strong>Dicas:</strong>
                    <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                        <li>Verifique se suas credenciais estão corretas no .env.local</li>
                        <li>Certifique-se de que reiniciou o servidor após editar o .env.local</li>
                        <li>Confirme se seu projeto Supabase está ativo</li>
                    </ul>
                </div>
            )}
        </div>
    )
}
