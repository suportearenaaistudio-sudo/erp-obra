/**
 * Security Headers for Edge Functions
 * 
 * Implements comprehensive security headers to protect against:
 * - XSS attacks (CSP)
 * - Clickjacking (X-Frame-Options)
 * - MIME sniffing (X-Content-Type-Options)
 * - Information leakage (Referrer-Policy)
 * - Man-in-the-middle attacks (HSTS)
 */

export interface SecurityHeadersConfig {
    environment?: 'development' | 'production';
    allowedOrigins?: string[];
}

/**
 * Get comprehensive security headers
 */
export function getSecurityHeaders(config: SecurityHeadersConfig = {}): Record<string, string> {
    const { environment = 'production', allowedOrigins = ['*'] } = config;

    const isProd = environment === 'production';

    return {
        // CORS
        'Access-Control-Allow-Origin': allowedOrigins[0], // TODO: Make this more restrictive in production
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400', // 24 hours

        // Content Security Policy - prevents XSS attacks
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://esm.sh", // esm.sh for imports
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co",
            "frame-ancestors 'none'", // Prevent clickjacking
        ].join('; '),

        // HSTS - Force HTTPS (only in production)
        ...(isProd && {
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        }),

        // Prevent clickjacking
        'X-Frame-Options': 'DENY',

        // Prevent MIME sniffing
        'X-Content-Type-Options': 'nosniff',

        // XSS Protection (legacy but still useful)
        'X-XSS-Protection': '1; mode=block',

        // Referrer Policy - control information sent in Referer header
        'Referrer-Policy': 'strict-origin-when-cross-origin',

        // Permissions Policy - restrict browser features
        'Permissions-Policy': [
            'geolocation=()',
            'microphone=()',
            'camera=()',
            'payment=()',
            'usb=()',
            'magnetometer=()',
            'gyroscope=()',
            'accelerometer=()',
        ].join(', '),

        // Content-Type
        'Content-Type': 'application/json',
    };
}

/**
 * CORS Headers for preflight requests
 */
export function getCORSHeaders(allowedOrigins: string[] = ['*']): Record<string, string> {
    return {
        'Access-Control-Allow-Origin': allowedOrigins[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };
}

/**
 * Create a Response with security headers
 */
export function createSecureResponse(
    body: any,
    options: {
        status?: number;
        headers?: Record<string, string>;
        config?: SecurityHeadersConfig;
    } = {}
): Response {
    const { status = 200, headers = {}, config = {} } = options;

    const securityHeaders = getSecurityHeaders(config);
    const mergedHeaders = { ...securityHeaders, ...headers };

    return new Response(
        typeof body === 'string' ? body : JSON.stringify(body),
        {
            status,
            headers: mergedHeaders,
        }
    );
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCORS(allowedOrigins?: string[]): Response {
    return new Response(null, {
        status: 204,
        headers: getCORSHeaders(allowedOrigins),
    });
}
