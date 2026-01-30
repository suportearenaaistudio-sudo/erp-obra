import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para verificar o status da assinatura
 * Bloqueia acesso se tenant estiver suspenso ou cancelado
 */
export function useSubscriptionGuard() {
    const { subscription, tenant } = useAuth();

    const status = subscription?.status;
    const tenantStatus = tenant?.status;

    // Estados que permitem acesso
    const isActive = status === 'active' || status === 'trial';
    const isPastDue = status === 'past_due';
    const isSuspended = status === 'suspended' || tenantStatus === 'suspended';
    const isCanceled = status === 'canceled' || tenantStatus === 'canceled';

    // Regras de acesso
    const canRead = !isCanceled; // Pode ler se não estiver cancelado
    const canWrite = isActive || isPastDue; // Só pode escrever se ativo ou past_due
    const canExport = isActive; // Só pode exportar se ativo
    const canInviteUsers = isActive; // Só pode convidar usuários se ativo

    // Mensagens
    let message = null;
    let severity: 'info' | 'warning' | 'error' = 'info';

    if (isCanceled) {
        message = 'Assinatura cancelada. Entre em contato com o suporte.';
        severity = 'error';
    } else if (isSuspended) {
        message = 'Assinatura suspensa. Atualize seu pagamento para continuar.';
        severity = 'error';
    } else if (isPastDue) {
        message = 'Pagamento em atraso. Atualize para evitar suspensão.';
        severity = 'warning';
    } else if (status === 'trial') {
        const trialEnd = subscription?.trial_end;
        if (trialEnd) {
            const daysLeft = Math.ceil(
                (new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            message = `Trial: ${daysLeft} dias restantes`;
            severity = 'info';
        }
    }

    return {
        // Status
        status,
        tenantStatus,
        isActive,
        isPastDue,
        isSuspended,
        isCanceled,
        isTrial: status === 'trial',

        // Permissões
        canRead,
        canWrite,
        canExport,
        canInviteUsers,

        // UI
        message,
        severity,
        showBanner: !!message,

        // Dados
        subscription,
        planName: subscription?.plan?.display_name,
        trialEnd: subscription?.trial_end,
        currentPeriodEnd: subscription?.current_period_end,
    };
}

/**
 * Hook para verificar limites de uso
 * Ex: número de usuários, projetos, storage
 */
export function useUsageLimits() {
    const { subscription, tenant } = useAuth();

    // TODO: Implementar quando tiver tabela de usage tracking
    // Por enquanto, retorna apenas os limites do plano

    return {
        limits: {
            users: subscription?.plan?.name === 'starter' ? 3 :
                subscription?.plan?.name === 'pro' ? 10 :
                    999999, // Enterprise = ilimitado
            projects: subscription?.plan?.name === 'starter' ? 5 :
                subscription?.plan?.name === 'pro' ? 50 :
                    999999,
            storage: subscription?.plan?.name === 'starter' ? 2 :
                subscription?.plan?.name === 'pro' ? 20 :
                    100, // GB
        },
        // TODO: Buscar usage real do banco
        usage: {
            users: 0,
            projects: 0,
            storage: 0,
        },
        canAddUser: true, // TODO: Comparar usage vs limits
        canAddProject: true,
        canUploadFile: true,
    };
}
