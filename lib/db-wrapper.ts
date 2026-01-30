import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Context for tenant-scoped database operations
 */
export interface TenantContext {
    tenantId: string;
    userId: string;
    isImpersonation?: boolean;
    saasUserId?: string;
}

/**
 * Enhanced Supabase client with automatic tenant isolation
 */
export class TenantScopedSupabaseClient {
    private client: SupabaseClient;
    private context: TenantContext | null = null;

    constructor(client: SupabaseClient) {
        this.client = client;
    }

    /**
     * Set tenant context for all subsequent queries
     * This MUST be called before any database operations
     */
    setContext(context: TenantContext) {
        this.context = context;
    }

    /**
     * Clear tenant context
     */
    clearContext() {
        this.context = null;
    }

    /**
     * Get current context
     */
    getContext(): TenantContext | null {
        return this.context;
    }

    /**
     * Execute a query with automatic tenant_id injection via RLS
     */
    async withTenantContext<T>(
        operation: (client: SupabaseClient) => Promise<T>
    ): Promise<T> {
        if (!this.context) {
            throw new Error(
                '🚨 SECURITY ERROR: Tenant context not set. ' +
                'You MUST call setContext() before any database operation.'
            );
        }

        // Set PostgreSQL session variable for RLS
        // This ensures RLS policies can access app.tenant_id
        await this.client.rpc('set_tenant_context', {
            p_tenant_id: this.context.tenantId
        });

        try {
            return await operation(this.client);
        } finally {
            // Clear session variable after operation
            await this.client.rpc('clear_tenant_context');
        }
    }

    /**
     * Safe query builder that enforces tenant context
     */
    from(table: string) {
        if (!this.context) {
            throw new Error(
                `🚨 SECURITY ERROR: Cannot query table "${table}" without tenant context. ` +
                'Call setContext() first.'
            );
        }

        return this.client.from(table);
    }

    /**
     * Get the underlying Supabase client (use with caution)
     * Only use this for operations that don't require tenant isolation
     * (e.g., auth, global admin operations)
     */
    getClient(): SupabaseClient {
        return this.client;
    }

    /**
     * Auth operations (don't require tenant context)
     */
    get auth() {
        return this.client.auth;
    }

    /**
     * Storage operations (tenant-scoped via RLS)
     */
    get storage() {
        return this.client.storage;
    }

    /**
     * RPC operations
     */
    rpc(fn: string, params?: any) {
        return this.client.rpc(fn, params);
    }
}

/**
 * Create a tenant-scoped Supabase client
 */
export function createTenantScopedClient(
    url: string,
    anonKey: string
): TenantScopedSupabaseClient {
    const client = createClient(url, anonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });

    return new TenantScopedSupabaseClient(client);
}

/**
 * Helper to extract tenant context from JWT token
 */
export function extractTenantContextFromToken(token: string): TenantContext | null {
    try {
        // Decode JWT (without verification - Supabase handles that)
        const payload = JSON.parse(atob(token.split('.')[1]));

        return {
            tenantId: payload.tenant_id,
            userId: payload.user_id || payload.sub,
            isImpersonation: payload.is_impersonation || false,
            saasUserId: payload.saas_user_id
        };
    } catch (error) {
        console.error('Failed to extract tenant context from token:', error);
        return null;
    }
}
