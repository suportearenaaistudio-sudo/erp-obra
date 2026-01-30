import { SupabaseClient } from '@supabase/supabase-js';
import { AppError, ErrorCode } from '../errors/errors';
import { Logger } from '../logging/logger';

export class SaasAuthGuard {
    private logger = new Logger('SaasAuthGuard');

    constructor(private client: SupabaseClient) { }

    /**
     * Verify if the current user is a valid SaaS Admin/Support user.
     * Checks if the user's email exists in the 'saas_users' table and is active.
     */
    async check(userId: string, email: string): Promise<void> {
        this.logger.debug('Checking SaaS admin access', { userId, email });

        if (!email) {
            this.logger.warn('SaaS check failed: No email provided', { userId });
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Email required for SaaS verification', 401);
        }

        const { data: saasUser, error } = await this.client
            .from('saas_users')
            .select('role, active')
            .eq('email', email)
            .single();

        if (error || !saasUser) {
            this.logger.warn('User is not a SaaS admin', { userId, email });
            throw new AppError(ErrorCode.FORBIDDEN, 'Access denied: Not a SaaS Admin', 403);
        }

        if (!saasUser.active) {
            this.logger.warn('SaaS admin account is inactive', { userId, email });
            throw new AppError(ErrorCode.FORBIDDEN, 'SaaS Admin account is inactive', 403);
        }

        this.logger.info('SaaS Admin access granted', { userId, email, role: saasUser.role });
    }
}
