import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Types
interface Tenant {
    id: string;
    name: string;
    slug: string;
    status: 'active' | 'suspended' | 'canceled';
}

interface Subscription {
    id: string;
    tenant_id: string;
    plan_id: string;
    status: 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';
    trial_end: string | null;
    current_period_end: string;
    plan: {
        name: string;
        display_name: string;
        included_features: string[];
    };
}

interface UserProfile {
    id: string;
    tenant_id: string;
    email: string;
    name: string;
    role_id: string | null;
    role: {
        name: string;
        is_tenant_admin: boolean;
    } | null;
}

interface AuthContextType {
    // Auth state
    user: User | null;
    session: Session | null;
    loading: boolean;

    // Multi-tenant data
    profile: UserProfile | null;
    tenant: Tenant | null;
    subscription: Subscription | null;

    // Permissions & Features
    features: string[];
    permissions: string[];

    // Helper methods
    hasFeature: (featureKey: string) => boolean;
    hasPermission: (permission: string) => boolean;
    isTenantAdmin: () => boolean;
    isDevAdmin: () => boolean;

    // Auth methods
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, name: string, companyName: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);

    const [features, setFeatures] = useState<string[]>([]);
    const [permissions, setPermissions] = useState<string[]>([]);

    // Load user data on mount and auth changes
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadUserData(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadUserData(session.user.id);
            } else {
                clearUserData();
                setLoading(false);
            }
        });

        return () => authSubscription.unsubscribe();
    }, []);

    const loadUserData = async (userId: string) => {
        try {
            // 1. Load profile
            const { data: profileData, error: profileError } = await supabase
                .from('users')
                .select(`
          id,
          tenant_id,
          email,
          name,
          role_id,
          role:roles (
            name,
            is_tenant_admin
          )
        `)
                .eq('auth_user_id', userId)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData as any);

            // 2. Load tenant
            const { data: tenantData, error: tenantError } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', profileData.tenant_id)
                .single();

            if (tenantError) throw tenantError;
            setTenant(tenantData);

            // 3. Load subscription with plan
            const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select(`
          *,
          plan:plans (
            name,
            display_name,
            included_features
          )
        `)
                .eq('tenant_id', profileData.tenant_id)
                .single();

            if (subError) throw subError;
            setSubscription(subData as any);

            // 4. Resolve features (plan + overrides)
            await loadFeatures(profileData.tenant_id, subData);

            // 5. Load permissions
            if (profileData.role_id) {
                await loadPermissions(profileData.tenant_id, profileData.role_id);
            }

        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadFeatures = async (tenantId: string, subscription: any) => {
        try {
            // Start with plan features
            let resolvedFeatures = [...(subscription.plan?.included_features || [])];

            // Get overrides
            const { data: overrides } = await supabase
                .from('tenant_feature_overrides')
                .select('*')
                .eq('tenant_id', tenantId)
                .or('expires_at.is.null,expires_at.gt.now()');

            // Apply overrides
            if (overrides) {
                for (const override of overrides) {
                    if (override.enabled) {
                        resolvedFeatures.push(override.feature_key);
                    } else {
                        resolvedFeatures = resolvedFeatures.filter(f => f !== override.feature_key);
                    }
                }
            }

            setFeatures([...new Set(resolvedFeatures)]);
        } catch (error) {
            console.error('Error loading features:', error);
        }
    };

    const loadPermissions = async (tenantId: string, roleId: string) => {
        try {
            const { data } = await supabase
                .from('role_permissions')
                .select('permission_key')
                .eq('tenant_id', tenantId)
                .eq('role_id', roleId);

            setPermissions(data?.map(p => p.permission_key) || []);
        } catch (error) {
            console.error('Error loading permissions:', error);
        }
    };

    const clearUserData = () => {
        setProfile(null);
        setTenant(null);
        setSubscription(null);
        setFeatures([]);
        setPermissions([]);
    };

    // Helper methods
    const hasFeature = (featureKey: string) => features.includes(featureKey);

    const hasPermission = (permission: string) => {
        // Tenant admins have all permissions
        if (profile?.role?.is_tenant_admin) return true;
        return permissions.includes(permission);
    };

    const isTenantAdmin = () => profile?.role?.is_tenant_admin || false;

    const isDevAdmin = () => {
        // Check if user has saas_users entry
        // This would need to be checked separately or via metadata
        return user?.email === 'admin@obra360.com' || user?.email === 'suporte@obra360.com';
    };

    // Auth methods
    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signUp = async (email: string, password: string, name: string, companyName: string) => {
        try {
            // Database trigger will handle tenant creation automatically
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        company_name: companyName,
                    },
                },
            });

            if (signUpError) throw signUpError;

            return { error: null };
        } catch (error: any) {
            return { error };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        clearUserData();
    };

    const value = {
        user,
        session,
        loading,
        profile,
        tenant,
        subscription,
        features,
        permissions,
        hasFeature,
        hasPermission,
        isTenantAdmin,
        isDevAdmin,
        signIn,
        signUp,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
