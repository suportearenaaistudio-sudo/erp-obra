import React from 'react';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';

/**
 * Banner que mostra alertas sobre o status da assinatura
 * Aparece quando: trial acabando, pagamento atrasado, suspenso, etc.
 */
export const SubscriptionBanner: React.FC = () => {
    const { showBanner, message, severity, isTrial, trialEnd } = useSubscriptionGuard();

    if (!showBanner) return null;

    const bgColor = {
        info: 'bg-blue-50 border-blue-200',
        warning: 'bg-yellow-50 border-yellow-200',
        error: 'bg-red-50 border-red-200',
    }[severity];

    const textColor = {
        info: 'text-blue-800',
        warning: 'text-yellow-800',
        error: 'text-red-800',
    }[severity];

    const iconColor = {
        info: 'text-blue-400',
        warning: 'text-yellow-400',
        error: 'text-red-400',
    }[severity];

    return (
        <div className={`border-l-4 p-4 ${bgColor} mb-4`}>
            <div className="flex">
                <div className="flex-shrink-0">
                    {severity === 'error' && (
                        <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    )}
                    {severity === 'warning' && (
                        <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    )}
                    {severity === 'info' && (
                        <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    )}
                </div>
                <div className="ml-3 flex-1">
                    <p className={`text-sm ${textColor}`}>
                        {message}
                    </p>
                    {isTrial && (
                        <p className="mt-1 text-xs text-gray-600">
                            Faça upgrade para continuar usando após o trial.
                        </p>
                    )}
                </div>
                {(severity === 'warning' || severity === 'error') && (
                    <div className="ml-auto pl-3">
                        <a
                            href="/settings/billing"
                            className="text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                            Atualizar Pagamento →
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Componente que bloqueia ações de escrita quando assinatura está suspensa
 */
export const WriteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { canWrite, message, severity } = useSubscriptionGuard();

    if (canWrite) {
        return <>{children}</>;
    }

    return (
        <div className="relative">
            <div className="pointer-events-none opacity-50">
                {children}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-10 rounded">
                <div className="bg-white px-4 py-2 rounded shadow-lg text-sm text-gray-700">
                    {message || 'Ação bloqueada - Assinatura inativa'}
                </div>
            </div>
        </div>
    );
};
