import React from 'react';
import { usePermissionGuard } from '../hooks/usePermissionGuard';

interface PermissionGateProps {
    permission: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showAccessDenied?: boolean;
}

/**
 * Componente que renderiza children apenas se o usuário tiver a permissão
 * Caso contrário, mostra fallback ou mensagem de acesso negado
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
    permission,
    children,
    fallback,
    showAccessDenied = true,
}) => {
    const { isAllowed, reason, roleName } = usePermissionGuard(permission);

    if (isAllowed) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    if (showAccessDenied) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border-2 border-dashed border-red-300">
                <div className="text-center max-w-md">
                    <div className="mb-4">
                        <svg
                            className="mx-auto h-12 w-12 text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Acesso Negado
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                        {reason}
                    </p>
                    <p className="text-xs text-gray-400">
                        Seu perfil: <strong>{roleName}</strong>
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                        Entre em contato com o administrador para solicitar acesso.
                    </p>
                </div>
            </div>
        );
    }

    return null;
};

/**
 * Componente inline para mostrar/esconder elementos baseado em permissão
 */
export const IfPermission: React.FC<{ permission: string; children: React.ReactNode }> = ({
    permission,
    children,
}) => {
    const { isAllowed } = usePermissionGuard(permission);
    return isAllowed ? <>{children}</> : null;
};

/**
 * Componente inline para mostrar elemento quando NÃO tem permissão
 */
export const UnlessPermission: React.FC<{ permission: string; children: React.ReactNode }> = ({
    permission,
    children,
}) => {
    const { isAllowed } = usePermissionGuard(permission);
    return !isAllowed ? <>{children}</> : null;
};
