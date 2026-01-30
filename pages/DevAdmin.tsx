import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DevAdminSupport } from '../src/saas/components/DevAdminSupport';
import { TenantsList } from '../src/saas/pages/TenantsList';
import { Dashboard } from '../src/saas/pages/Dashboard';
import { PlansList } from '../src/saas/pages/PlansList';
import { FeaturesList } from '../src/saas/pages/FeaturesList';
import { TenantDetailsModal } from '../src/saas/components/TenantDetailsModal';
import {
    Building2,
    CreditCard,
    ToggleLeft,
    MessageCircle,
    BarChart3,
    Ban,
    ShieldAlert,
} from 'lucide-react';
import { LogSafeDashboard } from '../src/saas/pages/LogSafeDashboard';
import { LogSafePolicies } from '../src/saas/pages/LogSafePolicies';
import { LogSafeEvents } from '../src/saas/pages/LogSafeEvents';

export const DevAdmin = () => {
    const { isDevAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<'stats' | 'tenants' | 'plans' | 'features' | 'support' | 'logsafe'>('stats');
    const [logsafeTab, setLogSafeTab] = useState<'dashboard' | 'policies' | 'events'>('dashboard');
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

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
                    { key: 'logsafe', label: 'Security', icon: ShieldAlert },
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
            {activeTab === 'stats' && <Dashboard />}

            {activeTab === 'tenants' && (
                <TenantsList onSelectTenant={setSelectedTenantId} />
            )}

            {activeTab === 'plans' && (
                <PlansList />
            )}

            {activeTab === 'features' && (
                <FeaturesList />
            )}

            {activeTab === 'logsafe' && (
                <div className="space-y-6">
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                        {[
                            { key: 'dashboard', label: 'Dashboard' },
                            { key: 'policies', label: 'Políticas' },
                            { key: 'events', label: 'Eventos' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setLogSafeTab(tab.key as any)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${logsafeTab === tab.key
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {logsafeTab === 'dashboard' && <LogSafeDashboard />}
                    {logsafeTab === 'policies' && <LogSafePolicies />}
                    {logsafeTab === 'events' && <LogSafeEvents />}
                </div>
            )}

            {activeTab === 'support' && <DevAdminSupport />}

            {selectedTenantId && (
                <TenantDetailsModal
                    tenantId={selectedTenantId}
                    onClose={() => setSelectedTenantId(null)}
                    onUpdate={() => {
                        // Reload stats or details if needed
                    }}
                />
            )}
        </div>
    );
};
