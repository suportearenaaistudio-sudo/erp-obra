import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para verificar se o usuário tem uma permissão específica
 * Tenant admins sempre têm todas as permissões
 */
export function usePermissionGuard(permission: string) {
    const { hasPermission, isTenantAdmin, profile } = useAuth();

    const isAllowed = hasPermission(permission);

    return {
        isAllowed,
        canAccess: isAllowed,
        reason: !isAllowed
            ? `Você não tem permissão: ${permission}`
            : null,
        isTenantAdmin: isTenantAdmin(),
        roleName: profile?.role?.name,
    };
}

/**
 * Hook para verificar múltiplas permissões (OR logic)
 * Retorna true se tiver PELO MENOS UMA permissão
 */
export function useAnyPermission(permissions: string[]) {
    const { hasPermission, isTenantAdmin } = useAuth();

    // Tenant admin tem todas as permissões
    if (isTenantAdmin()) {
        return {
            isAllowed: true,
            canAccess: true,
            grantedPermissions: permissions,
            deniedPermissions: [],
        };
    }

    const grantedPermissions = permissions.filter(p => hasPermission(p));
    const isAllowed = grantedPermissions.length > 0;

    return {
        isAllowed,
        canAccess: isAllowed,
        grantedPermissions,
        deniedPermissions: permissions.filter(p => !hasPermission(p)),
    };
}

/**
 * Hook para verificar múltiplas permissões (AND logic)
 * Retorna true se tiver TODAS as permissões
 */
export function useAllPermissions(permissions: string[]) {
    const { hasPermission, isTenantAdmin } = useAuth();

    // Tenant admin tem todas as permissões
    if (isTenantAdmin()) {
        return {
            isAllowed: true,
            canAccess: true,
            grantedPermissions: permissions,
            deniedPermissions: [],
        };
    }

    const grantedPermissions = permissions.filter(p => hasPermission(p));
    const allGranted = grantedPermissions.length === permissions.length;

    return {
        isAllowed: allGranted,
        canAccess: allGranted,
        grantedPermissions,
        deniedPermissions: permissions.filter(p => !hasPermission(p)),
        missingCount: permissions.length - grantedPermissions.length,
    };
}

/**
 * Hook combinado: verifica feature E permissão
 * Útil para proteger ações que precisam de ambos
 */
export function useCan(permission: string, featureKey?: string) {
    const { hasPermission, hasFeature } = useAuth();

    const hasRequiredPermission = hasPermission(permission);
    const hasRequiredFeature = !featureKey || hasFeature(featureKey);

    const can = hasRequiredPermission && hasRequiredFeature;

    let reason = null;
    if (!hasRequiredPermission) {
        reason = `Sem permissão: ${permission}`;
    } else if (!hasRequiredFeature) {
        reason = `Feature não disponível: ${featureKey}`;
    }

    return {
        can,
        canAccess: can,
        reason,
        hasPermission: hasRequiredPermission,
        hasFeature: hasRequiredFeature,
    };
}
