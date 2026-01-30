import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RBACGuard } from '../../src/shared/security/rbac.guard';
import { RequestContext } from '../../src/shared/types/context';
import { AppError, ErrorCode } from '../../src/shared/errors/errors';

describe('RBACGuard', () => {
    let guard: RBACGuard;
    let mockSupabase: any;
    let context: RequestContext;

    beforeEach(() => {
        mockSupabase = {
            from: vi.fn(),
        };

        guard = new RBACGuard(mockSupabase);

        context = {
            userType: 'tenant',
            tenantId: 'tenant-123',
            userId: 'user-456',
            traceId: 'trace-789',
        };
    });

    describe('check', () => {
        it('should pass when user has required permission', async () => {
            const mockPermissions = [
                { permission_key: 'WORK_VIEW' },
                { permission_key: 'WORK_CREATE' },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        data: mockPermissions,
                        error: null,
                    }),
                }),
            });

            await expect(
                guard.check(context, 'WORK_CREATE')
            ).resolves.not.toThrow();
        });

        it('should throw when user does not have required permission', async () => {
            const mockPermissions = [
                { permission_key: 'WORK_VIEW' },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        data: mockPermissions,
                        error: null,
                    }),
                }),
            });

            await expect(
                guard.check(context, 'WORK_DELETE')
            ).rejects.toThrow(AppError);

            await expect(
                guard.check(context, 'WORK_DELETE')
            ).rejects.toMatchObject({
                code: ErrorCode.PERMISSION_DENIED,
                statusCode: 403,
            });
        });

        it('should throw when user has no permissions', async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        data: [],
                        error: null,
                    }),
                }),
            });

            await expect(
                guard.check(context, 'WORK_VIEW')
            ).rejects.toThrow(AppError);
        });

        it('should throw when tenantId is missing', async () => {
            const contextWithoutTenant = { ...context, tenantId: undefined };

            await expect(
                guard.check(contextWithoutTenant, 'WORK_VIEW')
            ).rejects.toThrow(AppError);
        });

        it('should throw when userId is missing', async () => {
            const contextWithoutUser = { ...context, userId: undefined };

            await expect(
                guard.check(contextWithoutUser, 'WORK_VIEW')
            ).rejects.toThrow(AppError);
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

            await expect(
                guard.check(context, 'WORK_VIEW')
            ).rejects.toThrow(AppError);
        });

        it('should pass with wildcard permission (*)', async () => {
            const mockPermissions = [
                { permission_key: '*' }, // Admin has all permissions
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        data: mockPermissions,
                        error: null,
                    }),
                }),
            });

            await expect(
                guard.check(context, 'ANY_PERMISSION')
            ).resolves.not.toThrow();
        });
    });
});
