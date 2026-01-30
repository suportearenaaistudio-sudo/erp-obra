import { SupabaseClient } from '@supabase/supabase-js';
import { AppError, ErrorCode } from '../errors/errors';
import { Logger } from '../logging/logger';
import { FeatureResolverService } from '../features/feature-resolver.service';
import { LogSafe } from '../../saas/logsafe/emitter';
import { SecurityEventType, ActorType } from '../../saas/logsafe/types';

export class FeatureGuard {
    private logger = new Logger('FeatureGuard');
    private resolver: FeatureResolverService;

    constructor(client: SupabaseClient) {
        this.resolver = new FeatureResolverService(client);
        // console.log("FeatureGuard initialized");
    }

    // Delegate to resolver
    async resolveFeatures(tenantId: string): Promise<Set<string>> {
        return this.resolver.resolveFeatures(tenantId);
    }

    async check(tenantId: string, featureKey: string): Promise<void> {
        this.logger.debug('Checking feature access', { tenantId, featureKey });

        // Use resolver to get features
        const features = await this.resolveFeatures(tenantId);

        if (!features.has(featureKey)) {
            this.logger.warn('Feature access denied', { tenantId, featureKey });

            // Emitir evento de bloqueio de feature
            LogSafe.emit(SecurityEventType.FEATURE_DISABLED_BLOCK, {
                tenantId,
                actorType: ActorType.TENANT_USER,
                errorCode: ErrorCode.FEATURE_DISABLED,
                metadata: { featureKey },
            });

            throw new AppError(
                ErrorCode.FEATURE_DISABLED,
                `Feature ${featureKey} is not enabled`,
                403
            );
        }
    }
}
