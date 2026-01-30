/**
 * Rate Limiter for Deno Edge Functions
 * 
 * Simplified version for Deno runtime with KV store support
 */

export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

interface RequestLog {
    timestamps: number[];
    blocked: boolean;
    blockedUntil?: number;
}

export class EdgeRateLimiter {
    private store = new Map<string, RequestLog>();

    /**
     * Check if request is allowed
     */
    async check(key: string, config: RateLimitConfig): Promise<void> {
        const now = Date.now();
        const windowStart = now - config.windowMs;

        let log = this.store.get(key);
        if (!log) {
            log = { timestamps: [], blocked: false };
            this.store.set(key);
        }

        // Check if blocked
        if (log.blocked && log.blockedUntil && now < log.blockedUntil) {
            const remainingMs = log.blockedUntil - now;
            throw Object.assign(
                new Error(`Rate limit exceeded. Try again in ${Math.ceil(remainingMs / 1000)}s`),
                { code: 'RATE_LIMIT_EXCEEDED', status: 429, retryAfter: Math.ceil(remainingMs / 1000) }
            );
        }

        // Clean old timestamps
        log.timestamps = log.timestamps.filter(t => t > windowStart);

        // Check limit
        if (log.timestamps.length >= config.maxRequests) {
            log.blocked = true;
            log.blockedUntil = now + config.windowMs;

            throw Object.assign(
                new Error(`Too many requests. Limit: ${config.maxRequests}/${config.windowMs / 1000}s`),
                { code: 'RATE_LIMIT_EXCEEDED', status: 429, retryAfter: Math.ceil(config.windowMs / 1000) }
            );
        }

        // Record request
        log.timestamps.push(now);
        log.blocked = false;
    }

    reset(key: string): void {
        this.store.delete(key);
    }
}

/**
 * Pre-configured limits
 */
export const EdgeRateLimits = {
    LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
    AI_CHAT_STARTER: { windowMs: 60 * 1000, maxRequests: 10 },
    AI_CHAT_PRO: { windowMs: 60 * 1000, maxRequests: 50 },
    AI_CHAT_ENTERPRISE: { windowMs: 60 * 1000, maxRequests: 200 },
    IMPERSONATION: { windowMs: 60 * 1000, maxRequests: 10 },
};

export function getAIChatLimit(planName?: string): RateLimitConfig {
    const plan = planName?.toUpperCase();

    switch (plan) {
        case 'STARTER':
            return EdgeRateLimits.AI_CHAT_STARTER;
        case 'PRO':
            return EdgeRateLimits.AI_CHAT_PRO;
        case 'ENTERPRISE':
            return EdgeRateLimits.AI_CHAT_ENTERPRISE;
        default:
            return EdgeRateLimits.AI_CHAT_STARTER; // Conservative default
    }
}
