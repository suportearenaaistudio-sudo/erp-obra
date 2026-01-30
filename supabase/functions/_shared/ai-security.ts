/**
 * AI Security Module for Edge Functions (Deno)
 * 
 * Simplified version for Supabase Edge Functions
 */

/**
 * PII Patterns
 */
const PII_PATTERNS = {
    CPF: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
    CNPJ: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    CREDIT_CARD: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    PHONE: /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}\b/g,
};

export interface PIIMaskingResult {
    maskedText: string;
    detectedPII: string[];
    hasPII: boolean;
}

/**
 * Mask PII in text
 */
export function maskPII(text: string): PIIMaskingResult {
    let maskedText = text;
    const detectedPII: string[] = [];

    // Mask CPF
    if (PII_PATTERNS.CPF.test(text)) {
        maskedText = maskedText.replace(PII_PATTERNS.CPF, '[CPF_REDACTED]');
        detectedPII.push('CPF');
    }

    // Mask CNPJ
    if (PII_PATTERNS.CNPJ.test(text)) {
        maskedText = maskedText.replace(PII_PATTERNS.CNPJ, '[CNPJ_REDACTED]');
        detectedPII.push('CNPJ');
    }

    // Mask Email
    if (PII_PATTERNS.EMAIL.test(text)) {
        maskedText = maskedText.replace(PII_PATTERNS.EMAIL, '[EMAIL_REDACTED]');
        detectedPII.push('EMAIL');
    }

    // Mask Credit Card
    if (PII_PATTERNS.CREDIT_CARD.test(text)) {
        maskedText = maskedText.replace(PII_PATTERNS.CREDIT_CARD, '[CARD_REDACTED]');
        detectedPII.push('CREDIT_CARD');
    }

    // Mask Phone
    if (PII_PATTERNS.PHONE.test(text)) {
        maskedText = maskedText.replace(PII_PATTERNS.PHONE, '[PHONE_REDACTED]');
        detectedPII.push('PHONE');
    }

    return {
        maskedText,
        detectedPII: [...new Set(detectedPII)],
        hasPII: detectedPII.length > 0,
    };
}

/**
 * Prompt injection detection
 */
const INJECTION_PATTERNS = [
    /ignore\s+previous\s+instructions/i,
    /disregard\s+all\s+previous/i,
    /forget\s+everything/i,
    /you\s+are\s+now/i,
    /system\s*:/i,
];

export function detectPromptInjection(text: string): {
    isInjection: boolean;
    confidence: 'low' | 'medium' | 'high';
} {
    let matches = 0;

    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(text)) {
            matches++;
        }
    }

    const confidence = matches >= 3 ? 'high' : matches >= 1 ? 'medium' : 'low';

    return {
        isInjection: matches > 0,
        confidence,
    };
}

/**
 * AI Quotas
 */
export const AI_QUOTAS = {
    STARTER: { daily: 10, monthly: 100 },
    PRO: { daily: 100, monthly: 1000 },
    ENTERPRISE: { daily: 1000, monthly: 10000 },
};

/**
 * Check AI Quota
 */
export async function checkAIQuota(
    supabase: any,
    tenantId: string,
    planName: string
): Promise<{
    allowed: boolean;
    reason?: string;
    usage: { daily: number; monthly: number };
}> {
    const plan = planName.toUpperCase() as keyof typeof AI_QUOTAS;
    const quota = AI_QUOTAS[plan] || AI_QUOTAS.STARTER;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Count monthly messages
    const { count: monthlyCount } = await supabase
        .from('ai_messages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStart.toISOString());

    // Count daily messages
    const { count: dailyCount } = await supabase
        .from('ai_messages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', dayStart.toISOString());

    const monthly = monthlyCount || 0;
    const daily = dailyCount || 0;

    if (monthly >= quota.monthly) {
        return {
            allowed: false,
            reason: `Monthly quota exceeded (${monthly}/${quota.monthly})`,
            usage: { daily, monthly },
        };
    }

    if (daily >= quota.daily) {
        return {
            allowed: false,
            reason: `Daily quota exceeded (${daily}/${quota.daily})`,
            usage: { daily, monthly },
        };
    }

    return {
        allowed: true,
        usage: { daily, monthly },
    };
}
