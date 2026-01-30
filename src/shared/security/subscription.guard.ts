import { SupabaseClient } from '@supabase/supabase-js';
import { AppError, ErrorCode } from '../errors/errors';
import { Logger } from '../logging/logger';
import { LogSafe } from '../../saas/logsafe/emitter';
import { SecurityEventType, ActorType } from '../../saas/logsafe/types';

export class SubscriptionGuard {
    private logger = new Logger('SubscriptionGuard');

    constructor(private client: SupabaseClient) { }

    async check(tenantId: string): Promise<void> {
        this.logger.debug('Checking subscription status', { tenantId });

        const { data: subscription, error } = await this.client
            .from('subscriptions')
            .select('status')
            .eq('tenant_id', tenantId)
            .single();

        if (error || !subscription) {
            this.logger.warn('Subscription not found', { tenantId, error });
            throw new AppError(ErrorCode.SUBSCRIPTION_NOT_FOUND, 'Subscription not found', 403);
        }

        if (['canceled', 'suspended'].includes(subscription.status)) {
            this.logger.warn(`Subscription ${subscription.status}`, { tenantId });

            const errorCode = subscription.status === 'canceled'
                ? ErrorCode.SUBSCRIPTION_CANCELED
                : ErrorCode.SUBSCRIPTION_SUSPENDED;

            // Emitir evento de bloqueio de subscription
            LogSafe.emit(SecurityEventType.SUBSCRIPTION_BLOCK, {
                tenantId,
                actorType: ActorType.TENANT_USER,
                errorCode,
                metadata: { subscriptionStatus: subscription.status },
            });

            throw new AppError(
                errorCode,
                `Subscription is ${subscription.status}`,
                403
            );
        }
    }
}
