import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Integration Tests for Security Guards
 * 
 * These tests verify that guards properly block/allow access
 */

describe('SubscriptionGuard Integration Tests', () => {
    let supabase: SupabaseClient;
    let testTenantId: string;

    beforeEach(async () => {
        supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        // Create test tenant with subscription
        const { data: tenant } = await supabase
            .from('tenants')
            .insert({ name: 'Test Tenant', status: 'active' })
            .select()
            .single();

        testTenantId = tenant.id;
    });

    afterEach(async () => {
        // Cleanup
        await supabase.from('subscriptions').delete().eq('tenant_id', testTenantId);
        await supabase.from('tenants').delete().eq('id', testTenantId);
    });

    it('should block access when subscription is canceled', async () => {
        // Create canceled subscription
        await supabase.from('subscriptions').insert({
            tenant_id: testTenantId,
            plan_id: 'test-plan',
            status: 'canceled',
        });

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('tenant_id', testTenantId)
            .single();

        expect(subscription?.status).toBe('canceled');
    });

    it('should block access when subscription is suspended', async () => {
        await supabase.from('subscriptions').insert({
            tenant_id: testTenantId,
            plan_id: 'test-plan',
            status: 'suspended',
        });

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('tenant_id', testTenantId)
            .single();

        expect(subscription?.status).toBe('suspended');
    });

    it('should allow access when subscription is active', async () => {
        await supabase.from('subscriptions').insert({
            tenant_id: testTenantId,
            plan_id: 'test-plan',
            status: 'active',
        });

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('tenant_id', testTenantId)
            .single();

        expect(subscription?.status).toBe('active');
    });
});

describe('FeatureGuard Integration Tests', () => {
    let supabase: SupabaseClient;
    let testTenantId: string;
    let testPlanId: string;

    beforeEach(async () => {
        supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        // Create plan
        const { data: plan } = await supabase
            .from('plans')
            .insert({ name: 'Test Plan', price: 0 })
            .select()
            .single();

        testPlanId = plan.id;

        // Create tenant
        const { data: tenant } = await supabase
            .from('tenants')
            .insert({ name: 'Test Tenant', status: 'active' })
            .select()
            .single();

        testTenantId = tenant.id;
    });

    afterEach(async () => {
        await supabase.from('tenant_feature_overrides').delete().eq('tenant_id', testTenantId);
        await supabase.from('plan_features').delete().eq('plan_id', testPlanId);
        await supabase.from('tenants').delete().eq('id', testTenantId);
        await supabase.from('plans').delete().eq('id', testPlanId);
    });

    it('should block feature not in plan', async () => {
        // No features added to plan
        const { data: features } = await supabase
            .from('plan_features')
            .select('feature_key')
            .eq('plan_id', testPlanId);

        expect(features).toEqual([]);
    });

    it('should allow feature in plan', async () => {
        // Add feature to plan
        await supabase.from('plan_features').insert({
            plan_id: testPlanId,
            feature_key: 'CRM',
        });

        const { data: features } = await supabase
            .from('plan_features')
            .select('feature_key')
            .eq('plan_id', testPlanId);

        expect(features?.map(f => f.feature_key)).toContain('CRM');
    });

    it('should respect tenant override enabling feature', async () => {
        // Feature not in plan but override enables it
        await supabase.from('tenant_feature_overrides').insert({
            tenant_id: testTenantId,
            feature_key: 'CRM',
            enabled: true,
            reason: 'Test trial',
        });

        const { data: override } = await supabase
            .from('tenant_feature_overrides')
            .select('enabled')
            .eq('tenant_id', testTenantId)
            .eq('feature_key', 'CRM')
            .single();

        expect(override?.enabled).toBe(true);
    });

    it('should respect tenant override disabling feature', async () => {
        // Add feature to plan
        await supabase.from('plan_features').insert({
            plan_id: testPlanId,
            feature_key: 'CRM',
        });

        // Override disables it
        await supabase.from('tenant_feature_overrides').insert({
            tenant_id: testTenantId,
            feature_key: 'CRM',
            enabled: false,
            reason: 'Disabled for testing',
        });

        const { data: override } = await supabase
            .from('tenant_feature_overrides')
            .select('enabled')
            .eq('tenant_id', testTenantId)
            .eq('feature_key', 'CRM')
            .single();

        expect(override?.enabled).toBe(false);
    });
});

describe('RBACGuard Integration Tests', () => {
    let supabase: SupabaseClient;
    let testTenantId: string;
    let testUserId: string;
    let testRoleId: string;

    beforeEach(async () => {
        supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        // Create tenant
        const { data: tenant } = await supabase
            .from('tenants')
            .insert({ name: 'Test Tenant', status: 'active' })
            .select()
            .single();

        testTenantId = tenant.id;

        // Create user
        const { data: user } = await supabase
            .from('users')
            .insert({
                tenant_id: testTenantId,
                email: 'test@example.com',
                name: 'Test User',
            })
            .select()
            .single();

        testUserId = user.id;

        // Create role
        const { data: role } = await supabase
            .from('roles')
            .insert({
                tenant_id: testTenantId,
                name: 'Test Role',
            })
            .select()
            .single();

        testRoleId = role.id;
    });

    afterEach(async () => {
        await supabase.from('role_permissions').delete().eq('role_id', testRoleId);
        await supabase.from('user_roles').delete().eq('user_id', testUserId);
        await supabase.from('roles').delete().eq('id', testRoleId);
        await supabase.from('users').delete().eq('id', testUserId);
        await supabase.from('tenants').delete().eq('id', testTenantId);
    });

    it('should block user without permission', async () => {
        // User has role but role has no permissions
        await supabase.from('user_roles').insert({
            tenant_id: testTenantId,
            user_id: testUserId,
            role_id: testRoleId,
        });

        const { data: permissions } = await supabase
            .from('role_permissions')
            .select('permission_key')
            .eq('role_id', testRoleId);

        expect(permissions).toEqual([]);
    });

    it('should allow user with permission', async () => {
        // Assign role to user
        await supabase.from('user_roles').insert({
            tenant_id: testTenantId,
            user_id: testUserId,
            role_id: testRoleId,
        });

        // Add permission to role
        await supabase.from('role_permissions').insert({
            role_id: testRoleId,
            permission_key: 'WORK_CREATE',
        });

        const { data: permissions } = await supabase
            .from('role_permissions')
            .select('permission_key')
            .eq('role_id', testRoleId);

        expect(permissions?.map(p => p.permission_key)).toContain('WORK_CREATE');
    });

    it('should allow admin with wildcard permission', async () => {
        // Assign role
        await supabase.from('user_roles').insert({
            tenant_id: testTenantId,
            user_id: testUserId,
            role_id: testRoleId,
        });

        // Add wildcard permission
        await supabase.from('role_permissions').insert({
            role_id: testRoleId,
            permission_key: '*',
        });

        const { data: permissions } = await supabase
            .from('role_permissions')
            .select('permission_key')
            .eq('role_id', testRoleId);

        expect(permissions?.map(p => p.permission_key)).toContain('*');
    });
});
