/**
 * LogSafe Guardian v0.1 - Enforcement Middleware
 * Verifica e aplica enforcements ativos (locks, rate limits)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { ActionEnforcer } from './action-enforcer';
import { TargetType, RateLimitScope, ActionType } from './types';
import { AppError, ErrorCode } from '../../shared/errors/errors';
import { Logger } from '../../shared/logging/logger';

const logger = new Logger('LogSafe.EnforcementMiddleware');

/**
 * Resultado da verificação de enforcement
 */
export interface EnforcementCheckResult {
    blocked: boolean;
    reason?: string;
    actionType?: ActionType;
    expiresAt?: Date;
    retryAfter?: number; // segundos
}

/**
 * Middleware de Enforcement
 * Verifica se há ações ativas que devem bloquear a requisição
 */
export class EnforcementMiddleware {
    private enforcer: ActionEnforcer;

    constructor(private client: SupabaseClient) {
        this.enforcer = new ActionEnforcer(client);
    }

    /**
     * Verifica enforcement para um usuário tenant
     * @param userId ID do usuário
     * @param scope Escopo da requisição (opcional)
     * @returns Resultado da verificação
     */
    async checkUserEnforcement(
        userId: string,
        scope?: RateLimitScope,
    ): Promise<EnforcementCheckResult> {
        // Verificar lock de usuário
        const lockEnforcement = await this.enforcer.checkEnforcement(
            TargetType.TENANT_USER,
            userId,
        );

        if (lockEnforcement && lockEnforcement.actionType === ActionType.LOCK_USER_TEMP) {
            const expiresAt = new Date(lockEnforcement.expiresAt);
            const now = new Date();
            const retryAfter = Math.ceil((expiresAt.getTime() - now.getTime()) / 1000);

            logger.info('User is locked', { userId, expiresAt, retryAfter });

            return {
                blocked: true,
                reason: 'Sua conta está temporariamente bloqueada devido à política de segurança',
                actionType: ActionType.LOCK_USER_TEMP,
                expiresAt,
                retryAfter,
            };
        }

        // Verificar rate limit (se escopo fornecido)
        if (scope) {
            const rateLimitEnforcement = await this.enforcer.checkEnforcement(
                TargetType.TENANT_USER,
                userId,
                scope,
            );

            if (rateLimitEnforcement && rateLimitEnforcement.actionType === ActionType.RATE_LIMIT) {
                const expiresAt = new Date(rateLimitEnforcement.expiresAt);
                const now = new Date();
                const retryAfter = Math.ceil((expiresAt.getTime() - now.getTime()) / 1000);

                logger.info('User rate limited', { userId, scope, expiresAt, retryAfter });

                return {
                    blocked: true,
                    reason: `Taxa de requisições excedida para ${scope}`,
                    actionType: ActionType.RATE_LIMIT,
                    expiresAt,
                    retryAfter,
                };
            }
        }

        // Verificar reauth necessário
        const reauthEnforcement = await this.enforcer.checkEnforcement(
            TargetType.TENANT_USER,
            userId,
        );

        if (reauthEnforcement && reauthEnforcement.actionType === ActionType.REQUIRE_REAUTH) {
            logger.info('User requires reauth', { userId });

            return {
                blocked: true,
                reason: 'Reautenticação necessária por motivos de segurança',
                actionType: ActionType.REQUIRE_REAUTH,
            };
        }

        return { blocked: false };
    }

    /**
     * Verifica enforcement para um IP
     * @param ipHash Hash do IP
     * @param scope Escopo da requisição (opcional)
     * @returns Resultado da verificação
     */
    async checkIPEnforcement(
        ipHash: string,
        scope?: RateLimitScope,
    ): Promise<EnforcementCheckResult> {
        if (scope) {
            const rateLimitEnforcement = await this.enforcer.checkEnforcement(
                TargetType.IP,
                ipHash,
                scope,
            );

            if (rateLimitEnforcement && rateLimitEnforcement.actionType === ActionType.RATE_LIMIT) {
                const expiresAt = new Date(rateLimitEnforcement.expiresAt);
                const now = new Date();
                const retryAfter = Math.ceil((expiresAt.getTime() - now.getTime()) / 1000);

                logger.info('IP rate limited', { ipHash, scope, expiresAt, retryAfter });

                return {
                    blocked: true,
                    reason: `Taxa de requisições excedida para ${scope}`,
                    actionType: ActionType.RATE_LIMIT,
                    expiresAt,
                    retryAfter,
                };
            }
        }

        return { blocked: false };
    }

    /**
     * Verifica enforcement para um tenant
     * @param tenantId ID do tenant
     * @param scope Escopo da requisição (opcional)
     * @returns Resultado da verificação
     */
    async checkTenantEnforcement(
        tenantId: string,
        scope?: RateLimitScope,
    ): Promise<EnforcementCheckResult> {
        if (scope) {
            const rateLimitEnforcement = await this.enforcer.checkEnforcement(
                TargetType.TENANT,
                tenantId,
                scope,
            );

            if (rateLimitEnforcement && rateLimitEnforcement.actionType === ActionType.RATE_LIMIT) {
                const expiresAt = new Date(rateLimitEnforcement.expiresAt);
                const now = new Date();
                const retryAfter = Math.ceil((expiresAt.getTime() - now.getTime()) / 1000);

                logger.info('Tenant rate limited', { tenantId, scope, expiresAt, retryAfter });

                return {
                    blocked: true,
                    reason: `Taxa de requisições excedida para ${scope}`,
                    actionType: ActionType.RATE_LIMIT,
                    expiresAt,
                    retryAfter,
                };
            }
        }

        return { blocked: false };
    }

    /**
     * Cria erro de enforcement
     * @param result Resultado da verificação
     * @returns AppError
     */
    createEnforcementError(result: EnforcementCheckResult): AppError {
        if (result.actionType === ActionType.LOCK_USER_TEMP) {
            return new AppError(
                ErrorCode.ACCOUNT_LOCKED,
                result.reason || 'Conta bloqueada',
                401,
                { expiresAt: result.expiresAt, retryAfter: result.retryAfter },
            );
        }

        if (result.actionType === ActionType.RATE_LIMIT) {
            return new AppError(
                ErrorCode.RATE_LIMIT_EXCEEDED,
                result.reason || 'Taxa de requisições excedida',
                429,
                { expiresAt: result.expiresAt, retryAfter: result.retryAfter },
            );
        }

        if (result.actionType === ActionType.REQUIRE_REAUTH) {
            return new AppError(
                ErrorCode.REAUTH_REQUIRED,
                result.reason || 'Reautenticação necessária',
                401,
            );
        }

        return new AppError(ErrorCode.FORBIDDEN, 'Acesso bloqueado', 403);
    }
}

/**
 * Helper para criar middleware de enforcement
 * @param client Supabase client
 * @returns Middleware
 */
export function createEnforcementMiddleware(client: SupabaseClient): EnforcementMiddleware {
    return new EnforcementMiddleware(client);
}
