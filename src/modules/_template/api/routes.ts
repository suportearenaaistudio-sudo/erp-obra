/**
 * Example Module Routes
 * 
 * Define routes with appropriate guards for security.
 * This is a conceptual example - actual implementation depends on your routing framework.
 */

import { SecurityPipeline } from '../../../shared/security/pipeline';
import { FeatureKey } from '../../../shared/constants/features';
import { PermissionKey } from '../../../shared/constants/permissions';

/**
 * Example route configuration
 * 
 * In a Supabase Edge Function, you would use this structure:
 * 
 * ```typescript
 * const handlers = new ExampleHandlers(createUseCase, archiveUseCase);
 * const pipeline = new SecurityPipeline(supabase);
 * 
 * // Apply security pipeline
 * await pipeline.checkTenant(context);
 * await pipeline.checkSubscription(context);
 * await pipeline.checkFeature(context, FeatureKey.EXAMPLE_MODULE);
 * await pipeline.checkPermission(context, PermissionKey.EXAMPLE_CREATE);
 * 
 * // Call handler
 * return handlers.create(req, res, context);
 * ```
 */

export const ExampleModuleConfig = {
    /**
     * Feature flag required for this module
     */
    featureKey: FeatureKey.EXAMPLE_MODULE,

    /**
     * Routes and their required permissions
     */
    routes: [
        {
            method: 'GET',
            path: '/tenant/examples',
            handler: 'list',
            permissions: [PermissionKey.EXAMPLE_VIEW],
        },
        {
            method: 'GET',
            path: '/tenant/examples/:id',
            handler: 'getById',
            permissions: [PermissionKey.EXAMPLE_VIEW],
        },
        {
            method: 'POST',
            path: '/tenant/examples',
            handler: 'create',
            permissions: [PermissionKey.EXAMPLE_CREATE],
        },
        {
            method: 'PUT',
            path: '/tenant/examples/:id',
            handler: 'update',
            permissions: [PermissionKey.EXAMPLE_UPDATE],
        },
        {
            method: 'DELETE',
            path: '/tenant/examples/:id',
            handler: 'archive',
            permissions: [PermissionKey.EXAMPLE_DELETE],
        },
    ],
};

/**
 * Example Edge Function Entry Point
 * 
 * This shows how to structure an Edge Function for this module:
 * 
 * ```typescript
 * import { createClient } from '@supabase/supabase-js';
 * import { SecurityPipeline } from '../_shared/security/pipeline';
 * import { generateTraceId } from '../_shared/logging/logger';
 * import { ExampleHandlers } from './api/handlers/example.handlers';
 * 
 * Deno.serve(async (req) => {
 *     const traceId = generateTraceId();
 *     const supabase = createClient(...);
 *     
 *     // Build context
 *     const context = await buildRequestContext(req, supabase, traceId);
 *     
 *     // Security pipeline
 *     const pipeline = new SecurityPipeline(supabase);
 *     await pipeline.checkTenant(context);
 *     await pipeline.checkSubscription(context);
 *     await pipeline.checkFeature(context, FeatureKey.EXAMPLE_MODULE);
 *     
 *     // Route to handler
 *     const handlers = new ExampleHandlers(...);
 *     
 *     if (req.method === 'GET') {
 *         await pipeline.checkPermission(context, PermissionKey.EXAMPLE_VIEW);
 *         return handlers.list(req, res, context);
 *     }
 *     // ... more routes
 * });
 * ```
 */
