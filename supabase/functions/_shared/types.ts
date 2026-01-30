/**
 * LogSafe Guardian v0.1 - Type Definitions
 * Deno compatible
 */

export enum SecurityEventType {
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    AUTH_DENIED = 'AUTH_DENIED',
    FEATURE_DISABLED_BLOCK = 'FEATURE_DISABLED_BLOCK',
    SUBSCRIPTION_BLOCK = 'SUBSCRIPTION_BLOCK',
    CROSS_TENANT_ATTEMPT = 'CROSS_TENANT_ATTEMPT',
    EXPORT_REQUESTED = 'EXPORT_REQUESTED',
    AI_REQUEST = 'AI_REQUEST',
    IMPERSONATION_STARTED = 'IMPERSONATION_STARTED',
    IMPERSONATION_ENDED = 'IMPERSONATION_ENDED',
}

export enum ActorType {
    TENANT_USER = 'TENANT_USER',
    SAAS_USER = 'SAAS_USER',
    ANON = 'ANON',
    SYSTEM = 'SYSTEM',
}

export enum IncidentSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

export enum IncidentStatus {
    OPEN = 'OPEN',
    ACK = 'ACK',
    RESOLVED = 'RESOLVED',
}

export enum ActionType {
    LOCK_USER_TEMP = 'LOCK_USER_TEMP',
    RATE_LIMIT = 'RATE_LIMIT',
    REQUIRE_REAUTH = 'REQUIRE_REAUTH',
}

export enum TargetType {
    TENANT_USER = 'TENANT_USER',
    TENANT = 'TENANT',
    IP = 'IP',
    ENDPOINT_GROUP = 'ENDPOINT_GROUP',
}

export enum ActionStatus {
    APPLIED = 'APPLIED',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED',
    REVERTED = 'REVERTED',
}

export enum CreatedByType {
    SYSTEM = 'SYSTEM',
    SAAS_USER = 'SAAS_USER',
}

export enum PolicyGroupBy {
    IP = 'IP',
    ACTOR = 'ACTOR',
    TENANT = 'TENANT',
    IP_OR_ACTOR = 'IP_OR_ACTOR',
}

export enum RateLimitScope {
    AUTH = 'AUTH',
    AI = 'AI',
    EXPORTS = 'EXPORTS',
    GLOBAL = 'GLOBAL',
}

export interface SecurityEvent {
    id?: string;
    tenantId?: string;
    actorType: ActorType;
    actorId?: string;
    ipHash?: string;
    userAgent?: string;
    route?: string;
    method?: string;
    statusCode?: number;
    errorCode?: string;
    eventType: SecurityEventType;
    traceId?: string;
    metadataJson?: Record<string, any>;
    createdAt?: Date;
}

export interface Policy {
    id?: string;
    name: string;
    enabled: boolean;
    eventType: SecurityEventType;
    severity: IncidentSeverity;
    windowSeconds: number;
    threshold: number;
    groupBy: PolicyGroupBy;
    actionType?: ActionType;
    actionParamsJson?: Record<string, any>;
    cooldownSeconds: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Incident {
    id?: string;
    tenantId?: string;
    policyId?: string;
    type: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    summary: string;
    evidenceEventIds: string[];
    firstSeenAt: Date;
    lastSeenAt: Date;
    resolvedAt?: Date;
    resolvedBy?: string;
    resolutionNotes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ActionLog {
    id?: string;
    incidentId?: string;
    actionType: ActionType;
    targetType: TargetType;
    targetId: string;
    scope?: RateLimitScope;
    paramsJson?: Record<string, any>;
    status: ActionStatus;
    createdBy?: string;
    createdByType: CreatedByType;
    appliedAt: Date;
    expiresAt: Date;
    endedAt?: Date;
    createdAt?: Date;
}

export interface EnforcementState {
    id?: string;
    actionLogId: string;
    targetType: TargetType;
    targetId: string;
    actionType: ActionType;
    scope?: RateLimitScope;
    paramsJson?: Record<string, any>;
    expiresAt: Date;
    createdAt?: Date;
}

export interface EmitEventPayload {
    tenantId?: string;
    actorType: ActorType;
    actorId?: string;
    ip?: string;
    userAgent?: string;
    route?: string;
    method?: string;
    statusCode?: number;
    errorCode?: string;
    traceId?: string;
    metadata?: Record<string, any>;
}

export interface PolicyEvaluationResult {
    policyId: string;
    policyName: string;
    triggered: boolean;
    eventCount: number;
    threshold: number;
    incidentId?: string;
    actionLogId?: string;
    reason?: string;
}

export interface LockUserTempParams {
    durationMinutes: number;
}

export interface RateLimitParams {
    scope: RateLimitScope;
    maxPerHour?: number;
    maxPerMinute?: number;
    durationHours: number;
}

export interface RequireReauthParams {
    // Sem parâmetros
}
