/**
 * LogSafe Guardian v0.1 - Policy Engine
 * Motor de avaliação de políticas de segurança
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
    Policy,
    PolicyEvaluationResult,
    PolicyGroupBy,
    Incident,
    IncidentStatus,
    SecurityEventType,
} from './types';
import { ActionEnforcer } from './action-enforcer';
import { Logger } from '../../shared/logging/logger';

const logger = new Logger('LogSafe.PolicyEngine');

/**
 * Policy Engine
 * Avalia políticas contra eventos recentes e cria incidentes
 */
export class PolicyEngine {
    private actionEnforcer: ActionEnforcer;

    constructor(private client: SupabaseClient) {
        this.actionEnforcer = new ActionEnforcer(client);
    }

    /**
     * Avalia uma política específica
     * @param policy Política a avaliar
     * @returns Resultado da avaliação
     */
    async evaluatePolicy(policy: Policy): Promise<PolicyEvaluationResult> {
        try {
            logger.debug('Evaluating policy', { policyName: policy.name });

            // Buscar eventos na janela de tempo
            const windowStart = new Date(Date.now() - policy.windowSeconds * 1000);

            const { data: events, error } = await this.client
                .from('logsafe_event')
                .select('*')
                .eq('event_type', policy.eventType)
                .gte('created_at', windowStart.toISOString());

            if (error) {
                logger.error('Error fetching events for policy', {
                    policyName: policy.name,
                    error: error.message,
                });
                return {
                    policyId: policy.id!,
                    policyName: policy.name,
                    triggered: false,
                    eventCount: 0,
                    threshold: policy.threshold,
                    reason: 'Error fetching events',
                };
            }

            if (!events || events.length === 0) {
                return {
                    policyId: policy.id!,
                    policyName: policy.name,
                    triggered: false,
                    eventCount: 0,
                    threshold: policy.threshold,
                };
            }

            // Agrupar eventos conforme policy.groupBy
            const groups = this.groupEvents(events, policy.groupBy);

            // Verificar se algum grupo excedeu o threshold
            for (const [groupKey, groupEvents] of Object.entries(groups)) {
                if (groupEvents.length >= policy.threshold) {
                    // Threshold excedido!
                    logger.info('Policy threshold exceeded', {
                        policyName: policy.name,
                        groupKey,
                        eventCount: groupEvents.length,
                        threshold: policy.threshold,
                    });

                    // Verificar cooldown
                    const inCooldown = await this.checkCooldown(policy);
                    if (inCooldown) {
                        logger.debug('Policy in cooldown, skipping incident creation', {
                            policyName: policy.name,
                        });
                        return {
                            policyId: policy.id!,
                            policyName: policy.name,
                            triggered: true,
                            eventCount: groupEvents.length,
                            threshold: policy.threshold,
                            reason: 'In cooldown period',
                        };
                    }

                    // Criar incidente
                    const incidentId = await this.createIncident(policy, groupEvents, groupKey);

                    // Aplicar ação se configurada
                    let actionLogId: string | null = null;
                    if (policy.actionType && incidentId) {
                        actionLogId = await this.applyPolicyAction(
                            policy,
                            groupKey,
                            groupEvents,
                            incidentId,
                        );
                    }

                    return {
                        policyId: policy.id!,
                        policyName: policy.name,
                        triggered: true,
                        eventCount: groupEvents.length,
                        threshold: policy.threshold,
                        incidentId,
                        actionLogId: actionLogId || undefined,
                    };
                }
            }

            // Nenhum grupo excedeu threshold
            return {
                policyId: policy.id!,
                policyName: policy.name,
                triggered: false,
                eventCount: events.length,
                threshold: policy.threshold,
            };
        } catch (error) {
            logger.error('Error evaluating policy', {
                policyName: policy.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return {
                policyId: policy.id!,
                policyName: policy.name,
                triggered: false,
                eventCount: 0,
                threshold: policy.threshold,
                reason: 'Evaluation error',
            };
        }
    }

    /**
     * Agrupa eventos conforme estratégia
     * @param events Eventos
     * @param groupBy Estratégia de agrupamento
     * @returns Mapa de grupos
     */
    private groupEvents(events: any[], groupBy: PolicyGroupBy): Record<string, any[]> {
        const groups: Record<string, any[]> = {};

        for (const event of events) {
            let groupKey: string;

            switch (groupBy) {
                case PolicyGroupBy.IP:
                    groupKey = event.ip_hash || 'unknown_ip';
                    break;

                case PolicyGroupBy.ACTOR:
                    groupKey = event.actor_id || 'unknown_actor';
                    break;

                case PolicyGroupBy.TENANT:
                    groupKey = event.tenant_id || 'unknown_tenant';
                    break;

                case PolicyGroupBy.IP_OR_ACTOR:
                    // Se tem actor_id, agrupa por ele, senão por IP
                    groupKey = event.actor_id || event.ip_hash || 'unknown';
                    break;

                default:
                    groupKey = 'default';
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(event);
        }

        return groups;
    }

    /**
     * Verifica se política está em cooldown
     * @param policy Política
     * @returns true se em cooldown
     */
    private async checkCooldown(policy: Policy): Promise<boolean> {
        if (!policy.cooldownSeconds) {
            return false;
        }

        const cooldownStart = new Date(Date.now() - policy.cooldownSeconds * 1000);

        const { data, error } = await this.client
            .from('logsafe_incident')
            .select('id')
            .eq('policy_id', policy.id)
            .gte('created_at', cooldownStart.toISOString())
            .limit(1);

        if (error) {
            logger.error('Error checking cooldown', { error: error.message });
            return false;
        }

        return data && data.length > 0;
    }

    /**
     * Cria um incidente
     * @param policy Política
     * @param events Eventos de evidência
     * @param groupKey Chave do grupo
     * @returns ID do incidente criado
     */
    private async createIncident(
        policy: Policy,
        events: any[],
        groupKey: string,
    ): Promise<string | null> {
        try {
            const firstEvent = events[0];
            const lastEvent = events[events.length - 1];

            const incident = {
                tenant_id: firstEvent.tenant_id,
                policy_id: policy.id,
                type: policy.name,
                severity: policy.severity,
                status: IncidentStatus.OPEN,
                summary: `${policy.name}: ${events.length} eventos detectados (threshold: ${policy.threshold})`,
                evidence_event_ids: events.map((e) => e.id),
                first_seen_at: new Date(events[0].created_at),
                last_seen_at: new Date(events[events.length - 1].created_at),
            };

            const { data, error } = await this.client
                .from('logsafe_incident')
                .insert(incident)
                .select()
                .single();

            if (error || !data) {
                logger.error('Failed to create incident', { error: error?.message });
                return null;
            }

            logger.info('Incident created', {
                incidentId: data.id,
                policyName: policy.name,
                eventCount: events.length,
            });

            return data.id;
        } catch (error) {
            logger.error('Error creating incident', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    /**
     * Aplica ação configurada na política
     * @param policy Política
     * @param groupKey Chave do grupo
     * @param events Eventos
     * @param incidentId ID do incidente
     * @returns ID do action_log ou null
     */
    private async applyPolicyAction(
        policy: Policy,
        groupKey: string,
        events: any[],
        incidentId: string,
    ): Promise<string | null> {
        if (!policy.actionType) {
            return null;
        }

        try {
            // Determinar target baseado no groupBy
            const firstEvent = events[0];
            let targetType: any;
            let targetId: string;

            switch (policy.groupBy) {
                case PolicyGroupBy.IP:
                    targetType = 'IP';
                    targetId = groupKey;
                    break;

                case PolicyGroupBy.ACTOR:
                case PolicyGroupBy.IP_OR_ACTOR:
                    targetType = firstEvent.actor_type === 'TENANT_USER' ? 'TENANT_USER' : 'IP';
                    targetId = groupKey;
                    break;

                case PolicyGroupBy.TENANT:
                    targetType = 'TENANT';
                    targetId = groupKey;
                    break;

                default:
                    logger.warn('Unknown group_by for action', { groupBy: policy.groupBy });
                    return null;
            }

            // Aplicar ação
            const actionLogId = await this.actionEnforcer.applyAction(
                policy.actionType,
                targetType,
                targetId,
                policy.actionParamsJson || {},
                `Automatic action from policy: ${policy.name}`,
                undefined, // Sistema (não é SaaS user)
                incidentId,
            );

            return actionLogId;
        } catch (error) {
            logger.error('Error applying policy action', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    /**
     * Avalia todas as políticas ativas
     * @returns Array de resultados
     */
    async evaluateAllPolicies(): Promise<PolicyEvaluationResult[]> {
        try {
            const { data: policies, error } = await this.client
                .from('logsafe_policy')
                .select('*')
                .eq('enabled', true);

            if (error) {
                logger.error('Error fetching policies', { error: error.message });
                return [];
            }

            if (!policies || policies.length === 0) {
                logger.debug('No enabled policies to evaluate');
                return [];
            }

            logger.info('Evaluating policies', { count: policies.length });

            const results: PolicyEvaluationResult[] = [];
            for (const row of policies) {
                const p = row as any;
                const policy: Policy = {
                    id: p.id,
                    name: p.name,
                    enabled: p.enabled,
                    eventType: p.event_type,
                    severity: p.severity,
                    windowSeconds: p.window_seconds,
                    threshold: p.threshold,
                    groupBy: p.group_by,
                    actionType: p.action_type,
                    actionParamsJson: p.action_params_json,
                    cooldownSeconds: p.cooldown_seconds,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                };

                const result = await this.evaluatePolicy(policy);
                results.push(result);
            }

            const triggered = results.filter((r) => r.triggered).length;
            logger.info('Policy evaluation completed', {
                totalPolicies: policies.length,
                triggeredPolicies: triggered,
            });

            return results;
        } catch (error) {
            logger.error('Error evaluating all policies', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return [];
        }
    }
}
