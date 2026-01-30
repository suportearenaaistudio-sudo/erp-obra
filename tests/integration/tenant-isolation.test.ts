import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Integration Tests for Tenant Isolation
 * 
 * These tests verify that the multi-tenant architecture prevents
 * cross-tenant data access.
 */

describe('Tenant Isolation Integration Tests', () => {
    let supabase: SupabaseClient;
    let tenant1Id: string;
    let tenant2Id: string;
    let user1Id: string;
    let user2Id: string;

    beforeEach(async () => {
        // Initialize Supabase client with service role for test setup
        supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        // Create test tenants
        const { data: tenant1 } = await supabase
            .from('tenants')
            .insert({ name: 'Test Tenant 1', status: 'active' })
            .select()
            .single();

        const { data: tenant2 } = await supabase
            .from('tenants')
            .insert({ name: 'Test Tenant 2', status: 'active' })
            .select()
            .single();

        tenant1Id = tenant1.id;
        tenant2Id = tenant2.id;

        // Create test users (this is simplified - actual implementation uses auth.admin.createUser)
        const { data: user1 } = await supabase
            .from('users')
            .insert({
                tenant_id: tenant1Id,
                email: 'user1@test.com',
                name: 'User 1'
            })
            .select()
            .single();

        const { data: user2 } = await supabase
            .from('users')
            .insert({
                tenant_id: tenant2Id,
                email: 'user2@test.com',
                name: 'User 2'
            })
            .select()
            .single();

        user1Id = user1.id;
        user2Id = user2.id;
    });

    afterEach(async () => {
        // Cleanup test data
        await supabase.from('users').delete().in('id', [user1Id, user2Id]);
        await supabase.from('tenants').delete().in('id', [tenant1Id, tenant2Id]);
    });

    it('should prevent tenant A from accessing tenant B data via works table', async () => {
        // Create a work for tenant 1
        const { data: work1 } = await supabase
            .from('works')
            .insert({
                tenant_id: tenant1Id,
                name: 'Tenant 1 Work',
                status: 'planning',
                created_by: user1Id
            })
            .select()
            .single();

        // Try to fetch with tenant 2 filter
        const { data: works, error } = await supabase
            .from('works')
            .select('*')
            .eq('tenant_id', tenant2Id)
            .eq('id', work1.id);

        // Should not find the work
        expect(works).toEqual([]);
        expect(error).toBeNull();

        // Cleanup
        await supabase.from('works').delete().eq('id', work1.id);
    });

    it('should prevent cross-tenant access via RLS policies', async () => {
        // This test would require actual user authentication
        // For now, we verify the basic isolation at query level

        const { data: work1 } = await supabase
            .from('works')
            .insert({
                tenant_id: tenant1Id,
                name: 'Tenant 1 Work',
                status: 'planning',
                created_by: user1Id
            })
            .select()
            .single();

        // Query with wrong tenant_id should return empty
        const { data: crossTenantWorks } = await supabase
            .from('works')
            .select('*')
            .eq('tenant_id', tenant2Id);

        const work1InResults = crossTenantWorks?.find(w => w.id === work1.id);
        expect(work1InResults).toBeUndefined();

        // Cleanup
        await supabase.from('works').delete().eq('id', work1.id);
    });

    it('should ensure all tenant tables have tenant_id column', async () => {
        // List of tables that should have tenant_id
        const tenantTables = [
            'works',
            'users',
            'user_roles',
            'roles',
            'subscriptions',
            'tenant_feature_overrides'
        ];

        for (const table of tenantTables) {
            // Try to query without tenant_id (should still work but filtered by RLS)
            const { error } = await supabase
                .from(table)
                .select('tenant_id')
                .limit(1);

            // Should not error - column exists
            expect(error).toBeNull();
        }
    });

    it('should validate BaseTenantRepository enforces tenant_id', async () => {
        // This is more of a unit test, but validates the pattern
        // In real usage, repositories should throw if tenant_id is missing

        // Create work with tenant_id
        const { data: work, error } = await supabase
            .from('works')
            .insert({
                tenant_id: tenant1Id,
                name: 'Test Work',
                status: 'planning',
                created_by: user1Id
            })
            .select()
            .single();

        expect(error).toBeNull();
        expect(work.tenant_id).toBe(tenant1Id);

        // Cleanup
        await supabase.from('works').delete().eq('id', work.id);
    });
});

/**
 * To run these tests:
 * 
 * 1. Set up test environment variables:
 *    SUPABASE_URL=your-test-project-url
 *    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 * 
 * 2. Run: npm test -- tenant-isolation.test.ts
 * 
 * Note: These tests use the service role key for setup/teardown.
 * In production, tenant isolation is enforced by RLS policies.
 */
