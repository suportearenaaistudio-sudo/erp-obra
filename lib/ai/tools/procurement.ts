/**
 * AI Tools - Procurement Module
 * 
 * Ferramentas para consultar pedidos de compra e fornecedores
 */

import { supabase } from '@/lib/supabase';
import { ToolContext, ToolHandler } from './types';
import { TenantSafeQuery } from '@/lib/tenant-safe-query';
import { FeatureGuard } from '@/lib/security-guards';
import { FeatureKeys } from '@/lib/constants/features';

/**
 * list_purchase_orders
 * Lista pedidos de compra (POs) com filtros
 */
export const listPurchaseOrders: ToolHandler = {
    requiredPermission: 'view_procurement',
    requiredFeature: FeatureKeys.PROCUREMENT,

    async execute(
        args: {
            status?: 'pending' | 'approved' | 'received' | 'cancelled';
            supplierId?: string;
            startDate?: string;
            endDate?: string;
            limit?: number;
        },
        context: ToolContext
    ) {
        // Validate Feature Access
        const featureGuard = new FeatureGuard(supabase);
        await featureGuard.check(context.tenantId, FeatureKeys.PROCUREMENT);

        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);
        let query = safeQuery
            .from('procurement_orders')
            .select(`
                id,
                order_number,
                supplier_name,
                total_amount,
                status,
                order_date,
                expected_delivery,
                project:projects (name)
            `)
            .order('order_date', { ascending: false })
            .limit(args.limit || 20);

        // Apply filters
        if (args.status) {
            query = query.eq('status', args.status);
        }

        if (args.supplierId) {
            query = query.eq('supplier_id', args.supplierId);
        }

        if (args.startDate) {
            query = query.gte('order_date', args.startDate);
        }

        if (args.endDate) {
            query = query.lte('order_date', args.endDate);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Erro ao listar pedidos de compra: ${error.message}`);
        }

        return {
            count: data?.length || 0,
            orders: data?.map(order => ({
                id: order.id,
                order_number: order.order_number,
                supplier: order.supplier_name,
                project: order.project?.name,
                total_amount: order.total_amount,
                status: order.status,
                order_date: order.order_date,
                expected_delivery: order.expected_delivery,
            })) || [],
        };
    },
};

/**
 * get_purchase_order_details
 * Detalhes de um pedido de compra específico
 */
export const getPurchaseOrderDetails: ToolHandler = {
    requiredPermission: 'view_procurement',
    requiredFeature: FeatureKeys.PROCUREMENT,

    async execute(args: { orderId: string }, context: ToolContext) {
        // Validate Feature Access
        const featureGuard = new FeatureGuard(supabase);
        await featureGuard.check(context.tenantId, FeatureKeys.PROCUREMENT);

        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);

        // Get order header
        const { data: order, error: orderError } = await safeQuery
            .from('procurement_orders')
            .select(`
                id,
                order_number,
                supplier_name,
                supplier_contact,
                total_amount,
                status,
                order_date,
                expected_delivery,
                delivery_date,
                notes,
                project:projects (
                    id,
                    name,
                    client:clients (name)
                )
            `)
            .eq('id', args.orderId)
            .single();

        if (orderError || !order) {
            throw new Error(`Pedido de compra não encontrado: ${orderError?.message || 'ID inválido'}`);
        }

        // Get order items
        const { data: items, error: itemsError } = await safeQuery
            .from('procurement_order_items')
            .select(`
                id,
                material_id,
                material:materials (
                    name,
                    sku,
                    unit
                ),
                quantity,
                unit_price,
                total_price,
                received_quantity
            `)
            .eq('order_id', args.orderId);

        if (itemsError) {
            throw new Error(`Erro ao buscar itens do pedido: ${itemsError.message}`);
        }

        const totalReceived = items?.reduce((sum, item) => sum + (item.received_quantity || 0), 0) || 0;
        const totalOrdered = items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

        return {
            order: {
                id: order.id,
                order_number: order.order_number,
                supplier: {
                    name: order.supplier_name,
                    contact: order.supplier_contact,
                },
                project: {
                    name: order.project?.name,
                    client: order.project?.client?.name,
                },
                financial: {
                    total_amount: order.total_amount,
                },
                status: order.status,
                dates: {
                    order_date: order.order_date,
                    expected_delivery: order.expected_delivery,
                    delivery_date: order.delivery_date,
                },
                notes: order.notes,
            },
            items: items?.map(item => ({
                id: item.id,
                material: {
                    id: item.material_id,
                    name: item.material?.name,
                    sku: item.material?.sku,
                    unit: item.material?.unit,
                },
                quantity_ordered: item.quantity,
                quantity_received: item.received_quantity || 0,
                unit_price: item.unit_price,
                total_price: item.total_price,
                fulfilled: (item.received_quantity || 0) >= item.quantity,
            })) || [],
            summary: {
                total_items: items?.length || 0,
                total_ordered: totalOrdered,
                total_received: totalReceived,
                fulfillment_percentage: totalOrdered > 0
                    ? ((totalReceived / totalOrdered) * 100).toFixed(2) + '%'
                    : '0%',
            },
        };
    },
};

/**
 * get_supplier_summary
 * Resumo de compras de um fornecedor
 */
export const getSupplierSummary: ToolHandler = {
    requiredPermission: 'view_procurement',
    requiredFeature: FeatureKeys.PROCUREMENT,

    async execute(args: { supplierId: string }, context: ToolContext) {
        // Validate Feature Access
        const featureGuard = new FeatureGuard(supabase);
        await featureGuard.check(context.tenantId, FeatureKeys.PROCUREMENT);

        const safeQuery = new TenantSafeQuery(supabase, context.tenantId);

        // Get all orders from this supplier
        const { data: orders, error } = await safeQuery
            .from('procurement_orders')
            .select('id, order_number, total_amount, status, order_date, supplier_name')
            .eq('supplier_id', args.supplierId)
            .order('order_date', { ascending: false });

        if (error) {
            throw new Error(`Erro ao buscar dados do fornecedor: ${error.message}`);
        }

        if (!orders || orders.length === 0) {
            throw new Error('Nenhum pedido encontrado para este fornecedor');
        }

        const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        const ordersByStatus = orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const lastOrder = orders[0]; // Already ordered by date desc

        return {
            supplier: {
                id: args.supplierId,
                name: lastOrder.supplier_name,
            },
            statistics: {
                total_orders: orders.length,
                total_spent: totalSpent,
                average_order_value: orders.length > 0 ? totalSpent / orders.length : 0,
                orders_by_status: ordersByStatus,
            },
            last_order: {
                id: lastOrder.id,
                order_number: lastOrder.order_number,
                amount: lastOrder.total_amount,
                status: lastOrder.status,
                date: lastOrder.order_date,
            },
            recent_orders: orders.slice(0, 5).map(order => ({
                id: order.id,
                order_number: order.order_number,
                amount: order.total_amount,
                status: order.status,
                date: order.order_date,
            })),
        };
    },
};
