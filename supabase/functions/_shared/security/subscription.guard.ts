import { SupabaseClient } from '@supabase/supabase-js';
import { AppError, ErrorCode } from '../errors/errors';
import { Logger } from '../logging/logger';

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
            throw new AppError(
                subscription.status === 'canceled'
                    ? ErrorCode.SUBSCRIPTION_CANCELED
                    : ErrorCode.SUBSCRIPTION_SUSPENDED,
                `Subscription is ${subscription.status}`,
                403
            );
        }
    }
}
