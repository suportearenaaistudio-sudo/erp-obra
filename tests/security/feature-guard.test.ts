import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureGuard } from '../../src/shared/security/feature.guard';
import { FeatureResolverService } from '../../src/shared/features/feature-resolver.service';
import { RequestContext } from '../../src/shared/types/context';
import { FeatureKeys } from '../../src/shared/constants/features';
import { AppError, ErrorCode } from '../../src/shared/errors/errors';

describe('FeatureGuard', () => {
    let guard: FeatureGuard;
    let mockSupabase: any;
    let mockFeatureResolver: FeatureResolverService;
    let context: RequestContext;

    beforeEach(() => {
        mockSupabase = {
            from: vi.fn(),
        };

        mockFeatureResolver = new FeatureResolverService(mockSupabase);
        guard = new FeatureGuard(mockSupabase);

        context = {
            userType: 'tenant',
            tenantId: 'tenant-123',
            userId: 'user-456',
            planId: 'plan-789',
            traceId: 'trace-abc',
        };
    });

    describe('check', () => {
        it('should pass when feature is enabled', async () => {
            // Mock subscription with plan
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'subscriptions') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockReturnValue({
                                    data: { plan_id: 'plan-789' },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                } else if (table === 'plan_features') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                data: [{ feature_key: FeatureKeys.CRM }],
                                error: null,
                            }),
                        }),
                    };
                } else if (table === 'tenant_feature_overrides') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockReturnValue({
                                    data: null,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
            });

            await expect(
                guard.check(context, FeatureKeys.CRM)
            ).resolves.not.toThrow();
        });

        it('should throw when feature is disabled', async () => {
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'subscriptions') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockReturnValue({
                                    data: { plan_id: 'plan-789' },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                } else if (table === 'plan_features') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                data: [], // No features in plan
                                error: null,
                            }),
                        }),
                    };
                } else if (table === 'tenant_feature_overrides') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockReturnValue({
                                    data: null,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
            });

            await expect(
                guard.check(context, FeatureKeys.CRM)
            ).rejects.toThrow(AppError);

            await expect(
                guard.check(context, FeatureKeys.CRM)
            ).rejects.toMatchObject({
                code: ErrorCode.FEATURE_DISABLED,
                statusCode: 403,
            });
        });

        it('should respect tenant overrides', async () => {
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'subscriptions') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockReturnValue({
                                    data: { plan_id: 'plan-789' },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                } else if (table === 'plan_features') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                data: [], // Feature not in plan
                                error: null,
                            }),
                        }),
                    };
                } else if (table === 'tenant_feature_overrides') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockReturnValue({
                                    data: {
                                        feature_key: FeatureKeys.CRM,
                                        is_enabled: true,
                                        expires_at: null,
                                    },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
            });

            // Should pass because override enables the feature
            await expect(
                guard.check(context, FeatureKeys.CRM)
            ).resolves.not.toThrow();
        });

        it('should throw when tenantId is missing', async () => {
            const contextWithoutTenant = { ...context, tenantId: undefined };

            await expect(
                guard.check(contextWithoutTenant, FeatureKeys.CRM)
            ).rejects.toThrow(AppError);
        });
    });
});
