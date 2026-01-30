/**
 * JWT Utilities for Secure Impersonation
 * 
 * Uses signed JWTs to prevent tampering with impersonation sessions
 */

import { SignJWT, jwtVerify } from 'https://esm.sh/jose@5.2.0';

const JWT_SECRET = Deno.env.get('IMPERSONATION_JWT_SECRET');
if (!JWT_SECRET) {
    console.warn('WARNING: IMPERSONATION_JWT_SECRET not set. Impersonation will not work.');
}

const SECRET_KEY = new TextEncoder().encode(JWT_SECRET || 'default-insecure-key-change-me');

export interface ImpersonationPayload {
    sessionId: string;
    adminUserId: string;
    adminEmail: string;
    targetTenantId: string;
    targetUserId: string;
    reason: string;
    issuedAt: number;
    expiresAt: number;
}

/**
 * Create a signed JWT for impersonation session
 */
export async function createImpersonationToken(
    payload: Omit<ImpersonationPayload, 'issuedAt' | 'expiresAt'>
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 15 * 60; // 15 minutes

    const token = await new SignJWT({
        ...payload,
        issuedAt: now,
        expiresAt: now + expiresIn,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now)
        .setExpirationTime(now + expiresIn)
        .setSubject(payload.targetUserId)
        .setIssuer('obra360-admin')
        .setAudience('obra360-impersonation')
        .sign(SECRET_KEY);

    return token;
}

/**
 * Verify and decode impersonation JWT
 * @throws Error if token is invalid or expired
 */
export async function verifyImpersonationToken(token: string): Promise<ImpersonationPayload> {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY, {
            issuer: 'obra360-admin',
            audience: 'obra360-impersonation',
        });

        const now = Math.floor(Date.now() / 1000);
        const expiresAt = payload.expiresAt as number;

        if (now > expiresAt) {
            throw new Error('Impersonation session expired');
        }

        return payload as unknown as ImpersonationPayload;
    } catch (error) {
        throw new Error(`Invalid impersonation token: ${error.message}`);
    }
}

/**
 * Check if Dev Admin has permission
 * Now checks database instead of hardcoded list
 */
export async function checkDevAdminPermission(
    supabase: any,
    email: string
): Promise<{ authorized: boolean; userId?: string; role?: string }> {
    // Check saas_users table for Dev Admin role
    const { data: saasUser, error } = await supabase
        .from('saas_users')
        .select('id, email, role')
        .eq('email', email)
        .eq('is_active', true)
        .single();

    if (error || !saasUser) {
        return { authorized: false };
    }

    // Only allow DEV_ADMIN or SUPER_ADMIN roles
    const allowedRoles = ['DEV_ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(saasUser.role)) {
        return { authorized: false };
    }

    return {
        authorized: true,
        userId: saasUser.id,
        role: saasUser.role,
    };
}

/**
 * Log impersonation audit trail
 */
export async function logImpersonationAudit(
    supabase: any,
    event: {
        sessionId: string;
        adminUserId: string;
        adminEmail: string;
        targetTenantId: string;
        targetUserId: string;
        action: 'START' | 'END' | 'EXPIRED';
        reason?: string;
        ipAddress?: string;
        userAgent?: string;
    }
): Promise<void> {
    await supabase.from('audit_logs').insert({
        event_type: `IMPERSONATION_${event.action}`,
        actor_id: event.adminUserId,
        actor_email: event.adminEmail,
        tenant_id: event.targetTenantId,
        target_user_id: event.targetUserId,
        metadata: {
            sessionId: event.sessionId,
            reason: event.reason,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
        },
        created_at: new Date().toISOString(),
    });

    // Also log in support_session_logs for easier tracking
    await supabase.from('support_session_logs').insert({
        session_id: event.sessionId,
        admin_id: event.adminUserId,
        tenant_id: event.targetTenantId,
        user_id: event.targetUserId,
        action: event.action,
        reason: event.reason,
        ip_address: event.ipAddress,
        created_at: new Date().toISOString(),
    });
}
