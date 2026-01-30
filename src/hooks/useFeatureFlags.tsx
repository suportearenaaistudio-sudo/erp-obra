/**
 * useFeatureFlags Hook
 * 
 * Custom hook to check feature availability in React components
 */

import { useAuth } from './AuthContext';
import { FeatureKeys } from '../shared/constants/features';

export function useFeatureFlags() {
    const { user } = useAuth();

    /**
     * Check if a feature is enabled for the current tenant
     */
    const hasFeature = (featureKey: FeatureKeys | string): boolean => {
        if (!user || !user.features) {
            return false;
        }
        return user.features.includes(featureKey);
    };

    /**
     * Check if user has any of the specified features
     */
    const hasAnyFeature = (featureKeys: (FeatureKeys | string)[]): boolean => {
        return featureKeys.some(key => hasFeature(key));
    };

    /**
     * Check if user has all of the specified features
     */
    const hasAllFeatures = (featureKeys: (FeatureKeys | string)[]): boolean => {
        return featureKeys.every(key => hasFeature(key));
    };

    /**
     * Get all enabled features
     */
    const getEnabledFeatures = (): string[] => {
        return user?.features || [];
    };

    return {
        hasFeature,
        hasAnyFeature,
        hasAllFeatures,
        features: getEnabledFeatures(),
    };
}

/**
 * Feature-gated Component Wrapper
 * 
 * Usage:
 *   <FeatureGate feature="CRM">
 *     <CRMModule />
 *   </FeatureGate>
 */

interface FeatureGateProps {
    feature: FeatureKeys | string;
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

export function FeatureGate({ feature, fallback = null, children }: FeatureGateProps) {
    const { hasFeature } = useFeatureFlags();

    if (!hasFeature(feature)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * Feature-gated Route Wrapper
 * 
 * Usage:
 *   <Route path="/crm" element={
 *     <FeatureProtectedRoute feature="CRM" fallback={<UpgradePage />}>
 *       <CRMPage />
 *     </FeatureProtectedRoute>
 *   } />
 */

interface FeatureProtectedRouteProps {
    feature: FeatureKeys | string;
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

export function FeatureProtectedRoute({
    feature,
    fallback = <div>Esta funcionalidade não está disponível no seu plano.</div>,
    children
}: FeatureProtectedRouteProps) {
    const { hasFeature } = useFeatureFlags();

    if (!hasFeature(feature)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
