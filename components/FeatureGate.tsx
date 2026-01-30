import React from 'react';
import { useFeatureGuard } from '../hooks/useFeatureGuard';

interface FeatureGateProps {
    feature: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showUpgradePrompt?: boolean;
}

/**
 * Componente que renderiza children apenas se a feature estiver ativa
 * Caso contrário, mostra fallback ou prompt de upgrade
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
    feature,
    children,
    fallback,
    showUpgradePrompt = true,
}) => {
    const { isEnabled, currentPlan, upgradeUrl } = useFeatureGuard(feature);

    if (isEnabled) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    if (showUpgradePrompt) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center max-w-md">
                    <div className="mb-4">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Feature não disponível
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        A feature <strong>{feature}</strong> não está incluída no seu plano atual ({currentPlan}).
                    </p>
                    <a
                        href={upgradeUrl}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Fazer Upgrade
                    </a>
                </div>
            </div>
        );
    }

    return null;
};

/**
 * Componente inline para mostrar/esconder elementos baseado em feature
 */
export const IfFeature: React.FC<{ feature: string; children: React.ReactNode }> = ({
    feature,
    children,
}) => {
    const { isEnabled } = useFeatureGuard(feature);
    return isEnabled ? <>{children}</> : null;
};

/**
 * Componente inline para mostrar elemento quando feature NÃO está ativa
 */
export const UnlessFeature: React.FC<{ feature: string; children: React.ReactNode }> = ({
    feature,
    children,
}) => {
    const { isEnabled } = useFeatureGuard(feature);
    return !isEnabled ? <>{children}</> : null;
};
