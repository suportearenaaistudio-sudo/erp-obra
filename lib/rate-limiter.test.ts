import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, RateLimits } from './rate-limiter';

describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = new RateLimiter();
    });

    it('should allow requests under the limit', async () => {
        const key = 'test-user';
        const config = { windowMs: 1000, maxRequests: 3 };

        await expect(limiter.check(key, config)).resolves.not.toThrow();
        await expect(limiter.check(key, config)).resolves.not.toThrow();
        await expect(limiter.check(key, config)).resolves.not.toThrow();
    });

    it('should block requests over the limit', async () => {
        const key = 'test-user';
        const config = { windowMs: 1000, maxRequests: 2 };

        await limiter.check(key, config);
        await limiter.check(key, config);

        await expect(limiter.check(key, config)).rejects.toThrow('Rate limit exceeded');
    });

    it('should allow requests after window expires', async () => {
        const key = 'test-user';
        const config = { windowMs: 100, maxRequests: 1 };

        await limiter.check(key, config);

        // Wait for window to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        await expect(limiter.check(key, config)).resolves.not.toThrow();
    });

    it('should track different keys separately', async () => {
        const config = { windowMs: 1000, maxRequests: 1 };

        await limiter.check('user1', config);
        await expect(limiter.check('user2', config)).resolves.not.toThrow();
    });

    it('should return correct remaining count', () => {
        const key = 'test-user';
        const config = { windowMs: 1000, maxRequests: 5 };

        expect(limiter.getRemaining(key, config)).toBe(5);

        limiter.check(key, config);
        expect(limiter.getRemaining(key, config)).toBe(4);
    });

    it('should reset limits for a key', async () => {
        const key = 'test-user';
        const config = { windowMs: 1000, maxRequests: 1 };

        await limiter.check(key, config);
        await expect(limiter.check(key, config)).rejects.toThrow();

        limiter.reset(key);
        await expect(limiter.check(key, config)).resolves.not.toThrow();
    });

    it('should include retry-after in error', async () => {
        const key = 'test-user';
        const config = { windowMs: 5000, maxRequests: 1 };

        await limiter.check(key, config);

        try {
            await limiter.check(key, config);
            expect.fail('Should have thrown');
        } catch (error: any) {
            expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
            expect(error.retryAfter).toBeGreaterThan(0);
            expect(error.retryAfter).toBeLessThanOrEqual(5);
        }
    });
});

describe('Pre-configured limits', () => {
    it('should have LOGIN limit of 5 per 15 minutes', () => {
        expect(RateLimits.LOGIN.maxRequests).toBe(5);
        expect(RateLimits.LOGIN.windowMs).toBe(15 * 60 * 1000);
    });

    it('should have AI_CHAT limit of 20 per minute', () => {
        expect(RateLimits.AI_CHAT.maxRequests).toBe(20);
        expect(RateLimits.AI_CHAT.windowMs).toBe(60 * 1000);
    });

    it('should have different AI limits per plan', () => {
        expect(RateLimits.AI_CHAT_STARTER.maxRequests).toBe(10);
        expect(RateLimits.AI_CHAT_PRO.maxRequests).toBe(50);
        expect(RateLimits.AI_CHAT_ENTERPRISE.maxRequests).toBe(200);
    });
});
