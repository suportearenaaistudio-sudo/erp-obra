import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { FeatureKeys } from '../lib/constants/features';

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
    featuresLoading: boolean;
    lastFeaturesUpdate: Date | null;

    // Actions
    refetchFeatures: () => Promise<void>;

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

    const [featuresLoading, setFeaturesLoading] = useState(false);
    const [lastFeaturesUpdate, setLastFeaturesUpdate] = useState<Date | null>(null);

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

            if (profileError) {
                console.error('❌ Profile error:', profileError);
                throw profileError;
            }

            if (!profileData) {
                console.error('❌ No profile data returned!');
                throw new Error('Profile not found');
            }

            setProfile(profileData as any);

            // 2. Load tenant
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', profileData.tenant_id)
                .single();

            setTenant(tenantData);

            // 3. Load subscription with plan
            const { data: subData } = await supabase
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
                .maybeSingle();

            setSubscription(subData as any);

            // 4. Initial Feature Load (Local fallback first for speed)
            const initialFeatures = new Set<string>(subData?.plan?.included_features || []);
            setFeatures(Array.from(initialFeatures)); // Show something immediately

            // 5. Load permissions
            if (profileData.role_id) {
                await loadPermissions(profileData.tenant_id, profileData.role_id);
            }

            // 6. Fetch authoritative features from backend
            // Note: We need to use fetchFeaturesFromBackend but it depends on user state which might not be fully set in this closure if we use useCallback deps.
            // But since we are inside loadUserData which is called when session exists, we can call it.
            // However, fetchFeaturesFromBackend depends on 'user' state which might be stale here if we just set it?
            // Actually 'loadUserData' is called after 'setUser'.
            // But 'fetchFeaturesFromBackend' uses 'user' from state.
            // Let's passed userId directly or ensure state is consistent.
            // Better: just implement the fetch logic here or make a standalone function.
            // Re-using the function is better.

        } catch (error) {
            console.error('❌ Error loading user data:', error);
        } finally {
            setLoading(false);
        }
    };

    // We need to trigger fetch features after profile is loaded.
    // Let's add an effect for that or call it in loadUserData
    useEffect(() => {
        if (profile?.tenant_id) {
            fetchFeaturesFromBackend();
        }
    }, [profile?.tenant_id]);

    const fetchFeaturesFromBackend = useCallback(async () => {
        try {
            setFeaturesLoading(true);
            // We use the root /me endpoint which returns features
            const { data, error } = await supabase.functions.invoke('me', {
                method: 'GET',
            });

            if (error) throw error;

            if (data && data.features) {
                setFeatures(data.features);
                setLastFeaturesUpdate(new Date());
            }
        } catch (err) {
            console.error('Error fetching features:', err);
        } finally {
            setFeaturesLoading(false);
        }
    }, []);

    // Expose refetch method
    const refetchFeatures = async () => {
        await fetchFeaturesFromBackend();
    };

    // Poll features every 30s
    useEffect(() => {
        if (!user || !tenant) return;
        const interval = setInterval(fetchFeaturesFromBackend, 30000);
        return () => clearInterval(interval);
    }, [user, tenant, fetchFeaturesFromBackend]);

    // Refetch on window focus
    useEffect(() => {
        const handleFocus = () => {
            if (user && document.visibilityState === 'visible') {
                const now = new Date();
                if (!lastFeaturesUpdate || (now.getTime() - lastFeaturesUpdate.getTime() > 5000)) {
                    fetchFeaturesFromBackend();
                }
            }
        };

        window.addEventListener('visibilitychange', handleFocus);
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('visibilitychange', handleFocus);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, fetchFeaturesFromBackend, lastFeaturesUpdate]);

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
        setLastFeaturesUpdate(null);
    };

    // Helper methods
    const hasFeature = useCallback((featureKey: string) => {
        return features.includes(featureKey);
    }, [features]);

    const hasPermission = useCallback((permission: string) => {
        if (profile?.role?.is_tenant_admin) return true;
        return permissions.includes(permission);
    }, [profile, permissions]);

    const isTenantAdmin = () => profile?.role?.is_tenant_admin || false;

    const isDevAdmin = () => {
        const devAdminEmails = [
            'admin@obra360.com',
            'suporte@obra360.com',
            'vitorpradotamos@gmail.com',
            'marcospaulotrindade3@gmail.com',
        ];
        return devAdminEmails.includes(user?.email || '');
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
        featuresLoading,
        lastFeaturesUpdate,
        refetchFeatures,
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
