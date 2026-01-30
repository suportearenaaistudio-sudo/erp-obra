import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionGuard } from '../../src/shared/security/subscription.guard';
import { RequestContext } from '../../src/shared/types/context';
import { AppError, ErrorCode } from '../../src/shared/errors/errors';

describe('SubscriptionGuard', () => {
    let guard: SubscriptionGuard;
    let mockSupabase: any;
    let context: RequestContext;

    beforeEach(() => {
        mockSupabase = {
            from: vi.fn(),
        };

        guard = new SubscriptionGuard(mockSupabase);

        context = {
            userType: 'tenant',
            tenantId: 'tenant-123',
            userId: 'user-456',
            traceId: 'trace-789',
        };
    });

    describe('check', () => {
        it('should pass when subscription is active', async () => {
            const mockSubscription = {
                status: 'active',
                trial_ends_at: null,
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockReturnValue({
                            data: mockSubscription,
                            error: null,
                        }),
                    }),
                }),
            });

            await expect(guard.check(context)).resolves.not.toThrow();
        });

        it('should pass when subscription is in trial', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const mockSubscription = {
                status: 'trialing',
                trial_ends_at: tomorrow.toISOString(),
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockReturnValue({
                            data: mockSubscription,
                            error: null,
                        }),
                    }),
                }),
            });

            await expect(guard.check(context)).resolves.not.toThrow();
        });

        it('should throw when subscription is canceled', async () => {
            const mockSubscription = {
                status: 'canceled',
                trial_ends_at: null,
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockReturnValue({
                            data: mockSubscription,
                            error: null,
                        }),
                    }),
                }),
            });

            await expect(guard.check(context)).rejects.toThrow(AppError);
            await expect(guard.check(context)).rejects.toMatchObject({
                code: ErrorCode.SUBSCRIPTION_CANCELED,
                statusCode: 403,
            });
        });

        it('should throw when subscription is suspended', async () => {
            const mockSubscription = {
                status: 'suspended',
                trial_ends_at: null,
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockReturnValue({
                            data: mockSubscription,
                            error: null,
                        }),
                    }),
                }),
            });

            await expect(guard.check(context)).rejects.toThrow(AppError);
            await expect(guard.check(context)).rejects.toMatchObject({
                code: ErrorCode.SUBSCRIPTION_SUSPENDED,
                statusCode: 403,
            });
        });

        it('should throw when trial has expired', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const mockSubscription = {
                status: 'trialing',
                trial_ends_at: yesterday.toISOString(),
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockReturnValue({
                            data: mockSubscription,
                            error: null,
                        }),
                    }),
                }),
            });

            await expect(guard.check(context)).rejects.toThrow(AppError);
            await expect(guard.check(context)).rejects.toMatchObject({
                code: ErrorCode.SUBSCRIPTION_INACTIVE,
            });
        });

        it('should throw when subscription not found', async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockReturnValue({
                            data: null,
                            error: { message: 'Not found' },
                        }),
                    }),
                }),
            });

            await expect(guard.check(context)).rejects.toThrow(AppError);
            await expect(guard.check(context)).rejects.toMatchObject({
                code: ErrorCode.SUBSCRIPTION_NOT_FOUND,
                statusCode: 404,
            });
        });

        it('should throw when tenantId is missing', async () => {
            const contextWithoutTenant = { ...context, tenantId: undefined };

            await expect(guard.check(contextWithoutTenant)).rejects.toThrow(AppError);
        });
    });
});
