import { AppError, ErrorCode } from './errors';
import { Logger } from '../logging/logger';

/**
 * Error Middleware for Edge Functions
 * 
 * Centralized error handling for consistent error responses
 */

export interface ErrorResponse {
    code: string;
    message: string;
    details?: any;
    traceId?: string;
}

/**
 * Map errors to appropriate HTTP status codes and user-friendly messages
 */
export class ErrorHandler {
    private logger: Logger;

    constructor(logger?: Logger) {
        this.logger = logger || new Logger('ErrorHandler');
    }

    /**
     * Handle any error and convert to standardized response
     */
    handle(error: unknown, traceId?: string): Response {
        // AppError - our custom errors
        if (error instanceof AppError) {
            return this.handleAppError(error, traceId);
        }

        // Supabase errors
        if (this.isSupabaseError(error)) {
            return this.handleSupabaseError(error as any, traceId);
        }

        // Validation errors (Zod)
        if (this.isZodError(error)) {
            return this.handleZodError(error as any, traceId);
        }

        // Unknown errors
        return this.handleUnknownError(error, traceId);
    }

    /**
     * Handle AppError instances
     */
    private handleAppError(error: AppError, traceId?: string): Response {
        this.logger.error('AppError occurred', {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            traceId
        });

        const response: ErrorResponse = {
            code: error.code,
            message: this.getUserFriendlyMessage(error.code, error.message),
            details: error.details,
            traceId,
        };

        return new Response(JSON.stringify(response), {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    /**
     * Handle Supabase errors
     */
    private handleSupabaseError(error: any, traceId?: string): Response {
        this.logger.error('Supabase error occurred', { error, traceId });

        let code = ErrorCode.INTERNAL_ERROR;
        let statusCode = 500;
        let message = 'Database error occurred';

        // Map common Supabase error codes
        if (error.code === '23505') { // Unique violation
            code = ErrorCode.VALIDATION_ERROR;
            statusCode = 400;
            message = 'A record with this value already exists';
        } else if (error.code === '23503') { // Foreign key violation
            code = ErrorCode.VALIDATION_ERROR;
            statusCode = 400;
            message = 'Referenced record does not exist';
        } else if (error.code === 'PGRST116') { // Not found
            code = ErrorCode.NOT_FOUND;
            statusCode = 404;
            message = 'Record not found';
        }

        const response: ErrorResponse = {
            code,
            message,
            traceId,
        };

        return new Response(JSON.stringify(response), {
            status: statusCode,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    /**
     * Handle Zod validation errors
     */
    private handleZodError(error: any, traceId?: string): Response {
        this.logger.warn('Validation error occurred', { error, traceId });

        const details = error.errors?.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
        }));

        const response: ErrorResponse = {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Validation failed',
            details,
            traceId,
        };

        return new Response(JSON.stringify(response), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    /**
     * Handle unknown errors
     */
    private handleUnknownError(error: unknown, traceId?: string): Response {
        this.logger.error('Unknown error occurred', { error, traceId });

        const response: ErrorResponse = {
            code: ErrorCode.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
            traceId,
        };

        return new Response(JSON.stringify(response), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    /**
     * Get user-friendly error messages
     */
    private getUserFriendlyMessage(code: ErrorCode, defaultMessage: string): string {
        const messages: Record<ErrorCode, string> = {
            [ErrorCode.UNAUTHORIZED]: 'Você não está autenticado. Faça login novamente.',
            [ErrorCode.FORBIDDEN]: 'Você não tem permissão para realizar esta ação.',
            [ErrorCode.SUBSCRIPTION_NOT_FOUND]: 'Assinatura não encontrada.',
            [ErrorCode.SUBSCRIPTION_INACTIVE]: 'Sua assinatura está inativa. Entre em contato com o suporte.',
            [ErrorCode.SUBSCRIPTION_CANCELED]: 'Sua assinatura foi cancelada.',
            [ErrorCode.SUBSCRIPTION_SUSPENDED]: 'Sua assinatura está suspensa. Regularize seu pagamento.',
            [ErrorCode.FEATURE_DISABLED]: 'Este recurso não está disponível no seu plano atual.',
            [ErrorCode.PERMISSION_DENIED]: 'Você não tem permissão para acessar este recurso.',
            [ErrorCode.VALIDATION_ERROR]: 'Dados inválidos fornecidos.',
            [ErrorCode.NOT_FOUND]: 'Registro não encontrado.',
            [ErrorCode.TENANT_NOT_FOUND]: 'Empresa não encontrada.',
            [ErrorCode.INTERNAL_ERROR]: 'Ocorreu um erro interno. Tente novamente mais tarde.',
        };

        return messages[code] || defaultMessage;
    }

    /**
     * Check if error is from Supabase
     */
    private isSupabaseError(error: unknown): boolean {
        return typeof error === 'object' && error !== null && 'code' in error;
    }

    /**
     * Check if error is from Zod
     */
    private isZodError(error: unknown): boolean {
        return typeof error === 'object' && error !== null && 'errors' in error && Array.isArray((error as any).errors);
    }
}

/**
 * Convenience function for wrapping Edge Function handlers with error handling
 */
export function withErrorHandler(
    handler: (req: Request) => Promise<Response>,
    traceId?: string
): (req: Request) => Promise<Response> {
    const errorHandler = new ErrorHandler();

    return async (req: Request) => {
        try {
            return await handler(req);
        } catch (error) {
            return errorHandler.handle(error, traceId);
        }
    };
}
