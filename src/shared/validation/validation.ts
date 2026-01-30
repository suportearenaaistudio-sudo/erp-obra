import { ZodSchema, ZodError } from 'zod';
import { AppError, ErrorCode } from '../errors/errors';

/**
 * Validation Error for API responses
 */
export class ValidationError extends AppError {
    public readonly errors: any[];

    constructor(zodError: ZodError) {
        const messages = zodError.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        super(ErrorCode.VALIDATION_ERROR, `Validation failed: ${messages.join(', ')}`, 400);
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
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid JSON in request body', 400);
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
