import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    Users,
    Shield,
    UserPlus,
    Edit,
    Trash2,
    Plus,
    X,
    Mail,
    User,
    Ban,
    CheckCircle,
} from 'lucide-react';

interface UserData {
    id: string;
    name: string;
    email: string;
    active: boolean;
    role: {
        id: string;
        name: string;
        is_tenant_admin: boolean;
    } | null;
    created_at: string;
}

interface RoleData {
    id: string;
    name: string;
    description: string | null;
    is_tenant_admin: boolean;
    _count_users: number;
    _count_permissions: number;
}

export const TenantAdmin = () => {
    const { isTenantAdmin, profile, tenant } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
    const [users, setUsers] = useState<UserData[]>([]);
    const [roles, setRoles] = useState<RoleData[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showUserModal, setShowUserModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab, profile?.tenant_id]);

    const loadData = async () => {
        if (!profile?.tenant_id) return;

        setLoading(true);
        try {
            if (activeTab === 'users') {
                await loadUsers();
            } else {
                await loadRoles();
            }
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        if (!profile?.tenant_id) return;

        const { data } = await supabase
            .from('users')
            .select(`
        id,
        name,
        email,
        active,
        created_at,
        role:roles (
          id,
          name,
          is_tenant_admin
        )
      `)
            .eq('tenant_id', profile.tenant_id)
            .order('created_at', { ascending: false });

        setUsers((data as any) || []);
    };

    const loadRoles = async () => {
        if (!profile?.tenant_id) return;

        const { data: rolesData } = await supabase
            .from('roles')
            .select('*')
            .eq('tenant_id', profile.tenant_id)
            .order('is_tenant_admin', { ascending: false });

        // Load counts
        const rolesWithCounts = await Promise.all(
            (rolesData || []).map(async (role) => {
                const { count: usersCount } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('role_id', role.id);

                const { count: permsCount } = await supabase
                    .from('role_permissions')
                    .select('*', { count: 'exact', head: true })
                    .eq('role_id', role.id);

                return {
                    ...role,
                    _count_users: usersCount || 0,
                    _count_permissions: permsCount || 0,
                };
            })
        );

        setRoles(rolesWithCounts);
    };

    // Access control
    if (!isTenantAdmin()) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <Ban size={48} style={{ color: '#dc2626', marginBottom: '16px' }} />
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                    Acesso Negado
                </h2>
                <p style={{ color: '#6b7280' }}>
                    Apenas administradores podem acessar esta página
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px',
            }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
                        ⚙️ Administração
                    </h1>
                    <p style={{ color: '#6b7280' }}>
                        Gerenciar usuários e permissões de <strong>{tenant?.name}</strong>
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                borderBottom: '2px solid #e5e7eb',
            }}>
                {[
                    { key: 'users', label: 'Usuários', icon: Users },
                    { key: 'roles', label: 'Perfis e Permissões', icon: Shield },
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
                            }}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {activeTab === 'users' && (
                <div>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '24px',
                    }}>
                        <div style={{ fontSize: '18px', fontWeight: '600' }}>
                            {users.length} usuário{users.length !== 1 ? 's' : ''}
                        </div>
                        <button
                            onClick={() => setShowUserModal(true)}
                            style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <UserPlus size={18} />
                            Convidar Usuário
                        </button>
                    </div>

                    {/* Users List */}
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
                        ) : users.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                Nenhum usuário cadastrado
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: '#f9fafb' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            USUÁRIO
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            PERFIL
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            STATUS
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            MEMBRO DESDE
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                            AÇÕES
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user, index) => (
                                        <tr
                                            key={user.id}
                                            style={{ borderTop: index > 0 ? '1px solid #e5e7eb' : 'none' }}
                                        >
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontWeight: 'bold',
                                                        fontSize: '16px',
                                                    }}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                                                            {user.name}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    background: user.role?.is_tenant_admin ? '#fef3c7' : '#f3f4f6',
                                                    color: user.role?.is_tenant_admin ? '#92400e' : '#4b5563',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                }}>
                                                    {user.role?.is_tenant_admin && '⭐ '}
                                                    {user.role?.name || 'Sem perfil'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                {user.active ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        color: '#059669',
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                    }}>
                                                        <CheckCircle size={16} />
                                                        Ativo
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        color: '#dc2626',
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                    }}>
                                                        <Ban size={16} />
                                                        Inativo
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: '#f3f4f6',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            color: '#4b5563',
                                                        }}
                                                    >
                                                        <Edit size={14} />
                                                        Editar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'roles' && (
                <div>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '24px',
                    }}>
                        <div style={{ fontSize: '18px', fontWeight: '600' }}>
                            {roles.length} perfil{roles.length !== 1 ? 'is' : ''}
                        </div>
                        <button
                            onClick={() => setShowRoleModal(true)}
                            style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <Plus size={18} />
                            Novo Perfil
                        </button>
                    </div>

                    {/* Roles Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '20px',
                    }}>
                        {roles.map(role => (
                            <div
                                key={role.id}
                                style={{
                                    background: 'white',
                                    border: role.is_tenant_admin ? '2px solid #fbbf24' : '2px solid #e5e7eb',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    position: 'relative',
                                }}
                            >
                                {role.is_tenant_admin && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        fontSize: '20px',
                                    }}>
                                        ⭐
                                    </div>
                                )}

                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                                    {role.name}
                                </h3>

                                {role.description && (
                                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                                        {role.description}
                                    </p>
                                )}

                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '8px',
                                    }}>
                                        <Users size={16} style={{ color: '#9ca3af' }} />
                                        <span style={{ fontSize: '13px' }}>
                                            {role._count_users} usuário{role._count_users !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}>
                                        <Shield size={16} style={{ color: '#9ca3af' }} />
                                        <span style={{ fontSize: '13px' }}>
                                            {role._count_permissions} permiss{role._count_permissions !== 1 ? 'ões' : 'ão'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        background: '#f3f4f6',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        color: '#4b5563',
                                    }}
                                >
                                    Gerenciar Permissões
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Card */}
            <div style={{
                marginTop: '32px',
                padding: '20px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
            }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                    💡 Dica
                </h4>
                <p style={{ fontSize: '13px', color: '#1e3a8a', margin: 0 }}>
                    {activeTab === 'users' ? (
                        'Convide membros da sua equipe e atribua perfis específicos para controlar o acesso de cada um.'
                    ) : (
                        'Crie perfis personalizados com permissões granulares para diferentes departamentos da sua empresa.'
                    )}
                </p>
            </div>
        </div>
    );
};
