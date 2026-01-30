/**
 * LogSafe - Service para APIs do Dev Admin
 */

import { supabase } from '@/lib/supabase';

// ========================================
// TIPOS
// ========================================

export interface LogSafeIncident {
    id: string;
    tenant_id?: string;
    policy_id?: string;
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'OPEN' | 'ACK' | 'RESOLVED';
    summary: string;
    evidence_event_ids: string[];
    first_seen_at: string;
    last_seen_at: string;
    resolved_at?: string;
    resolved_by?: string;
    resolution_notes?: string;
    created_at: string;
    updated_at: string;
    logsafe_policy?: {
        name: string;
        event_type: string;
        threshold: number;
    };
}

export interface LogSafeEvent {
    id: string;
    tenant_id?: string;
    actor_type: string;
    actor_id?: string;
    ip_hash?: string;
    user_agent?: string;
    route?: string;
    method?: string;
    status_code?: number;
    error_code?: string;
    event_type: string;
    trace_id?: string;
    metadata_json?: Record<string, any>;
    created_at: string;
}

export interface LogSafePolicy {
    id: string;
    name: string;
    enabled: boolean;
    event_type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    window_seconds: number;
    threshold: number;
    group_by: string;
    action_type?: string;
    action_params_json?: Record<string, any>;
    cooldown_seconds: number;
    created_at: string;
    updated_at: string;
}

export interface LogSafeActionLog {
    id: string;
    incident_id?: string;
    action_type: string;
    target_type: string;
    target_id: string;
    scope?: string;
    params_json?: Record<string, any>;
    status: string;
    created_by?: string;
    created_by_type: string;
    applied_at: string;
    expires_at: string;
    ended_at?: string;
    created_at: string;
}

// ========================================
// INCIDENTES
// ========================================

export const LogSafeIncidentsService = {
    /**
     * Listar incidentes
     */
    async list(filters?: {
        tenantId?: string;
        severity?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
        offset?: number;
    }) {
        const params = new URLSearchParams();
        if (filters?.tenantId) params.append('tenantId', filters.tenantId);
        if (filters?.severity) params.append('severity', filters.severity);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.offset) params.append('offset', filters.offset.toString());

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/incidents?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            }
        );

        if (!response.ok) throw new Error('Failed to fetch incidents');
        return response.json();
    },

    /**
     * Obter detalhes do incidente
     */
    async getDetails(incidentId: string) {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/incidents/${incidentId}`,
            {
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            }
        );

        if (!response.ok) throw new Error('Failed to fetch incident details');
        return response.json();
    },

    /**
     * Reconhecer incidente
     */
    async acknowledge(incidentId: string) {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/incidents/${incidentId}/ack`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) throw new Error('Failed to acknowledge incident');
        return response.json();
    },

    /**
     * Resolver incidente
     */
    async resolve(incidentId: string, resolutionNotes: string) {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/incidents/${incidentId}/resolve`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ resolutionNotes }),
            }
        );

        if (!response.ok) throw new Error('Failed to resolve incident');
        return response.json();
    },

    /**
     * Aplicar ação manual
     */
    async applyAction(
        incidentId: string,
        action: {
            actionType: string;
            targetType: string;
            targetId: string;
            params: Record<string, any>;
            reason: string;
        }
    ) {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/incidents/${incidentId}/actions`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(action),
            }
        );

        if (!response.ok) throw new Error('Failed to apply action');
        return response.json();
    },
};

// ========================================
// POLÍTICAS
// ========================================

export const LogSafePoliciesService = {
    /**
     * Listar políticas
     */
    async list() {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/policies`,
            {
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            }
        );

        if (!response.ok) throw new Error('Failed to fetch policies');
        return response.json();
    },

    /**
     * Habilitar política
     */
    async enable(policyId: string) {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/policies/${policyId}/enable`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            }
        );

        if (!response.ok) throw new Error('Failed to enable policy');
        return response.json();
    },

    /**
     * Desabilitar política
     */
    async disable(policyId: string) {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/policies/${policyId}/disable`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            }
        );

        if (!response.ok) throw new Error('Failed to disable policy');
        return response.json();
    },

    /**
     * Atualizar política
     */
    async update(policyId: string, updates: Partial<LogSafePolicy>) {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/policies/${policyId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            }
        );

        if (!response.ok) throw new Error('Failed to update policy');
        return response.json();
    },
};

// ========================================
// EVENTOS
// ========================================

export const LogSafeEventsService = {
    /**
     * Buscar eventos
     */
    async search(filters?: {
        tenantId?: string;
        actorId?: string;
        ipHash?: string;
        eventType?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
        offset?: number;
    }) {
        const params = new URLSearchParams();
        if (filters?.tenantId) params.append('tenantId', filters.tenantId);
        if (filters?.actorId) params.append('actorId', filters.actorId);
        if (filters?.ipHash) params.append('ipHash', filters.ipHash);
        if (filters?.eventType) params.append('eventType', filters.eventType);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.offset) params.append('offset', filters.offset.toString());

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/events?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            }
        );

        if (!response.ok) throw new Error('Failed to search events');
        return response.json();
    },

    /**
     * Timeline de eventos
     */
    async timeline(params: {
        tenantId?: string;
        actorId?: string;
        ipHash?: string;
        hours?: number;
    }) {
        const queryParams = new URLSearchParams();
        if (params.tenantId) queryParams.append('tenantId', params.tenantId);
        if (params.actorId) queryParams.append('actorId', params.actorId);
        if (params.ipHash) queryParams.append('ipHash', params.ipHash);
        if (params.hours) queryParams.append('hours', params.hours.toString());

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/events/timeline?${queryParams}`,
            {
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            }
        );

        if (!response.ok) throw new Error('Failed to fetch timeline');
        return response.json();
    },

    /**
     * Estatísticas
     */
    async stats(hours: number = 24) {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/saas/logsafe/events/stats?hours=${hours}`,
            {
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            }
        );

        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    },
};
