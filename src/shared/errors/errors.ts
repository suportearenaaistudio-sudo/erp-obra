export enum ErrorCode {
    // Auth
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',

    // Subscription
    SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
    SUBSCRIPTION_INACTIVE = 'SUBSCRIPTION_INACTIVE',
    SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
    SUBSCRIPTION_SUSPENDED = 'SUBSCRIPTION_SUSPENDED',

    // Features
    FEATURE_DISABLED = 'FEATURE_DISABLED',

    // RBAC
    PERMISSION_DENIED = 'PERMISSION_DENIED',

    // Validation
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    NOT_FOUND = 'NOT_FOUND',

    // Tenant
    TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',

    // LogSafe
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    REAUTH_REQUIRED = 'REAUTH_REQUIRED',

    // Generic
    INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AppError extends Error {
    constructor(
        public code: ErrorCode,
        message: string,
        public statusCode: number = 500,
        public details?: any
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export function errorResponse(error: AppError, traceId?: string) {
    return {
        code: error.code,
        message: error.message,
        details: error.details,
        traceId,
    };
}
