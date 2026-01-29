/**
 * Tipos do banco de dados Supabase para o projeto Obra360
 * 
 * Este arquivo será atualizado automaticamente quando você gerar
 * os tipos do Supabase com o comando:
 * npx supabase gen types typescript --project-id seu-projeto-id > lib/database.types.ts
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

// Placeholder - será substituído quando você gerar os tipos do seu banco
export interface Database {
    public: {
        Tables: {
            // Suas tabelas aparecerão aqui após gerar os tipos
            [key: string]: {
                Row: Record<string, unknown>
                Insert: Record<string, unknown>
                Update: Record<string, unknown>
            }
        }
        Views: {
            [key: string]: {
                Row: Record<string, unknown>
            }
        }
        Functions: {
            [key: string]: unknown
        }
        Enums: {
            [key: string]: string
        }
    }
}
