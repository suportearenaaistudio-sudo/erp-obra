import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para verificar se uma feature está disponível
 * Combina verificação de plano + overrides
 */
export function useFeatureGuard(featureKey: string) {
    const { features, subscription, hasFeature } = useAuth();

    const isEnabled = hasFeature(featureKey);

    // Sugerir upgrade se feature não disponível
    const suggestUpgrade = !isEnabled && subscription?.plan;

    return {
        isEnabled,
        canAccess: isEnabled,
        reason: !isEnabled
            ? `Feature "${featureKey}" não disponível no seu plano`
            : null,
        suggestUpgrade,
        currentPlan: subscription?.plan?.display_name,
        upgradeUrl: `/settings/billing?feature=${featureKey}`,
    };
}

/**
 * Hook para verificar múltiplas features (OR logic)
 * Retorna true se PELO MENOS UMA feature estiver ativa
 */
export function useAnyFeature(featureKeys: string[]) {
    const { hasFeature } = useAuth();

    const enabledFeatures = featureKeys.filter(key => hasFeature(key));
    const isEnabled = enabledFeatures.length > 0;

    return {
        isEnabled,
        canAccess: isEnabled,
        enabledFeatures,
        disabledFeatures: featureKeys.filter(key => !hasFeature(key)),
    };
}

/**
 * Hook para verificar múltiplas features (AND logic)
 * Retorna true se TODAS as features estiverem ativas
 */
export function useAllFeatures(featureKeys: string[]) {
    const { hasFeature } = useAuth();

    const allEnabled = featureKeys.every(key => hasFeature(key));
    const enabledFeatures = featureKeys.filter(key => hasFeature(key));

    return {
        isEnabled: allEnabled,
        canAccess: allEnabled,
        enabledFeatures,
        disabledFeatures: featureKeys.filter(key => !hasFeature(key)),
        missingCount: featureKeys.length - enabledFeatures.length,
    };
}
