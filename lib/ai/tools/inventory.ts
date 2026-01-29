/**
 * AI Tools - Inventory Module
 * 
 * Tools relacionados a Estoque (Materiais)
 */

import { supabase } from '@/lib/supabase';
import { ToolContext, ToolHandler } from './types';

/**
 * list_inventory_items
 * Lista itens de estoque (materiais) com filtros
 */
export const listInventoryItems: ToolHandler = {
    requiredPermission: 'view_inventory', // Ajustar conforme permissão real (ex: materials:read)

    async execute(
        args: {
            search?: string;
            category?: string;
            lowStock?: boolean;
            limit?: number;
        },
        context: ToolContext
    ) {
        let query = supabase
            .from('materials')
            .select(`
        id,
        sku,
        name,
        unit,
        category,
        current_stock,
        min_stock,
        avg_cost,
        reserved
      `)
            .eq('tenant_id', context.tenantId)
            .order('name', { ascending: true })
            .limit(args.limit || 20);

        if (args.search) {
            query = query.or(`name.ilike.%${args.search}%,sku.ilike.%${args.search}%`);
        }

        if (args.category) {
            query = query.eq('category', args.category);
        }

        // Filtro de baixo estoque (manual no banco ou filter no application side se complexo)
        // Como supabase tem limitações com filtros complexos em colunas computed/comparisons diretos de colunas
        // Vamos filtrar no banco se possível.
        // current_stock <= min_stock
        // Nota: Supabase postgrest filter 'lte' compara com valor fixo, não coluna.
        // Para comparar colunas, precisaria de RPC ou raw filter, mas raw filter expõe SQL.
        // Vamos buscar e filtrar na memória se lowStock=true, ou usar uma view se existisse.
        // Por simplificação, vamos buscar todos e filtrar se lowStock for true, mas limitando a busca.

        const { data, error } = await query;

        if (error) {
            throw new Error(`Erro ao buscar estoque: ${error.message}`);
        }

        let items = data || [];

        if (args.lowStock) {
            items = items.filter(item => (item.current_stock || 0) <= (item.min_stock || 0));
        }

        return {
            total: items.length,
            items: items.map(item => ({
                id: item.id,
                sku: item.sku,
                name: item.name,
                category: item.category || 'Geral',
                stock: {
                    current: item.current_stock || 0,
                    min: item.min_stock || 0,
                    reserved: item.reserved || 0,
                    available: (item.current_stock || 0) - (item.reserved || 0),
                    status: (item.current_stock || 0) <= (item.min_stock || 0) ? 'LOW' : 'OK',
                },
                financial: {
                    avgCost: item.avg_cost || 0,
                    totalValue: (item.current_stock || 0) * (item.avg_cost || 0),
                },
            })),
        };
    },
};

/**
 * get_item_details
 * Retorna detalhes de um item específico
 */
export const getItemDetails: ToolHandler = {
    requiredPermission: 'view_inventory',

    async execute(args: { itemId?: string; sku?: string }, context: ToolContext) {
        if (!args.itemId && !args.sku) {
            throw new Error('Forneça itemId ou sku');
        }

        let query = supabase
            .from('materials')
            .select('*')
            .eq('tenant_id', context.tenantId)
            .single();

        if (args.itemId) {
            query = query.eq('id', args.itemId);
        } else if (args.sku) {
            query = query.eq('sku', args.sku);
        }

        const { data: item, error } = await query;

        if (error || !item) {
            throw new Error(`Item não encontrado (${args.itemId || args.sku})`);
        }

        return {
            id: item.id,
            sku: item.sku,
            name: item.name,
            description: item.description, // Se existir na tabela (não vi no schema, mas comum)
            unit: item.unit,
            category: item.category,
            stock: {
                current: item.current_stock,
                min: item.min_stock,
                reserved: item.reserved,
            },
            financial: {
                avgCost: item.avg_cost,
                unitVal: item.avg_cost, // Simplificação
            },
            updatedAt: item.updated_at,
        };
    },
};

/**
 * record_stock_movement
 * Registra entrada/saída de estoque
 */
export const recordStockMovement: ToolHandler = {
    requiredPermission: 'manage_inventory', // Permission de escrita

    async execute(
        args: {
            itemId: string;
            quantity: number;
            type: 'in' | 'out';
            reason: string;
        },
        context: ToolContext
    ) {
        // 1. Buscar item atual
        const { data: item, error: fetchError } = await supabase
            .from('materials')
            .select('id, current_stock, name')
            .eq('id', args.itemId)
            .eq('tenant_id', context.tenantId)
            .single();

        if (fetchError || !item) {
            throw new Error('Item não encontrado');
        }

        const currentQty = Number(item.current_stock || 0);
        let newQty = currentQty;
        const delta = Math.abs(args.quantity);

        if (args.type === 'in') {
            newQty += delta;
        } else {
            if (currentQty < delta) {
                throw new Error(`Estoque insuficiente. Atual: ${currentQty}, Tentativa de saída: ${delta}`);
            }
            newQty -= delta;
        }

        // 2. Atualizar estoque
        // Idealmente seria uma transação com tabela inventory_movements, mas ela não existe no schema atual
        // Vamos apenas atualizar o materials
        const { data: updatedItem, error: updateError } = await supabase
            .from('materials')
            .update({
                current_stock: newQty,
                updated_at: new Date().toISOString(),
            })
            .eq('id', args.itemId)
            .eq('tenant_id', context.tenantId)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Erro ao atualizar estoque: ${updateError.message}`);
        }

        return {
            success: true,
            item: item.name,
            operation: args.type === 'in' ? 'Entrada' : 'Saída',
            quantity: delta,
            previousStock: currentQty,
            newStock: newQty,
            reason: args.reason,
        };
    },
};
