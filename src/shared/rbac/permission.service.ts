import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../logging/logger';

/**
 * Permission Service
 * 
 * Centralized service for managing and resolving user permissions.
 * Supports caching for performance.
 */
export class PermissionService {
    private logger: Logger;
    private cache = new Map<string, { permissions: string[], timestamp: number }>();
    private CACHE_TTL = 60000; // 60 seconds

    constructor(private supabase: SupabaseClient) {
        this.logger = new Logger('PermissionService');
    }

    /**
     * Get all permissions for a user in a tenant
     */
    async getPermissionsForUser(tenantId: string, userId: string): Promise<string[]> {
        const cacheKey = `${tenantId}:${userId}`;
        const cached = this.cache.get(cacheKey);

        // Return cached if valid
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            this.logger.debug('Permissions cache hit', { tenantId, userId });
            return cached.permissions;
        }

        this.logger.debug('Fetching permissions from database', { tenantId, userId });

        // Fetch user's roles
        const { data: userRoles, error: rolesError } = await this.supabase
            .from('user_roles')
            .select('role_id')
            .eq('tenant_id', tenantId)
            .eq('user_id', userId);

        if (rolesError) {
            this.logger.error('Error fetching user roles', { error: rolesError, tenantId, userId });
            return [];
        }

        if (!userRoles || userRoles.length === 0) {
            this.logger.warn('User has no roles', { tenantId, userId });
            this.cache.set(cacheKey, { permissions: [], timestamp: Date.now() });
            return [];
        }

        const roleIds = userRoles.map(ur => ur.role_id);

        // Fetch permissions for those roles
        const { data: rolePermissions, error: permissionsError } = await this.supabase
            .from('role_permissions')
            .select('permission_key')
            .in('role_id', roleIds);

        if (permissionsError) {
            this.logger.error('Error fetching role permissions', { error: permissionsError, roleIds });
            return [];
        }

        // Extract unique permission keys
        const permissions = [...new Set(rolePermissions?.map(rp => rp.permission_key) || [])];

        this.logger.info('Permissions resolved', {
            tenantId,
            userId,
            permissionCount: permissions.length
        });

        // Cache the result
        this.cache.set(cacheKey, { permissions, timestamp: Date.now() });

        return permissions;
    }

    /**
     * Check if user has a specific permission
     */
    async hasPermission(tenantId: string, userId: string, permissionKey: string): Promise<boolean> {
        const permissions = await this.getPermissionsForUser(tenantId, userId);

        // Check for wildcard permission (admin)
        if (permissions.includes('*')) {
            return true;
        }

        return permissions.includes(permissionKey);
    }

    /**
     * Check if user has any of the specified permissions
     */
    async hasAnyPermission(tenantId: string, userId: string, permissionKeys: string[]): Promise<boolean> {
        const permissions = await this.getPermissionsForUser(tenantId, userId);

        // Check for wildcard permission (admin)
        if (permissions.includes('*')) {
            return true;
        }

        return permissionKeys.some(key => permissions.includes(key));
    }

    /**
     * Check if user has all of the specified permissions
     */
    async hasAllPermissions(tenantId: string, userId: string, permissionKeys: string[]): Promise<boolean> {
        const permissions = await this.getPermissionsForUser(tenantId, userId);

        // Check for wildcard permission (admin)
        if (permissions.includes('*')) {
            return true;
        }

        return permissionKeys.every(key => permissions.includes(key));
    }

    /**
     * Invalidate cache for a specific user
     */
    invalidateCache(tenantId: string, userId: string): void {
        const cacheKey = `${tenantId}:${userId}`;
        this.cache.delete(cacheKey);
        this.logger.debug('Permission cache invalidated', { tenantId, userId });
    }

    /**
     * Invalidate all cache (use when roles/permissions change globally)
     */
    invalidateAllCache(): void {
        this.cache.clear();
        this.logger.info('All permission cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number, ttl: number } {
        return {
            size: this.cache.size,
            ttl: this.CACHE_TTL
        };
    }
}
