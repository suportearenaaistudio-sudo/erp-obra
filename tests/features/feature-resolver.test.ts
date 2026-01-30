import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureResolverService } from '../../src/shared/features/feature-resolver.service';
import { FeatureKeys } from '../../src/shared/constants/features';

describe('FeatureResolverService', () => {
    let service: FeatureResolverService;
    let mockSupabase: any;

    beforeEach(() => {
        // Mock Supabase client
        mockSupabase = {
            from: vi.fn(),
        };

        service = new FeatureResolverService(mockSupabase);
    });

    describe('hasFeature', () => {
        it('should return true when feature is in plan', async () => {
            const mockPlanFeatures = [
                { feature_key: FeatureKeys.CRM },
                { feature_key: FeatureKeys.PROJECTS },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        data: mockPlanFeatures,
                        error: null,
                    }),
                }),
            });

            const result = await service.hasFeature('tenant-123', 'plan-456', FeatureKeys.CRM);
            expect(result).toBe(true);
        });

        it('should return false when feature is not in plan', async () => {
            const mockPlanFeatures = [
                { feature_key: FeatureKeys.PROJECTS },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        data: mockPlanFeatures,
                        error: null,
                    }),
                }),
            });

            const result = await service.hasFeature('tenant-123', 'plan-456', FeatureKeys.CRM);
            expect(result).toBe(false);
        });

        it('should respect tenant overrides - enabled', async () => {
            const mockPlanFeatures: any[] = [];
            const mockOverrides = [
                {
                    feature_key: FeatureKeys.CRM,
                    is_enabled: true,
                    expires_at: null,
                },
            ];

            let callCount = 0;
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'plan_features') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                data: mockPlanFeatures,
                                error: null,
                            }),
                        }),
                    };
                } else if (table === 'tenant_feature_overrides') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockReturnValue({
                                    data: mockOverrides[0],
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
            });

            const result = await service.hasFeature('tenant-123', 'plan-456', FeatureKeys.CRM);
            expect(result).toBe(true);
        });

        it('should respect tenant overrides - disabled', async () => {
            const mockPlanFeatures = [
                { feature_key: FeatureKeys.CRM },
            ];
            const mockOverride = {
                feature_key: FeatureKeys.CRM,
                is_enabled: false,
                expires_at: null,
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'plan_features') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                data: mockPlanFeatures,
                                error: null,
                            }),
                        }),
                    };
                } else if (table === 'tenant_feature_overrides') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockReturnValue({
                                    data: mockOverride,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
            });

            const result = await service.hasFeature('tenant-123', 'plan-456', FeatureKeys.CRM);
            expect(result).toBe(false);
        });

        it('should ignore expired overrides', async () => {
            const mockPlanFeatures: any[] = [];
            const expiredOverride = {
                feature_key: FeatureKeys.CRM,
                is_enabled: true,
                expires_at: new Date('2020-01-01').toISOString(), // Expired
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'plan_features') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                data: mockPlanFeatures,
                                error: null,
                            }),
                        }),
                    };
                } else if (table === 'tenant_feature_overrides') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockReturnValue({
                                    data: expiredOverride,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
            });

            const result = await service.hasFeature('tenant-123', 'plan-456', FeatureKeys.CRM);
            expect(result).toBe(false); // Override expired, feature not in plan
        });

        it('should use valid non-expired overrides', async () => {
            const mockPlanFeatures: any[] = [];
            const validOverride = {
                feature_key: FeatureKeys.CRM,
                is_enabled: true,
                expires_at: new Date(Date.now() + 86400000).toISOString(), // Expires tomorrow
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'plan_features') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                data: mockPlanFeatures,
                                error: null,
                            }),
                        }),
                    };
                } else if (table === 'tenant_feature_overrides') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockReturnValue({
                                    data: validOverride,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
            });

            const result = await service.hasFeature('tenant-123', 'plan-456', FeatureKeys.CRM);
            expect(result).toBe(true);
        });

        it('should handle database errors gracefully', async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        data: null,
                        error: { message: 'Database error' },
                    }),
                }),
            });

            const result = await service.hasFeature('tenant-123', 'plan-456', FeatureKeys.CRM);
            expect(result).toBe(false);
        });
    });

    describe('getAllFeatures', () => {
        it('should return all enabled features including overrides', async () => {
            const mockPlanFeatures = [
                { feature_key: FeatureKeys.CRM },
                { feature_key: FeatureKeys.PROJECTS },
            ];

            const mockOverrides = [
                { feature_key: FeatureKeys.FINANCE, is_enabled: true, expires_at: null },
                { feature_key: FeatureKeys.CRM, is_enabled: false, expires_at: null }, // Disable CRM
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'plan_features') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                data: mockPlanFeatures,
                                error: null,
                            }),
                        }),
                    };
                } else if (table === 'tenant_feature_overrides') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                data: mockOverrides,
                                error: null,
                            }),
                        }),
                    };
                }
            });

            const result = await service.getAllFeatures('tenant-123', 'plan-456');

            // Should have PROJECTS (from plan), FINANCE (from override), but NOT CRM (disabled by override)
            expect(result).toContain(FeatureKeys.PROJECTS);
            expect(result).toContain(FeatureKeys.FINANCE);
            expect(result).not.toContain(FeatureKeys.CRM);
        });
    });
});
