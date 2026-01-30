import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DevAdminSupport } from './DevAdmin/DevAdminSupport';
import { DevAdminStats } from './DevAdmin/DevAdminStats';
import { TenantDetailsModal } from './DevAdmin/TenantDetailsModal';
import {
    Building2,
    Users,
    CreditCard,
    ToggleLeft,
    ToggleRight,
    Search,
    Plus,
    Edit,
    Ban,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    MessageCircle,
    BarChart3,
    Eye,
} from 'lucide-react';

interface TenantWithSubscription {
    id: string;
    name: string;
    slug: string;
    email: string;
    status: string;
    created_at: string;
    subscription: {
        status: string;
        trial_end: string | null;
        plan: {
            display_name: string;
        };
    } | null;
    _count_users: number;
    _count_projects: number;
}

export const DevAdmin = () => {
    const { isDevAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<'stats' | 'tenants' | 'plans' | 'features' | 'support'>('stats');
    const [tenants, setTenants] = useState<TenantWithSubscription[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [features, setFeatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'tenants') {
                await loadTenants();
            } else if (activeTab === 'plans') {
                await loadPlans();
            } else if (activeTab === 'features') {
                await loadFeatures();
            }
        } finally {
            setLoading(false);
        }
    };

    const loadTenants = async () => {


        const { data: tenantsData, error } = await supabase
            .from('tenants')
            .select(`
        *,
        subscription:subscriptions(
          status,
          trial_end,
          plan:plans(display_name)
        )
      `)
            .order('created_at', { ascending: false });



        if (error) {
            console.error('❌ Erro ao carregar tenants:', error);
            alert('Erro ao carregar tenants: ' + error.message);
            return;
        }

        if (!tenantsData || tenantsData.length === 0) {
            console.warn('⚠️ Nenhum tenant encontrado!');
            setTenants([]);
            return;
        }



        // Load counts separately
        const tenantsWithCounts = await Promise.all(
            (tenantsData || []).map(async (tenant) => {
                const { count: usersCount } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenant.id);

                const { count: projectsCount } = await supabase
                    .from('projects')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenant.id);

                return {
                    ...tenant,
                    subscription: Array.isArray(tenant.subscription) ? tenant.subscription[0] : tenant.subscription,
                    _count_users: usersCount || 0,
                    _count_projects: projectsCount || 0,
                };
            })
        );


        setTenants(tenantsWithCounts);
    };

    const loadPlans = async () => {
        const { data } = await supabase
            .from('plans')
            .select('*')
            .order('price_monthly', { ascending: true });
        setPlans(data || []);
    };

    const loadFeatures = async () => {
        const { data } = await supabase
            .from('features')
            .select('*')
            .order('category', { ascending: true });
        setFeatures(data || []);
    };

    const getStatusBadge = (status: string) => {
        const styles: any = {
            active: { bg: '#d1fae5', color: '#065f46', icon: CheckCircle },
            trial: { bg: '#dbeafe', color: '#1e40af', icon: Clock },
            suspended: { bg: '#fee2e2', color: '#991b1b', icon: Ban },
            canceled: { bg: '#f3f4f6', color: '#4b5563', icon: XCircle },
            past_due: { bg: '#fef3c7', color: '#92400e', icon: AlertTriangle },
        };

        const config = styles[status] || styles.active;
        const Icon = config.icon;

        return (
            <span style={{
                padding: '4px 12px',
                background: config.bg,
                color: config.color,
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
            }}>
                <Icon size={14} />
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </span>
        );
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Access control
    if (!isDevAdmin()) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <Ban size={48} style={{ color: '#dc2626', marginBottom: '16px' }} />
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                    Acesso Negado
                </h2>
                <p style={{ color: '#6b7280' }}>
                    Apenas Dev Admins podem acessar esta página
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
                    🔧 Dev Admin
                </h1>
                <p style={{ color: '#6b7280' }}>
                    Painel de controle global - Gerenciar tenants, planos e features
                </p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                borderBottom: '2px solid #e5e7eb',
            }}>
                {[
                    { key: 'stats', label: 'Estatísticas', icon: BarChart3 },
                    { key: 'tenants', label: 'Tenants', icon: Building2 },
                    { key: 'plans', label: 'Planos', icon: CreditCard },
                    { key: 'features', label: 'Features', icon: ToggleLeft },
                    { key: 'support', label: 'Suporte', icon: MessageCircle },
                ].map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            style={{
                                padding: '12px 24px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab.key ? '3px solid #667eea' : '3px solid transparent',
                                color: activeTab === tab.key ? '#667eea' : '#6b7280',
                                fontWeight: activeTab === tab.key ? '600' : '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {activeTab === 'stats' && (
                <DevAdminStats />
            )}

            {activeTab === 'tenants' && (
                <div>
                    {/* Search */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ position: 'relative', maxWidth: '400px' }}>
                            <Search size={20} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9ca3af',
                            }} />
                            <input
                                type="text"
                                placeholder="Buscar tenant..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 44px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                }}
                            />
                        </div>
                    </div>

                    {/* Tenants List */}
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden',
                    }}>
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                Carregando...
                            </div>
                        ) : filteredTenants.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                Nenhum tenant encontrado
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: '#f9fafb' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            EMPRESA
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            PLANO
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            STATUS
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            USUÁRIOS
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            PROJETOS
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            CRIADO EM
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            AÇÕES
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTenants.map((tenant, index) => (
                                        <tr
                                            key={tenant.id}
                                            style={{
                                                borderTop: index > 0 ? '1px solid #e5e7eb' : 'none',
                                                transition: 'background 0.2s',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '16px' }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                        {tenant.name}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                        {tenant.email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    background: '#f3f4f6',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                }}>
                                                    {tenant.subscription?.plan?.display_name || 'Sem plano'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                {tenant.subscription ? (
                                                    getStatusBadge(tenant.subscription.status)
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>-</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Users size={16} style={{ color: '#9ca3af' }} />
                                                    <span style={{ fontWeight: '500' }}>{tenant._count_users}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Building2 size={16} style={{ color: '#9ca3af' }} />
                                                    <span style={{ fontWeight: '500' }}>{tenant._count_projects}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                                    {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => setSelectedTenantId(tenant.id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#667eea',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                    }}
                                                >
                                                    <Eye size={16} />
                                                    Ver Detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'plans' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                        {plans.map(plan => (
                            <div
                                key={plan.id}
                                style={{
                                    background: 'white',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '12px',
                                    padding: '24px',
                                }}
                            >
                                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                                    {plan.display_name}
                                </h3>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea', marginBottom: '16px' }}>
                                    R$ {plan.price_monthly.toFixed(2)}
                                    <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'normal' }}>/mês</span>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Limites:</div>
                                    <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                                        👥 {plan.max_users} usuários
                                    </div>
                                    <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                                        🏗️ {plan.max_projects} projetos
                                    </div>
                                    <div style={{ fontSize: '13px' }}>
                                        💾 {plan.max_storage_gb} GB storage
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                                        Features ({plan.included_features.length}):
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {plan.included_features.slice(0, 4).map((feature: string) => (
                                            <span
                                                key={feature}
                                                style={{
                                                    padding: '2px 8px',
                                                    background: '#f3f4f6',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                }}
                                            >
                                                {feature}
                                            </span>
                                        ))}
                                        {plan.included_features.length > 4 && (
                                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                +{plan.included_features.length - 4}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'features' && (
                <div>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden',
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f9fafb' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                        FEATURE KEY
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                        NOME
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                        CATEGORIA
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                        STATUS
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {features.map((feature, index) => (
                                    <tr
                                        key={feature.id}
                                        style={{ borderTop: index > 0 ? '1px solid #e5e7eb' : 'none' }}
                                    >
                                        <td style={{ padding: '16px' }}>
                                            <code style={{
                                                padding: '4px 8px',
                                                background: '#f3f4f6',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                fontFamily: 'monospace',
                                            }}>
                                                {feature.feature_key}
                                            </code>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: '500' }}>{feature.display_name}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                {feature.description}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                background: feature.category === 'MODULE' ? '#dbeafe' :
                                                    feature.category === 'ADD_ON' ? '#fef3c7' : '#f3e8ff',
                                                color: feature.category === 'MODULE' ? '#1e40af' :
                                                    feature.category === 'ADD_ON' ? '#92400e' : '#6b21a8',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                            }}>
                                                {feature.category}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            {feature.active ? (
                                                <CheckCircle size={20} style={{ color: '#10b981' }} />
                                            ) : (
                                                <XCircle size={20} style={{ color: '#ef4444' }} />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'support' && (
                <DevAdminSupport />
            )}

            {/* Modal de Detalhes do Tenant */}
            {selectedTenantId && (
                <TenantDetailsModal
                    tenantId={selectedTenantId}
                    onClose={() => setSelectedTenantId(null)}
                    onUpdate={() => loadData()}
                />
            )}
        </div>
    );
};
