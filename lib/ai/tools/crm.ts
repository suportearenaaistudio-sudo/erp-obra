/**
 * AI Tools - CRM Module
 * 
 * Tools relacionados a Clientes (CRM)
 */

import { supabase } from '@/lib/supabase';
import { ToolContext, ToolHandler } from './types';

/**
 * get_client_summary
 * Retorna resumo de um cliente específico
 */
export const getClientSummary: ToolHandler = {
    requiredPermission: 'view_clients',

    async execute(args: { clientId: string }, context: ToolContext) {
        const { data, error } = await supabase
            .from('clients')
            .select(`
        id,
        name,
        email,
        phone,
        company_name,
        cpf_cnpj,
        address,
        city,
        state,
        projects:projects(count),
        created_at
      `)
            .eq('id', args.clientId)
            .eq('tenant_id', context.tenantId)
            .single();

        if (error || !data) {
            throw new Error(`Cliente ${args.clientId} não encontrado`);
        }

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            phone: data.phone || 'Não informado',
            company: data.company_name || 'Pessoa Física',
            document: data.cpf_cnpj || 'Não informado',
            location: {
                address: data.address || 'Não informado',
                city: data.city || 'N/A',
                state: data.state || 'N/A',
            },
            stats: {
                totalProjects: data.projects?.[0]?.count || 0,
            },
            since: data.created_at,
        };
    },
};

/**
 * search_clients
 * Busca clientes por nome, email ou documento
 */
export const searchClients: ToolHandler = {
    requiredPermission: 'view_clients',

    async execute(args: { query: string; limit?: number }, context: ToolContext) {
        const searchQuery = `%${args.query}%`;

        const { data, error } = await supabase
            .from('clients')
            .select('id, name, email, phone, company_name, cpf_cnpj')
            .eq('tenant_id', context.tenantId)
            .or(`name.ilike.${searchQuery},email.ilike.${searchQuery},cpf_cnpj.ilike.${searchQuery},company_name.ilike.${searchQuery}`)
            .limit(args.limit || 10);

        if (error) {
            throw new Error(`Erro na busca: ${error.message}`);
        }

        return {
            total: data?.length || 0,
            clients: data?.map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                company: c.company_name,
                document: c.cpf_cnpj,
            })) || [],
        };
    },
};

/**
 * get_pipeline_status
 * Retorna status do pipeline de vendas (se implementado)
 */
export const getPipelineStatus: ToolHandler = {
    requiredPermission: 'view_clients',

    async execute(args: { filters?: any }, context: ToolContext) {
        // Por enquanto, retornar contagem simples de clientes
        const { count, error } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', context.tenantId);

        if (error) {
            throw new Error(`Erro ao buscar pipeline: ${error.message}`);
        }

        // Buscar projetos ativos
        const { data: activeProjects } = await supabase
            .from('projects')
            .select('id, status')
            .eq('tenant_id', context.tenantId)
            .in('status', ['active', 'paused']);

        return {
            totalClients: count || 0,
            activeProjects: activeProjects?.length || 0,
            message: 'Pipeline detalhado será implementado em versão futura',
        };
    },
};
