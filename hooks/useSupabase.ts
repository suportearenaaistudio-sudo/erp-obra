import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User, Session } from '@supabase/supabase-js'

/**
 * Hook para gerenciar autenticação com Supabase
 */
export function useSupabaseAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Pega a sessão atual
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        // Escuta mudanças na autenticação
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    return { user, session, loading }
}

/**
 * Hook genérico para buscar dados do Supabase
 * 
 * @example
 * const { data, loading, error } = useSupabaseQuery('empresas', { select: '*' })
 */
export function useSupabaseQuery<T = any>(
    table: string,
    options?: {
        select?: string
        filter?: Record<string, any>
        order?: { column: string; ascending?: boolean }
    }
) {
    const [data, setData] = useState<T[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true)
                let query = supabase.from(table).select(options?.select || '*')

                // Aplica filtros se existirem
                if (options?.filter) {
                    Object.entries(options.filter).forEach(([key, value]) => {
                        query = query.eq(key, value)
                    })
                }

                // Aplica ordenação se existir
                if (options?.order) {
                    query = query.order(options.order.column, {
                        ascending: options.order.ascending ?? true,
                    })
                }

                const { data, error } = await query

                if (error) throw error

                setData(data as T[])
                setError(null)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erro desconhecido')
                setData(null)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [table, JSON.stringify(options)])

    return { data, loading, error }
}
