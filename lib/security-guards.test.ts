
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionGuard, FeatureGuard, RBACGuard, SecurityError, RequestContext } from './security-guards';

// Mock Supabase Client
const mockSupabase = {
    from: vi.fn(() => ({
        select: vi.fn(() => ({
            eq: vi.fn(() => ({
                single: vi.fn(),
                eq: vi.fn(() => ({ single: vi.fn() })) // handle multiple eqs if needed
            })),
        })),
    })),
};

// Helper to setup mock chain
const setupMock = (tableName: string, data: any, error: any = null) => {
    const fromSpy = mockSupabase.from as any;
    fromSpy.mockImplementation((table: string) => {
        if (table === tableName) {
            return {
                select: () => ({
                    eq: () => ({
                        single: async () => ({ data, error }),
                        eq: () => ({
                            single: async () => ({ data, error }) // for double eq like in rbac
                        })
                    })
                })
            };
        }
        return {
            select: () => ({
                eq: () => ({
                    single: async () => ({ data: null, error: { message: 'Not mocked' } }),
                    eq: () => ({
                        single: async () => ({ data: null, error: { message: 'Not mocked' } })
                    })
                })
            })
        };
    });
};

// More robust mock setup for feature guard which calls 'subscriptions' AND 'tenant_feature_overrides'
const setupFeatureMock = (
    subscriptionPlan: any,
    overrides: any[] = []
) => {
    const fromSpy = mockSupabase.from as any;
    fromSpy.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
            return {
                select: () => ({
                    eq: () => ({
                        single: async () => ({ data: subscriptionPlan, error: null }),
                    })
                })
            };
        }
        if (table === 'tenant_feature_overrides') {
            return {
                select: () => ({
                    eq: async () => ({ data: overrides, error: null }), // overrides returns list, not single
                })
            };
        }
        return {
            select: () => ({
                eq: () => ({
                    single: async () => ({ data: null, error: null })
                })
            })
        };
    });
}


describe('SubscriptionGuard', () => {
    let guard: SubscriptionGuard;

    beforeEach(() => {
        guard = new SubscriptionGuard(mockSupabase as any);
        vi.clearAllMocks();
    });

    it('should throw error if subscription is canceled', async () => {
        setupMock('subscriptions', { status: 'canceled', plan: { display_name: 'Pro' } });
        await expect(guard.check('tenant-1')).rejects.toThrow('Subscription canceled');
    });

    it('should throw error if subscription is suspended', async () => {
        setupMock('subscriptions', { status: 'suspended', plan: { display_name: 'Pro' } });
        await expect(guard.check('tenant-1')).rejects.toThrow('Subscription suspended');
    });

    it('should allow access if subscription is active', async () => {
        setupMock('subscriptions', { status: 'active', plan: { display_name: 'Pro' } });
        await expect(guard.check('tenant-1')).resolves.not.toThrow();
    });

    it('should allow access if subscription is trial', async () => {
        setupMock('subscriptions', { status: 'trial', plan: { display_name: 'Pro' } });
        await expect(guard.check('tenant-1')).resolves.not.toThrow();
    });

    it('should allow access but warn if subscription is past_due', async () => {
        setupMock('subscriptions', { status: 'past_due', plan: { display_name: 'Pro' } });
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        await expect(guard.check('tenant-1')).resolves.not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith('Tenant tenant-1 subscription is past due');
    });
});

describe('FeatureGuard', () => {
    let guard: FeatureGuard;

    beforeEach(() => {
        guard = new FeatureGuard(mockSupabase as any);
        vi.clearAllMocks();
    });

    it('should allow if feature is in plan', async () => {
        setupFeatureMock(
            { plan: { included_features: ['reports'] } },
            []
        );
        await expect(guard.check('tenant-1', 'reports')).resolves.not.toThrow();
    });

    it('should throw if feature is NOT in plan and NO override', async () => {
        setupFeatureMock(
            { plan: { included_features: ['dashboard'] } },
            []
        );
        await expect(guard.check('tenant-1', 'reports')).rejects.toThrow('Feature "reports" is not available');
    });

    it('should allow if feature is NOT in plan BUT enabled via override', async () => {
        setupFeatureMock(
            { plan: { included_features: ['dashboard'] } },
            [{ feature_key: 'reports', enabled: true }]
        );
        await expect(guard.check('tenant-1', 'reports')).resolves.not.toThrow();
    });

    it('should throw if feature IS in plan BUT disabled via override', async () => {
        setupFeatureMock(
            { plan: { included_features: ['reports'] } },
            [{ feature_key: 'reports', enabled: false }]
        );
        await expect(guard.check('tenant-1', 'reports')).rejects.toThrow('Feature "reports" is not available');
    });

    it('should ignore expired override (enable)', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        setupFeatureMock(
            { plan: { included_features: ['dashboard'] } },
            [{ feature_key: 'reports', enabled: true, expires_at: yesterday.toISOString() }]
        );
        // Should fallback to plan (which doesn't have it) -> throw
        await expect(guard.check('tenant-1', 'reports')).rejects.toThrow('Feature "reports" is not available');
    });
});

describe('RBACGuard', () => {
    let guard: RBACGuard;

    beforeEach(() => {
        guard = new RBACGuard(mockSupabase as any);
        vi.clearAllMocks();
    });

    // We need a specific mock setup for RBAC because it calls 'users' then 'role_permissions'
    // This is getting complicated to mock deeply with simple helper, let's just mock the chain manually in tests or improve helper
    const setupRBACMock = (
        userRole: any,
        permissions: any[] = []
    ) => {
        const fromSpy = mockSupabase.from as any;
        fromSpy.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({ // id
                            eq: () => ({ // tenant_id
                                single: async () => ({ data: userRole, error: null })
                            })
                        })
                    })
                };
            }
            if (table === 'role_permissions') {
                return {
                    select: () => ({
                        eq: () => ({ // tenant_id
                            eq: async () => ({ data: permissions, error: null }) // role_id
                        })
                    })
                };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
        });
    };

    it('should allow if user has permission', async () => {
        setupRBACMock(
            { role_id: 'role-1', role: { is_tenant_admin: false } },
            [{ permission_key: 'users.create' }]
        );
        await expect(guard.check('tenant-1', 'user-1', 'users.create')).resolves.not.toThrow();
    });

    it('should throw if user does NOT have permission', async () => {
        setupRBACMock(
            { role_id: 'role-1', role: { is_tenant_admin: false } },
            [{ permission_key: 'users.view' }]
        );
        await expect(guard.check('tenant-1', 'user-1', 'users.delete')).rejects.toThrow('Permission denied');
    });

    it('should allow everything if user is tenant admin', async () => {
        setupRBACMock(
            { role_id: 'role-admin', role: { is_tenant_admin: true } },
            [] // No explicit permissions needed
        );
        await expect(guard.check('tenant-1', 'user-1', 'any.permission')).resolves.not.toThrow();
    });
});
