import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const SupabaseTest: React.FC = () => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [message, setMessage] = useState<string>('Conectando ao Supabase...');

    useEffect(() => {
        const testConnection = async () => {
            try {
                // Testa a conexão fazendo uma query simples
                const { data, error } = await supabase
                    .from('profiles')
                    .select('count')
                    .limit(1);

                if (error) {
                    setStatus('error');
                    setMessage(`Erro ao conectar: ${error.message}`);
                } else {
                    setStatus('connected');
                    setMessage('✅ Conectado ao Supabase com sucesso!');
                }
            } catch (err) {
                setStatus('error');
                setMessage(`Erro ao conectar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
            }
        };

        testConnection();
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: status === 'connected' ? '#10b981' : status === 'error' ? '#ef4444' : '#3b82f6',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                zIndex: 9999,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
        >
            {message}
        </div>
    );
};
