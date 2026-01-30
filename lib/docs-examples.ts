
/**
 * Resolves available features for a tenant, considering the active plan and any manual overrides.
 * Uses a caching strategy to minimize database calls.
 * 
 * @param tenantId The UUID of the tenant
 * @returns A Set of feature keys enabled for the tenant
 */
export async function resolveFeatures(tenantId: string): Promise<Set<string>> {
    // Implementation...
}

/**
 * Invalidates the feature cache for a specific tenant.
 * Should be called whenever overrides or subscription plans are modified.
 * 
 * @param tenantId The UUID of the tenant
 */
export function invalidateFeatureCache(tenantId: string): void {
    // Implementation...
}
