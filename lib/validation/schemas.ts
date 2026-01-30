import { z } from 'zod';

/**
 * Validation Schemas
 * Using Zod for runtime type checking and input validation
 */

// UUID validation helper
const uuidSchema = z.string().uuid('UUID inválido');

// Email validation
const emailSchema = z.string().email('Email inválido');

/**
 * AI Chat Schemas
 */
export const aiChatSchema = z.object({
    conversationId: uuidSchema.optional(),
    message: z.string()
        .min(1, 'Mensagem não pode estar vazia')
        .max(4000, 'Mensagem muito longa (máx 4000 caracteres)'),
});

export type AiChatInput = z.infer<typeof aiChatSchema>;

/**
 * Impersonation Schemas
 */
export const impersonateSchema = z.object({
    tenant_id: uuidSchema,
    user_id: uuidSchema,
    reason: z.string()
        .min(10, 'Razão deve ter no mínimo 10 caracteres')
        .max(500, 'Razão muito longa (máx 500 caracteres)'),
});

export type ImpersonateInput = z.infer<typeof impersonateSchema>;

export const endImpersonationSchema = z.object({
    session_id: uuidSchema,
});

/**
 * Feature Override Schemas
 */
export const featureOverrideSchema = z.object({
    tenant_id: uuidSchema,
    feature_key: z.string()
        .regex(/^[A-Z_]+$/, 'Feature key deve conter apenas letras maiúsculas e underscores'),
    enabled: z.boolean(),
    expires_at: z.string().datetime().optional(),
    reason: z.string()
        .min(5, 'Razão obrigatória')
        .max(255, 'Razão muito longa'),
});

export type FeatureOverrideInput = z.infer<typeof featureOverrideSchema>;

/**
 * Project/Work Schemas
 */
export const createProjectSchema = z.object({
    name: z.string().min(3, 'Nome muito curto').max(255),
    description: z.string().max(2000).optional(),
    client_id: uuidSchema.optional(),
    start_date: z.string().datetime(),
    end_date: z.string().datetime().optional(),
    budget_total: z.number().min(0).optional(),
    address: z.string().max(500).optional(),
});

/**
 * Financial Record Schemas
 */
export const createFinancialRecordSchema = z.object({
    type: z.enum(['AR', 'AP'], { errorMap: () => ({ message: 'Tipo deve ser AR ou AP' }) }),
    description: z.string().min(3).max(500),
    amount: z.number().positive('Valor deve ser positivo'),
    due_date: z.string().datetime(),
    category: z.string().max(100).optional(),
    project_id: uuidSchema.optional(),
});

/**
 * Material/Inventory Schemas
 */
export const createMaterialSchema = z.object({
    sku: z.string().min(1).max(50),
    name: z.string().min(3).max(255),
    unit: z.string().max(20),
    category: z.string().max(100).optional(),
    min_stock: z.number().min(0).default(0),
    current_stock: z.number().min(0).default(0),
    avg_cost: z.number().min(0).optional(),
});

export const stockMovementSchema = z.object({
    material_id: uuidSchema,
    quantity: z.number().positive('Quantidade deve ser positiva'),
    type: z.enum(['in', 'out']),
    reason: z.string().min(3).max(255),
});

/**
 * User/Authentication Schemas
 */
export const createUserSchema = z.object({
    email: emailSchema,
    name: z.string().min(2).max(255),
    role_id: uuidSchema.optional(),
    phone: z.string().max(20).optional(),
});

export const updateUserSchema = createUserSchema.partial();

/**
 * Generic validation helpers
 */
export const paginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
    start_date: z.string().datetime(),
    end_date: z.string().datetime(),
}).refine(data => new Date(data.start_date) <= new Date(data.end_date), {
    message: 'Data inicial deve ser anterior à data final',
});

/**
 * Sanitization helpers
 */
export function sanitizeString(str: string): string {
    // Remove caracteres potencialmente perigosos
    return str
        .replace(/[<>]/g, '') // Remove < e >
        .replace(/javascript:/gi, '') // Remove javascript:
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
}

export function sanitizeForLog(obj: any): any {
    const sensitive = ['password', 'token', 'secret', 'apikey', 'authorization'];

    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
        if (sensitive.some(s => key.toLowerCase().includes(s))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeForLog(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}
