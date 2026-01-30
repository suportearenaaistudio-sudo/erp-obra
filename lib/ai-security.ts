/**
 * AI Security Module
 * 
 * Implements security measures for AI interactions:
 * - PII Detection and Masking
 * - Content Filtering
 * - Prompt Injection Prevention
 * - Usage Quota Tracking
 */

/**
 * PII Patterns for detection
 */
const PII_PATTERNS = {
    // Brazilian CPF: 000.000.000-00 or 00000000000
    CPF: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,

    // Brazilian CNPJ: 00.000.000/0000-00 or 00000000000000
    CNPJ: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,

    // Email addresses
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

    // Credit card numbers (basic pattern)
    CREDIT_CARD: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

    // Phone numbers (Brazilian format)
    PHONE: /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}\b/g,

    // Brazilian CEP: 00000-000
    CEP: /\b\d{5}-?\d{3}\b/g,
};

export interface PIIMaskingResult {
    maskedText: string;
    detectedPII: string[];
    hasPII: boolean;
}

/**
 * Detect and mask PII in text
 */
export function maskPII(text: string): PIIMaskingResult {
    let maskedText = text;
    const detectedPII: string[] = [];

    // Mask CPF
    const cpfMatches = text.match(PII_PATTERNS.CPF);
    if (cpfMatches) {
        cpfMatches.forEach(cpf => {
            maskedText = maskedText.replace(cpf, '[CPF_REDACTED]');
            detectedPII.push('CPF');
        });
    }

    // Mask CNPJ
    const cnpjMatches = text.match(PII_PATTERNS.CNPJ);
    if (cnpjMatches) {
        cnpjMatches.forEach(cnpj => {
            maskedText = maskedText.replace(cnpj, '[CNPJ_REDACTED]');
            detectedPII.push('CNPJ');
        });
    }

    // Mask Email
    const emailMatches = text.match(PII_PATTERNS.EMAIL);
    if (emailMatches) {
        emailMatches.forEach(email => {
            maskedText = maskedText.replace(email, '[EMAIL_REDACTED]');
            detectedPII.push('EMAIL');
        });
    }

    // Mask Credit Card
    const ccMatches = text.match(PII_PATTERNS.CREDIT_CARD);
    if (ccMatches) {
        ccMatches.forEach(cc => {
            maskedText = maskedText.replace(cc, '[CARD_REDACTED]');
            detectedPII.push('CREDIT_CARD');
        });
    }

    // Mask Phone
    const phoneMatches = text.match(PII_PATTERNS.PHONE);
    if (phoneMatches) {
        phoneMatches.forEach(phone => {
            maskedText = maskedText.replace(phone, '[PHONE_REDACTED]');
            detectedPII.push('PHONE');
        });
    }

    return {
        maskedText,
        detectedPII: [...new Set(detectedPII)],
        hasPII: detectedPII.length > 0,
    };
}

/**
 * Prompt injection patterns
 */
const INJECTION_PATTERNS = [
    /ignore\s+previous\s+instructions/i,
    /disregard\s+all\s+previous/i,
    /forget\s+everything/i,
    /you\s+are\s+now/i,
    /new\s+instructions:/i,
    /system\s*:/i,
    /admin\s*:/i,
    /<\s*script/i,
    /javascript:/i,
    /eval\s*\(/i,
];

/**
 * Detect potential prompt injection attempts
 */
export function detectPromptInjection(text: string): {
    isInjection: boolean;
    confidence: 'low' | 'medium' | 'high';
    matchedPatterns: string[];
} {
    const matchedPatterns: string[] = [];

    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(text)) {
            matchedPatterns.push(pattern.source);
        }
    }

    // Determine confidence based on matches
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (matchedPatterns.length >= 3) {
        confidence = 'high';
    } else if (matchedPatterns.length >= 1) {
        confidence = 'medium';
    }

    return {
        isInjection: matchedPatches.length > 0,
        confidence,
        matchedPatterns,
    };
}

/**
 * AI Usage Quotas by Plan
 */
export const AI_QUOTAS = {
    STARTER: {
        monthlyMessages: 100,
        dailyMessages: 10,
        maxTokensPerMessage: 2000,
    },
    PRO: {
        monthlyMessages: 1000,
        dailyMessages: 100,
        maxTokensPerMessage: 4000,
    },
    ENTERPRISE: {
        monthlyMessages: 10000,
        dailyMessages: 1000,
        maxTokensPerMessage: 8000,
    },
};

/**
 * Check if user has exceeded quota
 */
export async function checkAIQuota(
    supabase: any,
    tenantId: string,
    planName: string
): Promise<{
    allowed: boolean;
    reason?: string;
    usage: { daily: number; monthly: number };
    limits: { daily: number; monthly: number };
}> {
    const plan = planName.toUpperCase() as keyof typeof AI_QUOTAS;
    const quota = AI_QUOTAS[plan] || AI_QUOTAS.STARTER;

    // Get current month/day boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Count messages in current month
    const { count: monthlyCount } = await supabase
        .from('ai_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStart.toISOString());

    // Count messages today
    const { count: dailyCount } = await supabase
        .from('ai_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', dayStart.toISOString());

    const monthlyUsage = monthlyCount || 0;
    const dailyUsage = dailyCount || 0;

    // Check limits
    if (monthlyUsage >= quota.monthlyMessages) {
        return {
            allowed: false,
            reason: `Monthly quota exceeded (${monthlyUsage}/${quota.monthlyMessages})`,
            usage: { daily: dailyUsage, monthly: monthlyUsage },
            limits: { daily: quota.dailyMessages, monthly: quota.monthlyMessages },
        };
    }

    if (dailyUsage >= quota.dailyMessages) {
        return {
            allowed: false,
            reason: `Daily quota exceeded (${dailyUsage}/${quota.dailyMessages})`,
            usage: { daily: dailyUsage, monthly: monthlyUsage },
            limits: { daily: quota.dailyMessages, monthly: quota.monthlyMessages },
        };
    }

    return {
        allowed: true,
        usage: { daily: dailyUsage, monthly: monthlyUsage },
        limits: { daily: quota.dailyMessages, monthly: quota.monthlyMessages },
    };
}

/**
 * Sanitize AI response before sending to user
 */
export function sanitizeAIResponse(response: string): string {
    // Remove any potential script tags
    let sanitized = response.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove javascript: protocols
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove eval calls
    sanitized = sanitized.replace(/eval\s*\(/gi, '');

    return sanitized;
}

/**
 * Log AI security event
 */
export async function logAISecurityEvent(
    supabase: any,
    event: {
        tenantId: string;
        userId: string;
        eventType: 'PII_DETECTED' | 'INJECTION_ATTEMPT' | 'QUOTA_EXCEEDED' | 'CONTENT_FILTERED';
        severity: 'low' | 'medium' | 'high';
        details: any;
    }
): Promise<void> {
    await supabase.from('audit_logs').insert({
        event_type: `AI_SECURITY_${event.eventType}`,
        tenant_id: event.tenantId,
        actor_id: event.userId,
        severity: event.severity,
        metadata: event.details,
        created_at: new Date().toISOString(),
    });
}
