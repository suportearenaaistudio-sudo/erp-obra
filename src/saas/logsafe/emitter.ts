/**
 * LogSafe Guardian v0.1 - Event Emitter
 * SDK para emissão de eventos de segurança
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { SecurityEventType, ActorType, EmitEventPayload, SecurityEvent } from './types';
import { Logger } from '../../shared/logging/logger';

const logger = new Logger('LogSafe.Emitter');

/**
 * LogSafe Event Emitter
 * Responsável por coletar e sanitizar eventos de segurança
 */
export class LogSafeEmitter {
    private client: SupabaseClient;

    constructor(client?: SupabaseClient) {
        // Se não fornecer client, criar um com service role
        // (para escrita de eventos sem depender do contexto do usuário)
        this.client = client || createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        );
    }

    /**
     * Emite um evento de segurança
     * @param eventType Tipo do evento
     * @param payload Dados do evento
     * @returns Promise<void> (não bloqueia, falhas são apenas logadas)
     */
    async emit(eventType: SecurityEventType, payload: EmitEventPayload): Promise<void> {
        try {
            // Sanitizar payload (remover PII)
            const sanitizedMetadata = this.sanitizeMetadata(payload.metadata || {});

            // Hash do IP (se fornecido)
            const ipHash = payload.ip ? this.hashIP(payload.ip) : undefined;

            // Construir evento
            const event: SecurityEvent = {
                tenantId: payload.tenantId,
                actorType: payload.actorType,
                actorId: payload.actorId,
                ipHash,
                userAgent: payload.userAgent,
                route: payload.route,
                method: payload.method,
                statusCode: payload.statusCode,
                errorCode: payload.errorCode,
                eventType,
                traceId: payload.traceId,
                metadataJson: sanitizedMetadata,
            };

            // Inserir no banco de dados
            const { error } = await this.client
                .from('logsafe_event')
                .insert(event);

            if (error) {
                logger.error('Failed to insert security event', { eventType, error: error.message });
            } else {
                logger.debug('Security event emitted', { eventType, traceId: payload.traceId });
            }
        } catch (error) {
            // Não propagar erro (emissão de eventos não deve falhar requisições)
            logger.error('Error emitting security event', {
                eventType,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Hash de endereço IP (SHA-256)
     * @param ip Endereço IP
     * @returns Hash SHA-256
     */
    private hashIP(ip: string): string {
        return createHash('sha256').update(ip).digest('hex');
    }

    /**
     * Sanitiza metadata removendo PII
     * @param metadata Metadata original
     * @returns Metadata sanitizado
     */
    private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
        const sanitized: Record<string, any> = {};

        // Lista de campos proibidos (PII)
        const forbiddenFields = [
            'password',
            'senha',
            'token',
            'accessToken',
            'refreshToken',
            'access_token',
            'refresh_token',
            'email',
            'cpf',
            'cnpj',
            'phone',
            'telefone',
            'endereco',
            'address',
            'credit_card',
            'card_number',
        ];

        for (const [key, value] of Object.entries(metadata)) {
            // Checar se o campo é proibido
            const isForbidden = forbiddenFields.some((field) =>
                key.toLowerCase().includes(field.toLowerCase())
            );

            if (isForbidden) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Recursivamente sanitizar objetos aninhados
                sanitized[key] = this.sanitizeMetadata(value);
            } else if (Array.isArray(value)) {
                // Sanitizar arrays
                sanitized[key] = value.map((item) =>
                    typeof item === 'object' ? this.sanitizeMetadata(item) : item
                );
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Valida estrutura do evento (básico)
     * @param eventType Tipo do evento
     * @param payload Payload
     * @returns true se válido
     */
    private validateEvent(eventType: SecurityEventType, payload: EmitEventPayload): boolean {
        // Validação básica
        if (!Object.values(SecurityEventType).includes(eventType)) {
            logger.warn('Invalid event type', { eventType });
            return false;
        }

        if (!Object.values(ActorType).includes(payload.actorType)) {
            logger.warn('Invalid actor type', { actorType: payload.actorType });
            return false;
        }

        return true;
    }
}

// =============================================
// SINGLETON GLOBAL (para facilitar uso)
// =============================================

let _globalEmitter: LogSafeEmitter | null = null;

/**
 * Obtém instância global do emitter
 */
export function getLogSafeEmitter(): LogSafeEmitter {
    if (!_globalEmitter) {
        _globalEmitter = new LogSafeEmitter();
    }
    return _globalEmitter;
}

/**
 * Facade simplificado para emissão rápida
 * Uso: LogSafe.emit('LOGIN_FAILED', {...})
 */
export const LogSafe = {
    emit: (eventType: SecurityEventType, payload: EmitEventPayload): Promise<void> => {
        return getLogSafeEmitter().emit(eventType, payload);
    },
};
