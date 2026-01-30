import React from 'react';
import { Outlet } from 'react-router-dom';
import { usePermissionGuard } from '../hooks/usePermissionGuard';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface PermissionProtectedRouteProps {
    permission: string;
}

/**
 * Wrapper component to protect routes based on permissions (RBAC).
 * If user lacks permission, shows an Access Denied screen.
 */
export const PermissionProtectedRoute: React.FC<PermissionProtectedRouteProps> = ({
    permission
}) => {
    const { isAllowed } = usePermissionGuard(permission);
    const { isSuspended, isCanceled } = useSubscriptionGuard();

    // 1. Check for Account Suspension
    // Tenants suspended usually lose access to everything except billing, but definitely Admin
    if (isSuspended || isCanceled) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <div className="p-4 bg-red-100 rounded-full mb-6">
                    <AlertTriangle className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Conta Suspensa</h2>
                <p className="text-gray-600 max-w-md mb-6">
                    Sua assinatura está suspensa. Entre em contato com o suporte para regularizar.
                </p>
            </div>
        );
    }

    // 2. Check Permission
    if (!isAllowed) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-500">
                <div className="p-4 bg-red-50 rounded-full mb-6">
                    <ShieldAlert className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
                <p className="text-gray-600 max-w-md mb-8">
                    Você não tem permissão para acessar esta área ({permission}).
                    Solicite acesso ao administrador da sua empresa.
                </p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Voltar
                    </button>
                    <a
                        href="/"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Ir para Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return <Outlet />;
};
