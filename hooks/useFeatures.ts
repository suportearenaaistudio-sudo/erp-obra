import { useAuth } from '../contexts/AuthContext';

/**
 * Hook centralizado para acessar flags de funcionalidade.
 * Wrapper conveniente sobre o AuthContext para componentes que precisam apenas de features.
 */
export function useFeatures() {
    const {
        features,
        featuresLoading,
        lastFeaturesUpdate,
        hasFeature,
        refetchFeatures
    } = useAuth();

    return {
        features,
        isLoading: featuresLoading,
        lastUpdated: lastFeaturesUpdate,
        hasFeature,
        refetchFeatures,

        /**
         * Verifica se múltiplas features estão ativas (OR)
         */
        hasAnyFeature: (featureKeys: string[]) => {
            return featureKeys.some(key => hasFeature(key));
        },

        /**
         * Verifica se todas as features estão ativas (AND)
         */
        hasAllFeatures: (featureKeys: string[]) => {
            return featureKeys.every(key => hasFeature(key));
        }
    };
}
