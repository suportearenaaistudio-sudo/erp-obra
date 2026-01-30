
import { SupabaseClient } from '@supabase/supabase-js';

interface CachedFeatures {
    features: Set<string>;
    timestamp: number;
}

// Global cache (module level) to persist across instances
const globalCache = new Map<string, CachedFeatures>();

export class FeatureResolverService {
    private TTL_MS = 60 * 1000; // 60 seconds

    constructor(private client: SupabaseClient) { }

    /**
     * Resolve features for a tenant (plan + overrides) with caching
     */
    async resolveFeatures(tenantId: string): Promise<Set<string>> {
        // Check cache
        const cached = globalCache.get(tenantId);
        if (cached && (Date.now() - cached.timestamp < this.TTL_MS)) {
            // console.log(`[FeatureResolver] Cache hit for ${tenantId}`);
            return cached.features;
        }

        // console.log(`[FeatureResolver] Cache miss for ${tenantId}`);

        // Fetch fresh data
        const features = await this.fetchFeatures(tenantId);

        // Update cache
        globalCache.set(tenantId, {
            features,
            timestamp: Date.now()
        });

        return features;
    }

    /**
     * Invalidate cache for a tenant
     * Call this when overrides change or plan changes
     */
    static invalidate(tenantId: string) {
        globalCache.delete(tenantId);
        console.log(`[FeatureResolver] Cache invalidated for ${tenantId}`);
    }

    /**
     * Fetch features from DB (Plan + Overrides)
     */
    private async fetchFeatures(tenantId: string): Promise<Set<string>> {
        // 1. Get Subscription Plan Features
        const { data: subscription } = await this.client
            .from('subscriptions')
            .select('plan:plans(included_features)')
            .eq('tenant_id', tenantId)
            .single();

        const planFeatures = (subscription?.plan as any)?.included_features || [];
        let features = new Set<string>(planFeatures);

        // 2. Get Overrides
        const { data: overrides } = await this.client
            .from('tenant_feature_overrides')
            .select('feature_key, enabled, expires_at')
            .eq('tenant_id', tenantId);

        // 3. Apply Overrides
        if (overrides) {
            for (const override of overrides) {
                if (override.expires_at) {
                    const expiresAt = new Date(override.expires_at);
                    if (expiresAt < new Date()) {
                        continue;
                    }
                }

                if (override.enabled) {
                    features.add(override.feature_key);
                } else {
                    features.delete(override.feature_key);
                }
            }
        }

        return features;
    }
}
