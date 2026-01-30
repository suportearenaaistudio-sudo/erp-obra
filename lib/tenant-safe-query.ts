
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * TenantSafeQuery
 * 
 * Helper class to ensure all database queries are scoped to a specific tenant.
 * Wraps the Supabase client and automatically injects .eq('tenant_id', tenantId)
 * into every query, preventing accidental cross-tenant data leaks.
 */
export class TenantSafeQuery {
    constructor(
        private client: SupabaseClient,
        private tenantId: string
    ) {
        if (!tenantId) {
            throw new Error('TenantSafeQuery requires a valid tenantId');
        }
    }

    /**
     * Start a query on a table, automatically filtering by tenant_id
     */
    from(table: string) {
        // Tables that are global and don't have tenant_id
        const GLOBAL_TABLES = ['plans', 'features', 'public_metrics'];

        const query = this.client.from(table);

        if (GLOBAL_TABLES.includes(table)) {
            return query;
        }

        // Return a proxy that intercepts query builder methods
        // This is a simplified version - in a real ORM we might want deeper integration
        // But for Supabase/PostgREST chain, we can just return the query with the filter applied immediately
        // However, Supabase client returns a PostgrestFilterBuilder which allows chaining.
        // The safest way is to just return the builder with the filter applied.

        return query.eq('tenant_id', this.tenantId);
    }

    /**
     * Helper specifically for RPC calls if needed, 
     * enforcing tenant_id param if the function expects it
     */
    async rpc(fn: string, args: any = {}) {
        // This assumes the RPC function has a tenant_id parameter
        // We force override it to ensure safety
        return this.client.rpc(fn, { ...args, tenant_id: this.tenantId });
    }
}
