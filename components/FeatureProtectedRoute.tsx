import React from 'react';
import { Outlet } from 'react-router-dom';
import { useFeatureGuard } from '../hooks/useFeatureGuard';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { AlertTriangle, Lock } from 'lucide-react';
// import { Button } from './ui/button'; // Commented out until Button component is verified

interface FeatureProtectedRouteProps {
    feature: string;
}

/**
 * Wrapper component to protect routes based on feature flags.
 * If feature is disabled, shows an Upsell / Access Denied screen.
 */
export const FeatureProtectedRoute: React.FC<FeatureProtectedRouteProps> = ({
    feature
}) => {
    const { isEnabled, currentPlan, upgradeUrl } = useFeatureGuard(feature);
    const { isSuspended, isCanceled } = useSubscriptionGuard();

    // Loading state is handled by AuthContext generally, but if we need it here:
    // const { isLoading } = useAuth(); // Assume handled cleanly by guards

    // 1. Check for Account Suspension
    if (isSuspended || isCanceled) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <div className="p-4 bg-red-100 rounded-full mb-6">
                    <AlertTriangle className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Conta Suspensa</h2>
                <p className="text-gray-600 max-w-md mb-6">
                    Sua assinatura está suspensa ou cancelada. Entre em contato com o suporte ou reative sua assinatura para acessar este módulo.
                </p>
                {/* 
                  TODO: Add link to Billing page when ready
                  <Button variant="default">Gerenciar Assinatura</Button> 
                */}
            </div>
        );
    }

    // 2. Check Feature Access
    if (!isEnabled) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-500">
                <div className="p-4 bg-blue-50 rounded-full mb-6">
                    <Lock className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Funcionalidade Bloqueada</h2>
                <p className="text-gray-600 max-w-md mb-8">
                    O módulo <strong>{feature}</strong> não está incluído no seu plano atual ({currentPlan || 'Starter'}).
                    Faça um upgrade para desbloquear todo o potencial do Obra360.
                </p>
                <div className="flex gap-4 justify-center">
                    <a
                        href={upgradeUrl}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Fazer Upgrade Agora
                    </a>
                </div>
            </div>
        );
    }

    return <Outlet />;
};
