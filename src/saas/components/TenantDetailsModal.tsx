import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { FeatureResolverService } from '../../../lib/feature-resolver';
import {
    X,
    Building2,
    Users,
    CreditCard,
    ToggleLeft,
    ToggleRight,
    Ban,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
} from 'lucide-react';

interface TenantDetailsModalProps {
    tenantId: string;
    onClose: () => void;
    onUpdate: () => void;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({ tenantId, onClose, onUpdate }) => {
    const [tenant, setTenant] = useState<any>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [features, setFeatures] = useState<any[]>([]);
    const [overrides, setOverrides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadTenantDetails();
    }, [tenantId]);

    const loadTenantDetails = async () => {
        setLoading(true);
        try {
            // Load tenant
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', tenantId)
                .single();
            setTenant(tenantData);

            // Load subscription with plan
            const { data: subData } = await supabase
                .from('subscriptions')
                .select(`
          *,
          plan:plans(*)
        `)
                .eq('tenant_id', tenantId)
                .single();
            setSubscription(subData);

            // Load users
            const { data: usersData } = await supabase
                .from('users')
                .select(`
          *,
          role:roles(name, is_tenant_admin)
        `)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });
            setUsers(usersData || []);

            // Load all features
            const { data: featuresData } = await supabase
                .from('features')
                .select('*')
                .eq('active', true)
                .order('category', { ascending: true });
            setFeatures(featuresData || []);

