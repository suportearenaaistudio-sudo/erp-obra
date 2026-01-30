/**
 * Support Session Logger
 * 
 * Utility to log actions during impersonation sessions
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../shared/logging/logger';

export interface SessionLogEntry {
    session_id: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    details?: Record<string, any>;
}

export class SupportSessionLogger {
    private logger: Logger;

    constructor(private supabase: SupabaseClient) {
        this.logger = new Logger('SupportSessionLogger');
    }

    /**
     * Log an action during an impersonation session
     */
    async logAction(entry: SessionLogEntry): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('support_session_logs')
                .insert({
                    session_id: entry.session_id,
                    action: entry.action,
                    entity_type: entry.entity_type,
                    entity_id: entry.entity_id,
                    details: entry.details,
                    created_at: new Date().toISOString(),
                });

            if (error) {
                this.logger.error('Failed to log support session action', {
                    error,
                    sessionId: entry.session_id,
                    action: entry.action,
                });
            } else {
                this.logger.debug('Support session action logged', {
                    sessionId: entry.session_id,
                    action: entry.action,
                });
            }
        } catch (err) {
            this.logger.error('Exception logging support session action', {
                error: err,
                sessionId: entry.session_id,
            });
        }
    }

    /**
     * Get all logs for a session
     */
    async getSessionLogs(sessionId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('support_session_logs')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) {
            this.logger.error('Failed to fetch session logs', { error, sessionId });
            return [];
        }

        return data || [];
    }

    /**
     * Get session statistics
     */
    async getSessionStats(sessionId: string): Promise<{
        total_actions: number;
        unique_entities: number;
        actions_by_type: Record<string, number>;
    }> {
        const logs = await this.getSessionLogs(sessionId);

        const actionsByType: Record<string, number> = {};
        const uniqueEntities = new Set<string>();

        logs.forEach(log => {
            // Count actions by type
            actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;

            // Track unique entities
            if (log.entity_id) {
                uniqueEntities.add(`${log.entity_type}:${log.entity_id}`);
            }
        });

        return {
            total_actions: logs.length,
            unique_entities: uniqueEntities.size,
            actions_by_type: actionsByType,
        };
    }
}
