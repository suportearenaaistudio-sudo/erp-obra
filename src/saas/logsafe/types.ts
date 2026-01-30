/**
 * LogSafe Guardian v0.1 - Type Definitions
 * Security Control Plane tipos e enums
 */

// =============================================
// ENUMS
// =============================================

/**
 * Tipos de eventos de segurança
 */
export enum SecurityEventType {
    // Autenticação
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',

    // Acesso Negado
    AUTH_DENIED = 'AUTH_DENIED',

    // Feature e Subscription
    FEATURE_DISABLED_BLOCK = 'FEATURE_DISABLED_BLOCK',
    SUBSCRIPTION_BLOCK = 'SUBSCRIPTION_BLOCK',

    // Cross-Tenant
    CROSS_TENANT_ATTEMPT = 'CROSS_TENANT_ATTEMPT',

    // Exportações
    EXPORT_REQUESTED = 'EXPORT_REQUESTED',

    // IA
    AI_REQUEST = 'AI_REQUEST',

    // Impersonation
    IMPERSONATION_STARTED = 'IMPERSONATION_STARTED',
    IMPERSONATION_ENDED = 'IMPERSONATION_ENDED',
}

/**
 * Tipo de ator (quem gerou o evento)
 */
export enum ActorType {
    TENANT_USER = 'TENANT_USER', // Usuário do tenant
    SAAS_USER = 'SAAS_USER',     // Dev Admin/Support
    ANON = 'ANON',               // Não autenticado
    SYSTEM = 'SYSTEM',           // Sistema/Job
}

/**
 * Severidade do incidente
 */
export enum IncidentSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

/**
 * Status do incidente
 */
export enum IncidentStatus {
    OPEN = 'OPEN',         // Novo incidente
    ACK = 'ACK',           // Reconhecido pelo Dev Admin
    RESOLVED = 'RESOLVED', // Resolvido
}

/**
 * Tipos de ação de enforcement
 */
export enum ActionType {
    LOCK_USER_TEMP = 'LOCK_USER_TEMP',   // Bloqueia usuário temporariamente
    RATE_LIMIT = 'RATE_LIMIT',           // Limita taxa de requisições
    REQUIRE_REAUTH = 'REQUIRE_REAUTH',   // Força reautenticação
}

/**
 * Tipo de alvo da ação
 */
export enum TargetType {
    TENANT_USER = 'TENANT_USER',
    TENANT = 'TENANT',
    IP = 'IP',
    ENDPOINT_GROUP = 'ENDPOINT_GROUP',
}

/**
 * Status da ação
 */
export enum ActionStatus {
    APPLIED = 'APPLIED',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED',
    REVERTED = 'REVERTED',
}

/**
 * Tipo de criador da ação
 */
export enum CreatedByType {
    SYSTEM = 'SYSTEM',
    SAAS_USER = 'SAAS_USER',
}

/**
 * Como agrupar eventos nas políticas
 */
export enum PolicyGroupBy {
    IP = 'IP',
    ACTOR = 'ACTOR',
    TENANT = 'TENANT',
    IP_OR_ACTOR = 'IP_OR_ACTOR',
}

/**
 * Escopo de rate limit
 */
export enum RateLimitScope {
    AUTH = 'AUTH',
    AI = 'AI',
    EXPORTS = 'EXPORTS',
    GLOBAL = 'GLOBAL',
}

// =============================================
// INTERFACES
// =============================================

/**
 * Evento de segurança
 */
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

/**
 * Política de segurança
 */
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

/**
 * Incidente de segurança
 */
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

/**
 * Log de ação
 */
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

/**
 * Estado de enforcement ativo
 */
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

/**
 * Payload para emissão de evento
 */
export interface EmitEventPayload {
    tenantId?: string;
    actorType: ActorType;
    actorId?: string;
    ip?: string; // Será hashado
    userAgent?: string;
    route?: string;
    method?: string;
    statusCode?: number;
    errorCode?: string;
    traceId?: string;
    metadata?: Record<string, any>; // Será sanitizado
}

/**
 * Resultado da avaliação de política
 */
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

/**
 * Parâmetros de ação LOCK_USER_TEMP
 */
export interface LockUserTempParams {
    durationMinutes: number;
}

/**
 * Parâmetros de ação RATE_LIMIT
 */
export interface RateLimitParams {
    scope: RateLimitScope;
    maxPerHour?: number;
    maxPerMinute?: number;
    durationHours: number;
}

/**
 * Parâmetros de ação REQUIRE_REAUTH (vazio)
 */
export interface RequireReauthParams {
    // Sem parâmetros
}
