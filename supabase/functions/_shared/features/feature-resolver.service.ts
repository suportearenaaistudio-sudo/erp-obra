import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../logging/logger';
import { FeatureKeys } from '../constants/features';

interface FeatureCacheEntry {
    features: Set<string>;
    timestamp: number;
}

export class FeatureResolverService {
    private logger = new Logger('FeatureResolverService');
    private cache = new Map<string, FeatureCacheEntry>();
    private readonly CACHE_TTL = 30000; // 30 seconds

    constructor(private client: SupabaseClient) { }

    /**
     * Resolve features for a tenant considering plan and overrides
     */
    async resolveFeatures(tenantId: string): Promise<Set<string>> {
        // Check cache
        const cached = this.cache.get(tenantId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            this.logger.debug('Returning cached features', { tenantId });
            return cached.features;
        }

        this.logger.debug('Resolving features from DB', { tenantId });

        // 1. Get plan features
        const { data: subscription } = await this.client
            .from('subscriptions')
            .select('plan:plans(included_features)')
            .eq('tenant_id', tenantId)
            .single();

        const planFeatures = (subscription?.plan as any)?.included_features || [];
        let features = new Set<string>(planFeatures);

        // 2. Apply overrides
        const { data: overrides } = await this.client
            .from('tenant_feature_overrides')
            .select('feature_key, enabled, expires_at')
            .eq('tenant_id', tenantId);

        if (overrides) {
            const now = new Date();
            for (const override of overrides) {
                // Check expiration
                if (override.expires_at && new Date(override.expires_at) < now) {
                    continue;
                }

                if (override.enabled) {
                    features.add(override.feature_key);
                } else {
                    features.delete(override.feature_key);
                }
            }
        }

        // Update cache
        this.cache.set(tenantId, {
            features,
            timestamp: Date.now(),
        });

        return features;
    }

    /**
     * Manually invalidate cache for a tenant (e.g. after override update)
     */
    invalidateCache(tenantId: string): void {
        this.logger.info('Invalidating feature cache', { tenantId });
        this.cache.delete(tenantId);
    }
}
