
import * as Sentry from "@sentry/react";

export const initMonitoring = () => {
    if (import.meta.env.PROD) {
        Sentry.init({
            dsn: import.meta.env.VITE_SENTRY_DSN,
            environment: import.meta.env.MODE,
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration(),
            ],
            // Performance Monitoring
            tracesSampleRate: 1.0,
            // Session Replay
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,
        });
    } else {
        console.log('[Monitoring] Sentry not initialized in DEV mode');
    }
};

export const captureError = (error: any, context?: Record<string, any>) => {
    if (import.meta.env.PROD) {
        Sentry.captureException(error, { extra: context });
    } else {
        console.error('[Monitoring] Captured Error:', error, context);
    }
};

export const setUserContext = (user: { id: string; email?: string; role?: string }) => {
    if (import.meta.env.PROD) {
        Sentry.setUser(user);
    } else {
        console.log('[Monitoring] Set User Context:', user);
    }
}

export const setTenantContext = (tenantId: string) => {
    if (import.meta.env.PROD) {
        Sentry.setTag("tenant_id", tenantId);
    } else {
        console.log('[Monitoring] Set Tenant Context:', tenantId);
    }
}
