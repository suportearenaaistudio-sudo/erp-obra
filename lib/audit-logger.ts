import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Audit Logger
 * Logs all critical actions to audit_logs table
 */

export interface AuditLogEntry {
    tenantId?: string;
    userId?: string;
    saasUserId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export class AuditLogger {
    constructor(private client: SupabaseClient) { }

    /**
     * Log an action to audit_logs
     */
    async log(entry: AuditLogEntry): Promise<void> {
        try {
            const { error } = await this.client.from('audit_logs').insert({
                tenant_id: entry.tenantId || null,
                user_id: entry.userId || null,
                saas_user_id: entry.saasUserId || null,
                action: entry.action,
                entity_type: entry.entityType,
                entity_id: entry.entityId || null,
                old_values: entry.oldValues || null,
                new_values: entry.newValues || null,
                ip_address: entry.ipAddress || null,
                user_agent: entry.userAgent || null,
            });

            if (error) {
                console.error('Failed to write audit log:', error);
            }
        } catch (error) {
            console.error('Audit logging error:', error);
        }
    }

    /**
     * Log user creation
     */
    async logUserCreated(
        tenantId: string,
        actorUserId: string,
        newUser: any
    ): Promise<void> {
        await this.log({
            tenantId,
            userId: actorUserId,
            action: 'CREATE_USER',
            entityType: 'USER',
            entityId: newUser.id,
            newValues: {
                email: newUser.email,
                name: newUser.name,
                role_id: newUser.role_id,
            },
        });
    }

    /**
     * Log user update
     */
    async logUserUpdated(
        tenantId: string,
        actorUserId: string,
        userId: string,
        oldValues: any,
        newValues: any
    ): Promise<void> {
        await this.log({
            tenantId,
            userId: actorUserId,
            action: 'UPDATE_USER',
            entityType: 'USER',
            entityId: userId,
            oldValues,
            newValues,
        });
    }

    /**
     * Log role creation
     */
    async logRoleCreated(
        tenantId: string,
        actorUserId: string,
        newRole: any
    ): Promise<void> {
        await this.log({
            tenantId,
            userId: actorUserId,
            action: 'CREATE_ROLE',
            entityType: 'ROLE',
            entityId: newRole.id,
            newValues: {
                name: newRole.name,
                is_tenant_admin: newRole.is_tenant_admin,
            },
        });
    }

    /**
     * Log permission changes
     */
    async logPermissionsUpdated(
        tenantId: string,
        actorUserId: string,
        roleId: string,
        oldPermissions: string[],
        newPermissions: string[]
    ): Promise<void> {
        await this.log({
            tenantId,
            userId: actorUserId,
            action: 'UPDATE_PERMISSIONS',
            entityType: 'ROLE',
            entityId: roleId,
            oldValues: { permissions: oldPermissions },
            newValues: { permissions: newPermissions },
        });
    }

    /**
     * Log subscription change (Dev Admin action)
     */
    async logSubscriptionChanged(
        saasUserId: string,
        tenantId: string,
        subscriptionId: string,
        oldValues: any,
        newValues: any
    ): Promise<void> {
        await this.log({
            tenantId,
            saasUserId,
            action: 'UPDATE_SUBSCRIPTION',
            entityType: 'SUBSCRIPTION',
            entityId: subscriptionId,
            oldValues,
            newValues,
        });
    }

    /**
     * Log feature override (Dev Admin action)
     */
    async logFeatureOverride(
        saasUserId: string,
        tenantId: string,
        featureKey: string,
        enabled: boolean,
        reason: string
    ): Promise<void> {
        await this.log({
            tenantId,
            saasUserId,
            action: enabled ? 'ENABLE_FEATURE' : 'DISABLE_FEATURE',
            entityType: 'FEATURE_OVERRIDE',
            newValues: {
                feature_key: featureKey,
                enabled,
                reason,
            },
        });
    }

    /**
     * Log impersonation start
     */
    async logImpersonationStart(
        saasUserId: string,
        tenantId: string,
        userId: string,
        sessionId: string,
        reason: string
    ): Promise<void> {
        await this.log({
            tenantId,
            saasUserId,
            action: 'START_IMPERSONATION',
            entityType: 'SUPPORT_SESSION',
            entityId: sessionId,
            newValues: {
                impersonated_user_id: userId,
                reason,
            },
        });
    }

    /**
     * Log impersonation end
     */
    async logImpersonationEnd(
        saasUserId: string,
        tenantId: string,
        sessionId: string
    ): Promise<void> {
        await this.log({
            tenantId,
            saasUserId,
            action: 'END_IMPERSONATION',
            entityType: 'SUPPORT_SESSION',
            entityId: sessionId,
        });
    }

    /**
     * Log tenant suspension (Dev Admin action)
     */
    async logTenantSuspended(
        saasUserId: string,
        tenantId: string,
        reason: string
    ): Promise<void> {
        await this.log({
            tenantId,
            saasUserId,
            action: 'SUSPEND_TENANT',
            entityType: 'TENANT',
            entityId: tenantId,
            newValues: { reason },
        });
    }

    /**
     * Log tenant reactivation (Dev Admin action)
     */
    async logTenantReactivated(
        saasUserId: string,
        tenantId: string
    ): Promise<void> {
        await this.log({
            tenantId,
            saasUserId,
            action: 'REACTIVATE_TENANT',
            entityType: 'TENANT',
            entityId: tenantId,
        });
    }
}
