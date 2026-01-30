/**
 * LogSafe Guardian - Policy Engine (Deno Version)
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
    Policy,
    PolicyEvaluationResult,
    PolicyGroupBy,
    IncidentStatus,
} from './types.ts';
import { ActionEnforcer } from './action-enforcer.ts';
import { Logger } from './logger.ts';

const logger = new Logger('LogSafe.PolicyEngine');

export class PolicyEngine {
    private actionEnforcer: ActionEnforcer;

    constructor(private client: SupabaseClient) {
        this.actionEnforcer = new ActionEnforcer(client);
    }

    async evaluatePolicy(policy: Policy): Promise<PolicyEvaluationResult> {
        try {
            logger.debug('Evaluating policy', { policyName: policy.name });

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

            const groups = this.groupEvents(events, policy.groupBy);

            for (const [groupKey, groupEvents] of Object.entries(groups)) {
                if (groupEvents.length >= policy.threshold) {
                    logger.info('Policy threshold exceeded', {
                        policyName: policy.name,
                        groupKey,
                        eventCount: groupEvents.length,
                        threshold: policy.threshold,
                    });

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

                    const incidentId = await this.createIncident(policy, groupEvents, groupKey);

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
                        incidentId: incidentId || undefined,
                        actionLogId: actionLogId || undefined,
                    };
                }
            }

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

    private async createIncident(
        policy: Policy,
        events: any[],
        groupKey: string,
    ): Promise<string | null> {
        try {
            const incident = {
                tenant_id: events[0].tenant_id,
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

            const actionLogId = await this.actionEnforcer.applyAction(
                policy.actionType,
                targetType,
                targetId,
                policy.actionParamsJson || {},
                `Automatic action from policy: ${policy.name}`,
                undefined,
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
