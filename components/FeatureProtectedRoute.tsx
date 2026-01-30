import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useFeatures } from '../hooks/useFeatures';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';

interface FeatureProtectedRouteProps {
    feature: string;
    redirectTo?: string;
}

/**
 * Wrapper component to protect routes based on feature flags.
 * If feature is disabled, redirects to dashboard or specified route.
 */
export const FeatureProtectedRoute: React.FC<FeatureProtectedRouteProps> = ({
    feature,
    redirectTo = '/'
}) => {
    const { hasFeature, isLoading } = useFeatures();
    const { isSuspended, isCanceled } = useSubscriptionGuard();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    // Global subscription check
    // Ideally this should be in a higher level guard, but putting here adds extra safety
    if (isSuspended || isCanceled) {
        // You might want to allow read-only access here depending on requirements
        // For now, let's just log or show banner, but navigation might be allowed 
        // if we just want to block WRITES. 
        // However, the requirement said "Subscription suspensa deve bloquear acesso" (Phase 1).
        // Phase 3 says "SubscriptionGuard before".
        // If we want to block access completely to specific modules, we can do it here.
        // But usually suspended accounts can still see data.
        // Let's assume strict blocking for now if that's what "bloquear acesso" implied.
        // Actually, looking at SAAS_ARCHITECTURE.md: "suspended: Bloqueio de escrita, leitura ok".
        // So we SHOULD NOT redirect here for suspension, only for feature disabled.
    }

    if (!hasFeature(feature)) {
        // Optional: Show toast here
        // toast.error(`Feature ${feature} not enabled`);
        return <Navigate to={redirectTo} replace />;
    }

    return <Outlet />;
};
