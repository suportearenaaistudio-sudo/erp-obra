import { ZodSchema, ZodError } from 'https://esm.sh/zod@3.22.4';

/**
 * Validation Error for API responses
 */
export class ValidationError extends Error {
    public readonly errors: any[];

    constructor(zodError: ZodError) {
        const messages = zodError.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        super(`Validation failed: ${messages.join(', ')}`);
        this.name = 'ValidationError';
        this.errors = zodError.errors;
    }
}

/**
 * Validates request body against a Zod schema
 * Returns validated & typed data or throws ValidationError
 */
export async function validateRequest<T>(
    req: Request,
    schema: ZodSchema<T>
): Promise<T> {
    try {
        const body = await req.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            throw new ValidationError(result.error);
        }

        return result.data;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new Error('Invalid JSON in request body');
    }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQueryParams<T>(
    url: URL,
    schema: ZodSchema<T>
): T {
    const params: any = {};
    url.searchParams.forEach((value, key) => {
        // Try to parse as JSON for complex types
        try {
            params[key] = JSON.parse(value);
        } catch {
            params[key] = value;
        }
    });

    const result = schema.safeParse(params);

    if (!result.success) {
        throw new ValidationError(result.error);
    }

    return result.data;
}

/**
 * Helper to create standardized error responses
 */
export function createErrorResponse(
    error: Error,
    status: number = 500
): Response {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json',
    };

    if (error instanceof ValidationError) {
        return new Response(
            JSON.stringify({
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: error.errors,
            }),
            { status: 400, headers: corsHeaders }
        );
    }

    return new Response(
        JSON.stringify({
            error: error.message || 'Internal server error',
            code: 'INTERNAL_ERROR',
        }),
        { status, headers: corsHeaders }
    );
}
