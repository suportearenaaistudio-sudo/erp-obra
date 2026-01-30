export enum ErrorCodes {
    // Security
    FEATURE_DISABLED = 'FEATURE_DISABLED',
    SUBSCRIPTION_INACTIVE = 'SUBSCRIPTION_INACTIVE',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    UNAUTHORIZED = 'UNAUTHORIZED',

    // Data
    NOT_FOUND = 'NOT_FOUND',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export const ERROR_MESSAGES: Record<ErrorCodes, string> = {
    [ErrorCodes.FEATURE_DISABLED]: 'Funcionalidade não disponível no seu plano atual.',
    [ErrorCodes.SUBSCRIPTION_INACTIVE]: 'Sua assinatura está inativa ou suspensa.',
    [ErrorCodes.PERMISSION_DENIED]: 'Você não tem permissão para realizar esta ação.',
    [ErrorCodes.UNAUTHORIZED]: 'Sessão expirada ou inválida. Faça login novamente.',
    [ErrorCodes.NOT_FOUND]: 'Recurso não encontrado.',
    [ErrorCodes.VALIDATION_ERROR]: 'Dados inválidos.',
};

export function formatErrorMessage(code: string, detail?: string): string {
    const baseMessage = ERROR_MESSAGES[code as ErrorCodes] || 'Ocorreu um erro desconhecido.';
    return detail ? `${baseMessage} (${detail})` : baseMessage;
}
