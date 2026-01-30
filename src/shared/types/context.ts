export enum UserType {
    SAAS = 'saas',
    TENANT = 'tenant',
}

export interface RequestContext {
    userType: UserType;

    // User identity
    email?: string;

    // Tenant context
    tenantId?: string;
    userId?: string;

    // SaaS context
    saasUserId?: string;

    // Permissions
    role?: {
        id: string;
        name: string;
        is_tenant_admin: boolean;
    };
    permissions?: string[];

    // Support
    isImpersonation?: boolean;
    impersonationSessionId?: string;

    // Tracing
    traceId: string;
    ipAddress?: string;
    userAgent?: string;
}
