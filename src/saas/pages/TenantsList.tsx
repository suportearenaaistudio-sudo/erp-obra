import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Users,
    Building2,
    CheckCircle,
    Clock,
    Ban,
    XCircle,
    AlertTriangle,
    Eye,
    Search
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

interface TenantsListProps {
    onSelectTenant: (id: string) => void;
}

export const TenantsList: React.FC<TenantsListProps> = ({ onSelectTenant }) => {
    const [tenants, setTenants] = useState<TenantWithSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadTenants();
    }, []);

    const loadTenants = async () => {
        setLoading(true);
        try {
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
                // In production use a toast notification
                return;
            }

            if (!tenantsData || tenantsData.length === 0) {
                setTenants([]);
                return;
            }

            // Load counts separately (or use RPC if optimized)
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
        } finally {
            setLoading(false);
        }
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

    return (
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
                                            onClick={() => onSelectTenant(tenant.id)}
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
    );
};
