import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Security Guards for the SaaS multi-tenant system
 * These guards enforce subscription, feature, and RBAC policies
 */

export interface RequestContext {
    tenantId: string;
    userId: string;
    isImpersonation?: boolean;
    saasUserId?: string;
}

export class SecurityError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 403
    ) {
        super(message);
        this.name = 'SecurityError';
    }
}

/**
 * Subscription Guard
 * Blocks access if subscription is inactive, suspended, or canceled
 */
export class SubscriptionGuard {
    constructor(private client: SupabaseClient) { }

    async check(tenantId: string): Promise<void> {
        const { data: subscription, error } = await this.client
            .from('subscriptions')
            .select('status, plan:plans(display_name)')
            .eq('tenant_id', tenantId)
            .single();

        if (error || !subscription) {
            throw new SecurityError(
                'Subscription not found',
                'SUBSCRIPTION_NOT_FOUND',
                403
            );
        }

        switch (subscription.status) {
            case 'canceled':
                throw new SecurityError(
                    'Subscription canceled. Please contact support to reactivate.',
                    'SUBSCRIPTION_CANCELED',
                    403
                );

            case 'suspended':
                throw new SecurityError(
                    'Subscription suspended due to payment issues. Please update your payment method.',
                    'SUBSCRIPTION_SUSPENDED',
                    403
                );

            case 'past_due':
                // Allow read-only access for past_due (configurable)
                // For now, we'll allow it but could add write restrictions
                console.warn(`Tenant ${tenantId} subscription is past due`);
                break;

            case 'trial':
            case 'active':
                // All good
                break;

            default:
                throw new SecurityError(
                    `Invalid subscription status: ${subscription.status}`,
                    'SUBSCRIPTION_INVALID_STATUS',
                    403
                );
        }
    }
}

/**
 * Feature Guard
 * Blocks access if feature is not enabled for the tenant
 */
// FeatureGuard updated to use FeatureResolverService
import { FeatureResolverService } from './feature-resolver';

/**
 * Feature Guard
 * Blocks access if feature is not enabled for the tenant
 */
export class FeatureGuard {
    private resolver: FeatureResolverService;

    constructor(private client: SupabaseClient) {
        this.resolver = new FeatureResolverService(client);
    }

    /**
     * Resolve features for a tenant (plan + overrides)
     * Delegates to cached resolver
     */
    async resolveFeatures(tenantId: string): Promise<Set<string>> {
        return this.resolver.resolveFeatures(tenantId);
    }

    /**
     * Check if tenant has access to a specific feature
     */
    async check(tenantId: string, featureKey: string): Promise<void> {
        const features = await this.resolveFeatures(tenantId);

        if (!features.has(featureKey)) {
            throw new SecurityError(
                `Feature "${featureKey}" is not available in your plan. Please upgrade to access this feature.`,
                'FEATURE_DISABLED',
                403
            );
        }
    }
}

/**
 * RBAC Guard
 * Blocks access if user doesn't have required permission
 */
export class RBACGuard {
    constructor(private client: SupabaseClient) { }

    /**
     * Get user's permissions
     */
    async getUserPermissions(
        tenantId: string,
        userId: string
    ): Promise<Set<string>> {
        // Get user with role
        const { data: user } = await this.client
            .from('users')
            .select('role_id, role:roles(is_tenant_admin)')
            .eq('id', userId)
            .eq('tenant_id', tenantId)
            .single();

        if (!user) {
            return new Set();
        }

        // Tenant admins have all permissions
        // Role is embedded as object when using .single()
        const isTenantAdmin = (user.role as any)?.is_tenant_admin;
        if (isTenantAdmin) {
            return new Set(['*']); // Wildcard for all permissions
        }

        // Get role permissions
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

    /**
     * Check if user has required permission
     */
    async check(
        tenantId: string,
        userId: string,
        requiredPermission: string
    ): Promise<void> {
        const permissions = await this.getUserPermissions(tenantId, userId);

        // Check for wildcard (tenant admin)
        if (permissions.has('*')) {
            return;
        }

        if (!permissions.has(requiredPermission)) {
            throw new SecurityError(
                `Permission denied. Required permission: ${requiredPermission}`,
                'PERMISSION_DENIED',
                403
            );
        }
    }
}

/**
 * Combined Security Pipeline
 * Runs all guards in sequence
 */
export class SecurityPipeline {
    private subscriptionGuard: SubscriptionGuard;
    private featureGuard: FeatureGuard;
    private rbacGuard: RBACGuard;

    constructor(client: SupabaseClient) {
        this.subscriptionGuard = new SubscriptionGuard(client);
        this.featureGuard = new FeatureGuard(client);
        this.rbacGuard = new RBACGuard(client);
    }

    /**
     * Run full security pipeline
     */
    async check(
        context: RequestContext,
        options: {
            feature?: string;
            permission?: string;
            skipSubscription?: boolean;
        } = {}
    ): Promise<void> {
        // 1. Subscription Guard (unless skipped)
        if (!options.skipSubscription) {
            await this.subscriptionGuard.check(context.tenantId);
        }

        // 2. Feature Guard (if feature specified)
        if (options.feature) {
            await this.featureGuard.check(context.tenantId, options.feature);
        }

        // 3. RBAC Guard (if permission specified)
        if (options.permission) {
            await this.rbacGuard.check(
                context.tenantId,
                context.userId,
                options.permission
            );
        }
    }

    /**
     * Get resolved features for tenant
     */
    async getFeatures(tenantId: string): Promise<string[]> {
        const features = await this.featureGuard.resolveFeatures(tenantId);
        return Array.from(features);
    }

    /**
     * Get user permissions
     */
    async getPermissions(tenantId: string, userId: string): Promise<string[]> {
        const permissions = await this.rbacGuard.getUserPermissions(
            tenantId,
            userId
        );
        return Array.from(permissions);
    }
}
