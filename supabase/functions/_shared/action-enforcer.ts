/**
 * LogSafe Guardian - Action Enforcer (Deno Version)
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
    ActionType,
    ActionLog,
    ActionStatus,
    CreatedByType,
    EnforcementState,
    TargetType,
    RateLimitScope,
    LockUserTempParams,
    RateLimitParams,
} from './types.ts';
import { Logger } from './logger.ts';

const logger = new Logger('LogSafe.ActionEnforcer');

export class ActionEnforcer {
    constructor(private client: SupabaseClient) { }

    async applyAction(
        action: ActionType,
        targetType: TargetType,
        targetId: string,
        params: Record<string, any>,
        reason: string,
        createdBy?: string,
        incidentId?: string,
    ): Promise<string | null> {
        try {
            const expiresAt = this.calculateExpiration(action, params);

            if (!expiresAt) {
                logger.error('Failed to calculate expiration', { action, params });
                return null;
            }

            const actionLog = {
                incident_id: incidentId,
                action_type: action,
                target_type: targetType,
                target_id: targetId,
                scope: params.scope as RateLimitScope | undefined,
                params_json: params,
                status: ActionStatus.APPLIED,
                created_by: createdBy,
                created_by_type: createdBy ? CreatedByType.SAAS_USER : CreatedByType.SYSTEM,
                applied_at: new Date(),
                expires_at: expiresAt,
            };

            const { data: logData, error: logError } = await this.client
                .from('logsafe_action_log')
                .insert(actionLog)
                .select()
                .single();

            if (logError || !logData) {
                logger.error('Failed to create action log', { error: logError?.message });
                return null;
            }

            const enforcementState = {
                action_log_id: logData.id,
                target_type: targetType,
                target_id: targetId,
                action_type: action,
                scope: params.scope as RateLimitScope | undefined,
                params_json: params,
                expires_at: expiresAt,
            };

            const { error: stateError } = await this.client
                .from('logsafe_enforcement_state')
                .insert(enforcementState);

            if (stateError) {
                logger.error('Failed to create enforcement state', { error: stateError.message });
            }

            logger.info('Action applied successfully', {
                actionType: action,
                targetType,
                targetId,
                expiresAt,
                createdBy,
            });

            return logData.id;
        } catch (error) {
            logger.error('Error applying action', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    async checkEnforcement(
        targetType: TargetType,
        targetId: string,
        scope?: RateLimitScope,
    ): Promise<EnforcementState | null> {
        try {
            let query = this.client
                .from('logsafe_enforcement_state')
                .select('*')
                .eq('target_type', targetType)
                .eq('target_id', targetId)
                .gt('expires_at', new Date().toISOString());

            if (scope) {
                query = query.eq('scope', scope);
            }

            const { data, error } = await query.maybeSingle();

            if (error) {
                logger.error('Error checking enforcement', { error: error.message });
                return null;
            }

            return data;
        } catch (error) {
            logger.error('Error checking enforcement', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    async revokeAction(actionLogId: string, reason: string, revokedBy: string): Promise<boolean> {
        try {
            const { error: logError } = await this.client
                .from('logsafe_action_log')
                .update({
                    status: ActionStatus.REVERTED,
                    ended_at: new Date().toISOString(),
                })
                .eq('id', actionLogId);

            if (logError) {
                logger.error('Failed to update action log', { error: logError.message });
                return false;
            }

            const { error: stateError } = await this.client
                .from('logsafe_enforcement_state')
                .delete()
                .eq('action_log_id', actionLogId);

            if (stateError) {
                logger.error('Failed to delete enforcement state', { error: stateError.message });
            }

            logger.info('Action revoked successfully', {
                actionLogId,
                reason,
                revokedBy,
            });

            return true;
        } catch (error) {
            logger.error('Error revoking action', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    async cleanupExpired(): Promise<number> {
        try {
            const now = new Date().toISOString();

            const { error: logError } = await this.client
                .from('logsafe_action_log')
                .update({
                    status: ActionStatus.EXPIRED,
                    ended_at: now,
                })
                .eq('status', ActionStatus.APPLIED)
                .lt('expires_at', now);

            if (logError) {
                logger.error('Failed to update expired action logs', { error: logError.message });
            }

            const { data, error: stateError } = await this.client
                .from('logsafe_enforcement_state')
                .delete()
                .lt('expires_at', now)
                .select('id');

            if (stateError) {
                logger.error('Failed to delete expired enforcement states', {
                    error: stateError.message,
                });
                return 0;
            }

            const count = data?.length || 0;
            if (count > 0) {
                logger.info('Cleanup completed', { expiredEnforcements: count });
            }

            return count;
        } catch (error) {
            logger.error('Error cleaning up expired enforcements', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return 0;
        }
    }

    private calculateExpiration(action: ActionType, params: Record<string, any>): Date | null {
        const now = new Date();

        switch (action) {
            case ActionType.LOCK_USER_TEMP: {
                const lockParams = params as LockUserTempParams;
                const minutes = lockParams.durationMinutes || 10;
                return new Date(now.getTime() + minutes * 60 * 1000);
            }

            case ActionType.RATE_LIMIT: {
                const rateLimitParams = params as RateLimitParams;
                const hours = rateLimitParams.durationHours || 1;
                return new Date(now.getTime() + hours * 60 * 60 * 1000);
            }

            case ActionType.REQUIRE_REAUTH: {
                return new Date(now.getTime() + 60 * 60 * 1000);
            }

            default:
                logger.warn('Unknown action type', { action });
                return null;
        }
    }
}
