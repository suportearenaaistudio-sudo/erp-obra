/**
 * Audit Helpers
 * 
 * Query and analyze security audit logs
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface AuditLogQuery {
    tenantId?: string;
    userId?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    severity?: 'low' | 'medium' | 'high';
    limit?: number;
}

export interface AuditLogSummary {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentEvents: any[];
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(
    supabase: SupabaseClient,
    query: AuditLogQuery
): Promise<any[]> {
    let queryBuilder = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(query.limit || 100);

    if (query.tenantId) {
        queryBuilder = queryBuilder.eq('tenant_id', query.tenantId);
    }

    if (query.userId) {
        queryBuilder = queryBuilder.eq('actor_id', query.userId);
    }

    if (query.eventType) {
        queryBuilder = queryBuilder.ilike('event_type', `%${query.eventType}%`);
    }

    if (query.startDate) {
        queryBuilder = queryBuilder.gte('created_at', query.startDate);
    }

    if (query.endDate) {
        queryBuilder = queryBuilder.lte('created_at', query.endDate);
    }

    if (query.severity) {
        queryBuilder = queryBuilder.eq('severity', query.severity);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;
    return data || [];
}

/**
 * Get audit log summary for a tenant
 */
export async function getAuditSummary(
    supabase: SupabaseClient,
    tenantId: string,
    days: number = 30
): Promise<AuditLogSummary> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await queryAuditLogs(supabase, {
        tenantId,
        startDate: startDate.toISOString(),
        limit: 1000,
    });

    // Count by type
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    logs.forEach(log => {
        // Count by type
        const type = log.event_type || 'UNKNOWN';
        eventsByType[type] = (eventsByType[type] || 0) + 1;

        // Count by severity
        const severity = log.severity || 'low';
        eventsBySeverity[severity] = (eventsBySeverity[severity] || 0) + 1;
    });

    return {
        totalEvents: logs.length,
        eventsByType,
        eventsBySeverity,
        recentEvents: logs.slice(0, 10),
    };
}

/**
 * Get security events (high priority)
 */
export async function getSecurityEvents(
    supabase: SupabaseClient,
    tenantId?: string,
    limit: number = 50
): Promise<any[]> {
    return queryAuditLogs(supabase, {
        tenantId,
        eventType: 'SECURITY',
        severity: 'high',
        limit,
    });
}

/**
 * Get impersonation history
 */
export async function getImpersonationHistory(
    supabase: SupabaseClient,
    tenantId?: string,
    limit: number = 50
): Promise<any[]> {
    return queryAuditLogs(supabase, {
        tenantId,
        eventType: 'IMPERSONATION',
        limit,
    });
}

/**
 * Get AI security events (PII, injection attempts)
 */
export async function getAISecurityEvents(
    supabase: SupabaseClient,
    tenantId?: string,
    limit: number = 50
): Promise<any[]> {
    return queryAuditLogs(supabase, {
        tenantId,
        eventType: 'AI_SECURITY',
        limit,
    });
}

/**
 * Export audit logs to CSV
 */
export function exportAuditLogsToCSV(logs: any[]): string {
    if (logs.length === 0) return '';

    const headers = ['Timestamp', 'Event Type', 'Tenant ID', 'User ID', 'Severity', 'Metadata'];
    const rows = logs.map(log => [
        log.created_at,
        log.event_type,
        log.tenant_id || '',
        log.actor_id || '',
        log.severity || 'low',
        JSON.stringify(log.metadata || {}),
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
}
