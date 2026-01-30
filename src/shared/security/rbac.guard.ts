import { SupabaseClient } from '@supabase/supabase-js';
import { AppError, ErrorCode } from '../errors/errors';
import { Logger } from '../logging/logger';

export class RBACGuard {
    private logger = new Logger('RBACGuard');

    constructor(private client: SupabaseClient) { }

    async getUserPermissions(tenantId: string, userId: string): Promise<Set<string>> {
        const { data: user } = await this.client
            .from('users')
            .select('role_id, role:roles(is_tenant_admin)')
            .eq('id', userId)
            .eq('tenant_id', tenantId)
            .single();

        if (!user) return new Set();

        if ((user.role as any)?.is_tenant_admin) {
            return new Set(['*']);
        }

        if (user.role_id) {
            const { data: permissions } = await this.client
                .from('role_permissions')
                .select('permission_key')
                .eq('tenant_id', tenantId)
                .eq('role_id', user.role_id);

            return new Set(permissions?.map(p => p.permission_key) || []);
        }

        return new Set();
    }

    async check(tenantId: string, userId: string, requiredPermission: string): Promise<void> {
        this.logger.debug('Checking RBAC', { tenantId, userId, requiredPermission });

        const permissions = await this.getUserPermissions(tenantId, userId);

        if (permissions.has('*')) return;

        if (!permissions.has(requiredPermission)) {
            this.logger.warn('RBAC denied', { tenantId, userId, requiredPermission });
            throw new AppError(
                ErrorCode.PERMISSION_DENIED,
                `Missing permission: ${requiredPermission}`,
                403
            );
        }
    }
}
