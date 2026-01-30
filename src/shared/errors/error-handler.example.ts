/**
 * Example of using the Error Handler in an Edge Function
 * 
 * This shows how to integrate the error middleware into your Edge Functions
 */

import { createClient } from '@supabase/supabase-js';
import { ErrorHandler } from '../_shared/errors/error-handler';
import { AppError, ErrorCode } from '../_shared/errors/errors';
import { generateTraceId } from '../_shared/logging/logger';

Deno.serve(async (req) => {
    const traceId = generateTraceId();
    const errorHandler = new ErrorHandler();

    try {
        // Your business logic here
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );

        // Example: throw an error
        if (!req.headers.get('authorization')) {
            throw new AppError(
                ErrorCode.UNAUTHORIZED,
                'Missing authorization header',
                401
            );
        }

        // Success response
        return new Response(
            JSON.stringify({ message: 'Success' }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        // Let error handler take care of it
        return errorHandler.handle(error, traceId);
    }
});

/**
 * Alternative: Using the withErrorHandler wrapper
 */

import { withErrorHandler } from '../_shared/errors/error-handler';

Deno.serve(withErrorHandler(async (req) => {
    // Your business logic here
    // Errors will be automatically caught and handled

    if (!req.headers.get('authorization')) {
        throw new AppError(
            ErrorCode.UNAUTHORIZED,
            'Missing authorization header',
            401
        );
    }

    return new Response(
        JSON.stringify({ message: 'Success' }),
        { headers: { 'Content-Type': 'application/json' } }
    );
}, generateTraceId()));
