/**
 * Rate Limiter
 * 
 * Protects endpoints from abuse with configurable rate limits.
 * Uses sliding window algorithm for accurate rate limiting.
 * 
 * NOTE: This is an in-memory implementation suitable for single-instance deployments.
 * For production multi-instance setups, use Redis or a similar distributed cache.
 */

export interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Maximum requests allowed in window
}

interface RequestLog {
    timestamps: number[];
    blocked: boolean;
    blockedUntil?: number;
}

export class RateLimiter {
    private store = new Map<string, RequestLog>();
    private cleanupInterval: number | null = null;

    constructor() {
        // Auto-cleanup old entries every 5 minutes
        if (typeof setInterval !== 'undefined') {
            this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000) as unknown as number;
        }
    }

    /**
     * Check if request is allowed
     * @throws Error with code RATE_LIMIT_EXCEEDED if limit reached
     */
    async check(key: string, config: RateLimitConfig): Promise<void> {
        const now = Date.now();
        const windowStart = now - config.windowMs;

        // Get or create request log
        let log = this.store.get(key);
        if (!log) {
            log = { timestamps: [], blocked: false };
            this.store.set(key, log);
        }

        // Check if currently blocked
        if (log.blocked && log.blockedUntil && now < log.blockedUntil) {
            const remainingMs = log.blockedUntil - now;
            throw Object.assign(
                new Error(`Rate limit exceeded. Try again in ${Math.ceil(remainingMs / 1000)} seconds.`),
                { code: 'RATE_LIMIT_EXCEEDED', retryAfter: Math.ceil(remainingMs / 1000) }
            );
        }

        // Remove timestamps outside the window
        log.timestamps = log.timestamps.filter(t => t > windowStart);

        // Check if limit exceeded
        if (log.timestamps.length >= config.maxRequests) {
            // Block for the window duration
            log.blocked = true;
            log.blockedUntil = now + config.windowMs;

            throw Object.assign(
                new Error(`Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`),
                { code: 'RATE_LIMIT_EXCEEDED', retryAfter: Math.ceil(config.windowMs / 1000) }
            );
        }

        // Add current timestamp
        log.timestamps.push(now);
        log.blocked = false;
    }

    /**
     * Get remaining requests for a key
     */
    getRemaining(key: string, config: RateLimitConfig): number {
        const log = this.store.get(key);
        if (!log) return config.maxRequests;

        const now = Date.now();
        const windowStart = now - config.windowMs;
        const recentRequests = log.timestamps.filter(t => t > windowStart).length;

        return Math.max(0, config.maxRequests - recentRequests);
    }

    /**
     * Reset limits for a key (useful for testing or manual override)
     */
    reset(key: string): void {
        this.store.delete(key);
    }

    /**
     * Cleanup old entries
     */
    private cleanup(): void {
        const now = Date.now();
        const threshold = now - (60 * 60 * 1000); // 1 hour ago

        for (const [key, log] of this.store.entries()) {
            // Remove if all timestamps are old and not blocked
            if (!log.blocked && log.timestamps.every(t => t < threshold)) {
                this.store.delete(key);
            }
        }
    }

    /**
     * Destroy the rate limiter (cleanup interval)
     */
    destroy(): void {
        if (this.cleanupInterval !== null && typeof clearInterval !== 'undefined') {
            clearInterval(this.cleanupInterval);
        }
        this.store.clear();
    }
}

/**
 * Pre-configured rate limit profiles
 */
export const RateLimits = {
    // Authentication - strict limits
    LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 },           // 5 attempts per 15 minutes
    SIGNUP: { windowMs: 60 * 60 * 1000, maxRequests: 3 },          // 3 signups per hour
    PASSWORD_RESET: { windowMs: 60 * 60 * 1000, maxRequests: 3 },  // 3 resets per hour

    // AI Endpoints - moderate limits
    AI_CHAT: { windowMs: 60 * 1000, maxRequests: 20 },             // 20 messages per minute
    AI_CHAT_STARTER: { windowMs: 60 * 1000, maxRequests: 10 },     // 10 for Starter plan
    AI_CHAT_PRO: { windowMs: 60 * 1000, maxRequests: 50 },         // 50 for Pro plan
    AI_CHAT_ENTERPRISE: { windowMs: 60 * 1000, maxRequests: 200 }, // 200 for Enterprise

    // Heavy Operations
    EXPORT: { windowMs: 60 * 1000, maxRequests: 3 },               // 3 exports per minute
    REPORT_GENERATION: { windowMs: 60 * 1000, maxRequests: 5 },    // 5 reports per minute
    BULK_IMPORT: { windowMs: 5 * 60 * 1000, maxRequests: 2 },      // 2 imports per 5 minutes

    // Admin Operations
    IMPERSONATION: { windowMs: 60 * 1000, maxRequests: 10 },       // 10 per minute

    // General API
    API_GENERAL: { windowMs: 60 * 1000, maxRequests: 100 },        // 100 per minute
};

/**
 * Get AI chat rate limit based on subscription plan
 */
export function getAIChatLimit(planName?: string): RateLimitConfig {
    const plan = planName?.toUpperCase();

    switch (plan) {
        case 'STARTER':
            return RateLimits.AI_CHAT_STARTER;
        case 'PRO':
            return RateLimits.AI_CHAT_PRO;
        case 'ENTERPRISE':
            return RateLimits.AI_CHAT_ENTERPRISE;
        default:
            return RateLimits.AI_CHAT; // Default fallback
    }
}

// Singleton instance for app-wide use
export const rateLimiter = new RateLimiter();
