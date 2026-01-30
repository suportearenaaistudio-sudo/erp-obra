import { SupabaseClient } from '@supabase/supabase-js';
import { RequestContext } from '../types/context';
import { SubscriptionGuard } from './subscription.guard';
import { FeatureGuard } from './feature.guard';
import { RBACGuard } from './rbac.guard';

import { SaasAuthGuard } from './saas-auth.guard';

export class SecurityPipeline {
    private subscriptionGuard: SubscriptionGuard;
    private featureGuard: FeatureGuard;
    private rbacGuard: RBACGuard;
    private saasAuthGuard: SaasAuthGuard;

    constructor(client: SupabaseClient) {
        this.subscriptionGuard = new SubscriptionGuard(client);
        this.featureGuard = new FeatureGuard(client);
        this.rbacGuard = new RBACGuard(client);
        this.saasAuthGuard = new SaasAuthGuard(client);
    }

    async check(
        context: RequestContext,
        options: {
            feature?: string;
            permission?: string;
            skipSubscription?: boolean;
        } = {}
    ): Promise<void> {
        // 0. SaaS Admin Check (if context implies SaaS)
        if (context.userType === 'saas') {
            // We need email for SaaS check. 
            // As RequestContext definition doesn't strictly have email, we assume it's available or we fetch it.
            // For now, let's assume the caller provides it in context or we skip if not available?
            // Actually best practice is to require email in RequestContext or fetch it.
            // Let's assume passed in a new field or we fetch.
            // Since we can't easily change RequestContext everywhere right now without strictly enforcing it,
            // let's fetch user if email missing, or throw.
            // For efficiency, RequestContext *should* have email. 
            // Let's update RequestContext later to definitely include email.
            // For now, we'll try to use a property if it exists or throw.
            const email = (context as any).email;
            if (email) {
                await this.saasAuthGuard.check(context.userId || '', email);
            } else {
                // If we don't have email in context, we must fetch it or fail.
                // Let's fail safe.
                throw new Error("Email required for SaaS check");
            }
        }

        // 1. Subscription Guard (skip if Dev Admin or explicitly skipped)
        if (!options.skipSubscription && context.userType !== 'saas') {
            if (context.tenantId) {
                await this.subscriptionGuard.check(context.tenantId);
            }
        }

        // 2. Feature Guard
        if (options.feature && context.tenantId) {
            // Dev admins can bypass feature checks if needed, but usually we want to see what the tenant sees
            // For now, enforce it even for dev admin impersonating
            await this.featureGuard.check(context.tenantId, options.feature);
        }

        // 3. RBAC Guard
        if (options.permission && context.tenantId && context.userId) {
            await this.rbacGuard.check(context.tenantId, context.userId, options.permission);
        }
    }

    async getFeatures(tenantId: string): Promise<string[]> {
        const features = await this.featureGuard.resolveFeatures(tenantId);
        return Array.from(features);
    }

    async getPermissions(tenantId: string, userId: string): Promise<string[]> {
        const permissions = await this.rbacGuard.getUserPermissions(tenantId, userId);
        return Array.from(permissions);
    }
}