            // Load feature overrides
            const { data: overridesData } = await supabase
                .from('tenant_feature_overrides')
                .select('*')
                .eq('tenant_id', tenantId);
            setOverrides(overridesData || []);

        } catch (error) {
            console.error('Error loading tenant details:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFeature = async (featureKey: string, currentlyEnabled: boolean) => {
        setSaving(true);
        try {
            const existing = overrides.find(o => o.feature_key === featureKey);

            if (existing && currentlyEnabled) {
                // DELETE override to disable (if disabling means removing override, OR if we strictly follow enable/disable logic)
                // The edge function DELETE removes the override.
                // The edge function POST creates/updates.
                // Logic:
                // If we want to disable a feature that is in plan, we need an override enabled=false.
                // If we want to enable a feature NOT in plan, we need override enabled=true.
                // If we want to reset to plan default, we delete the override.
                // The UI button says "Disable/Enable".
                // Let's assume explicit override for now?
                // Actually the edge function DELETE /:id removes it.
                // If I click "Disable" on an enabled feature...
                // Only if it's an override do we DELETE?
                // Let's use the POST endpoint for explicit boolean setting, as that handles update/insert.
                // The user logic might be: "I want this feature OFF".

                // Calling Edge Function: saas-feature-overrides
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('No session');

                if (existing && !currentlyEnabled) {
                    // Re-enabling an existing override? Or removing it?
                    // For simplicity, let's just toggle the boolean via POST.
                }

                const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'}/functions/v1/saas-feature-overrides`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tenant_id: tenantId,
                        feature_key: featureKey,
                        enabled: !currentlyEnabled,
                        reason: 'Toggled via Dev Admin',
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || 'Failed to toggle feature');
                }
            } else {
                // Same logical path for create
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('No session');

                const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'}/functions/v1/saas-feature-overrides`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tenant_id: tenantId,
                        feature_key: featureKey,
                        enabled: !currentlyEnabled,
                        reason: 'Toggled via Dev Admin',
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || 'Failed to toggle feature');
                }
            }

            // Invalidate cache
            FeatureResolverService.invalidate(tenantId);

            // Reload data
            await loadTenantDetails();
            onUpdate();
        } catch (error: any) {
            console.error('Error toggling feature:', error);
            alert('Erro ao alterar feature: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const changeSubscriptionStatus = async (newStatus: string) => {
        if (!confirm(`Tem certeza que deseja alterar o status para "${newStatus}"?`)) {
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            // Calling Edge Function: saas-subscriptions/:id/status
            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'}/functions/v1/saas-subscriptions/${subscription.id}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                    reason: 'Changed via Dev Admin UI'
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to update subscription status');
            }

            // Invalidate cache
            FeatureResolverService.invalidate(tenantId);

            // Reload data
            await loadTenantDetails();
            onUpdate();
            alert('Status alterado com sucesso!');
        } catch (error: any) {
            console.error('Error changing status:', error);
            alert('Erro ao alterar status: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const isFeatureEnabled = (featureKey: string) => {
        // Check if in plan
        const inPlan = subscription?.plan?.included_features?.includes(featureKey) || false;

        // Check override
        const override = overrides.find(o => o.feature_key === featureKey);
        if (override) {
            return override.enabled;
        }

        return inPlan;
    };

    if (loading) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
            }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '12px',
                }}>
                    Carregando...
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
            overflow: 'auto',
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                maxWidth: '1000px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    background: 'white',
                    zIndex: 10,
                }}>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                            {tenant?.name}
                        </h2>
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>
                            {tenant?.email} • {tenant?.slug}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {/* Subscription Info */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CreditCard size={20} />
                            Assinatura
                        </h3>
                        <div style={{
                            background: '#f9fafb',
                            padding: '16px',
                            borderRadius: '8px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '16px',
                        }}>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Plano</div>
                                <div style={{ fontWeight: '600' }}>{subscription?.plan?.display_name}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Status</div>
                                <div style={{ fontWeight: '600' }}>{subscription?.status}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Trial até</div>
                                <div style={{ fontWeight: '600' }}>
                                    {subscription?.trial_end ? new Date(subscription.trial_end).toLocaleDateString('pt-BR') : '-'}
                                </div>
                            </div>
                        </div>

                        {/* Status Actions */}
                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => changeSubscriptionStatus('active')}
                                disabled={saving || subscription?.status === 'active'}
                                style={{
                                    padding: '8px 16px',
                                    background: subscription?.status === 'active' ? '#d1fae5' : '#10b981',
                                    color: subscription?.status === 'active' ? '#065f46' : 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: subscription?.status === 'active' ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <CheckCircle size={16} />
                                Ativar
                            </button>
                            <button
                                onClick={() => changeSubscriptionStatus('suspended')}
                                disabled={saving || subscription?.status === 'suspended'}
                                style={{
                                    padding: '8px 16px',
                                    background: subscription?.status === 'suspended' ? '#fee2e2' : '#ef4444',
                                    color: subscription?.status === 'suspended' ? '#991b1b' : 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: subscription?.status === 'suspended' ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <Ban size={16} />
                                Suspender
                            </button>
                            <button
                                onClick={() => changeSubscriptionStatus('canceled')}
                                disabled={saving || subscription?.status === 'canceled'}
                                style={{
                                    padding: '8px 16px',
                                    background: subscription?.status === 'canceled' ? '#f3f4f6' : '#6b7280',
                                    color: subscription?.status === 'canceled' ? '#4b5563' : 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: subscription?.status === 'canceled' ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <XCircle size={16} />
                                Cancelar
                            </button>
                        </div>
                    </div>

                    {/* Users */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={20} />
                            Usuários ({users.length})
                        </h3>
                        <div style={{
                            background: '#f9fafb',
                            borderRadius: '8px',
                            overflow: 'hidden',
                        }}>
                            {users.map((user, index) => (
                                <div
                                    key={user.id}
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: index < users.length - 1 ? '1px solid #e5e7eb' : 'none',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{user.name}</div>
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{user.email}</div>
                                    </div>
                                    <div style={{
                                        padding: '4px 12px',
                                        background: user.role?.is_tenant_admin ? '#dbeafe' : '#f3f4f6',
                                        color: user.role?.is_tenant_admin ? '#1e40af' : '#4b5563',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                    }}>
                                        {user.role?.name || 'Sem role'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Features */}
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ToggleLeft size={20} />
                            Features
                        </h3>
                        <div style={{
                            background: '#f9fafb',
                            borderRadius: '8px',
                            padding: '16px',
                        }}>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {features.map((feature) => {
                                    const enabled = isFeatureEnabled(feature.feature_key);
                                    const inPlan = subscription?.plan?.included_features?.includes(feature.feature_key);
                                    const hasOverride = overrides.some(o => o.feature_key === feature.feature_key);

                                    return (
                                        <div
                                            key={feature.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '12px',
                                                background: 'white',
                                                borderRadius: '6px',
                                                border: '1px solid #e5e7eb',
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                                                    {feature.display_name}
                                                    {hasOverride && (
                                                        <span style={{
                                                            marginLeft: '8px',
                                                            padding: '2px 6px',
                                                            background: '#fef3c7',
                                                            color: '#92400e',
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            fontWeight: '600',
                                                        }}>
                                                            OVERRIDE
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                    {feature.feature_key}
                                                    {inPlan && (
                                                        <span style={{ marginLeft: '8px', color: '#10b981' }}>• No plano</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleFeature(feature.feature_key, enabled)}
                                                disabled={saving}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: enabled ? '#10b981' : '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                }}
                                            >
                                                {enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                {enabled ? 'Desabilitar' : 'Habilitar'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
