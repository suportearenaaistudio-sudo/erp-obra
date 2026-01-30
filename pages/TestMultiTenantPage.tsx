import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FeatureGate, IfFeature } from '../components/FeatureGate';
import { PermissionGate, IfPermission } from '../components/PermissionGate';
import { SubscriptionBanner, WriteGuard } from '../components/SubscriptionGuards';
import { useFeatureGuard } from '../hooks/useFeatureGuard';
import { usePermissionGuard } from '../hooks/usePermissionGuard';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';

export default function TestMultiTenantPage() {
    const {
        user,
        profile,
        tenant,
        subscription,
        features,
        permissions,
        isTenantAdmin,
        isDevAdmin
    } = useAuth();

    const { isEnabled: hasCRM } = useFeatureGuard('CRM');
    const { isEnabled: hasProcurement } = useFeatureGuard('PROCUREMENT');
    const { isAllowed: canWriteClients } = usePermissionGuard('CLIENTS:WRITE');
    const { canWrite, planName, status } = useSubscriptionGuard();

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Banner de Assinatura */}
            <SubscriptionBanner />

            <h1 className="text-3xl font-bold mb-8">🧪 Teste Multi-Tenant</h1>

            {/* Informações do Usuário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Card: Usuário */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">👤 Usuário</h2>
                    <div className="space-y-2 text-sm">
                        <p><strong>Email:</strong> {user?.email}</p>
                        <p><strong>Nome:</strong> {profile?.name}</p>
                        <p><strong>Role:</strong> {profile?.role?.name}</p>
                        <p><strong>Tenant Admin:</strong> {isTenantAdmin() ? '✅ Sim' : '❌ Não'}</p>
                        <p><strong>Dev Admin:</strong> {isDevAdmin() ? '✅ Sim' : '❌ Não'}</p>
                    </div>
                </div>

                {/* Card: Tenant */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">🏢 Empresa</h2>
                    <div className="space-y-2 text-sm">
                        <p><strong>Nome:</strong> {tenant?.name}</p>
                        <p><strong>Slug:</strong> {tenant?.slug}</p>
                        <p><strong>Status:</strong> {tenant?.status}</p>
                    </div>
                </div>

                {/* Card: Assinatura */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">💳 Assinatura</h2>
                    <div className="space-y-2 text-sm">
                        <p><strong>Plano:</strong> {planName}</p>
                        <p><strong>Status:</strong> {status}</p>
                        <p><strong>Pode Escrever:</strong> {canWrite ? '✅ Sim' : '❌ Não'}</p>
                        {subscription?.trial_end && (
                            <p><strong>Trial até:</strong> {new Date(subscription.trial_end).toLocaleDateString()}</p>
                        )}
                    </div>
                </div>

                {/* Card: Features */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">🎯 Features Ativas</h2>
                    <div className="space-y-1 text-sm">
                        {features.length > 0 ? (
                            features.map(f => (
                                <p key={f} className="text-green-600">✅ {f}</p>
                            ))
                        ) : (
                            <p className="text-gray-400">Nenhuma feature ativa</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Permissões */}
            <div className="bg-white p-6 rounded-lg shadow mb-8">
                <h2 className="text-xl font-semibold mb-4">🔐 Permissões</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {permissions.length > 0 ? (
                        permissions.map(p => (
                            <p key={p} className="text-green-600">✅ {p}</p>
                        ))
                    ) : (
                        <p className="text-gray-400 col-span-4">Nenhuma permissão</p>
                    )}
                </div>
            </div>

            {/* Testes de Feature Gate */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">🧪 Testes de Feature Gate</h2>

                {/* Teste 1: CRM */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Teste 1: Feature "CRM"</h3>
                    <FeatureGate feature="CRM">
                        <div className="bg-green-100 p-4 rounded border-2 border-green-500">
                            ✅ Você tem acesso ao CRM!
                        </div>
                    </FeatureGate>
                </div>

                {/* Teste 2: PROCUREMENT */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Teste 2: Feature "PROCUREMENT"</h3>
                    <FeatureGate feature="PROCUREMENT">
                        <div className="bg-green-100 p-4 rounded border-2 border-green-500">
                            ✅ Você tem acesso a Compras!
                        </div>
                    </FeatureGate>
                </div>

                {/* Teste 3: AI_CHAT (Enterprise only) */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Teste 3: Feature "AI_CHAT" (Enterprise)</h3>
                    <FeatureGate feature="AI_CHAT">
                        <div className="bg-green-100 p-4 rounded border-2 border-green-500">
                            ✅ Você tem acesso ao Assistente IA!
                        </div>
                    </FeatureGate>
                </div>
            </div>

            {/* Testes de Permission Gate */}
            <div className="space-y-6 mt-8">
                <h2 className="text-2xl font-bold">🔐 Testes de Permission Gate</h2>

                {/* Teste 4: CLIENTS:WRITE */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Teste 4: Permissão "CLIENTS:WRITE"</h3>
                    <PermissionGate permission="CLIENTS:WRITE">
                        <div className="bg-green-100 p-4 rounded border-2 border-green-500">
                            ✅ Você pode criar/editar clientes!
                        </div>
                    </PermissionGate>
                </div>

                {/* Teste 5: FINANCE:APPROVE */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Teste 5: Permissão "FINANCE:APPROVE"</h3>
                    <PermissionGate permission="FINANCE:APPROVE">
                        <div className="bg-green-100 p-4 rounded border-2 border-green-500">
                            ✅ Você pode aprovar lançamentos financeiros!
                        </div>
                    </PermissionGate>
                </div>
            </div>

            {/* Teste de Write Guard */}
            <div className="space-y-6 mt-8">
                <h2 className="text-2xl font-bold">✍️ Teste de Write Guard</h2>

                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Teste 6: Formulário com WriteGuard</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Este formulário fica bloqueado se a assinatura estiver suspensa/cancelada
                    </p>
                    <WriteGuard>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome do Projeto</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded"
                                    placeholder="Digite o nome..."
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Salvar Projeto
                            </button>
                        </form>
                    </WriteGuard>
                </div>
            </div>

            {/* Teste de Botões Condicionais */}
            <div className="space-y-6 mt-8">
                <h2 className="text-2xl font-bold">🎛️ Testes de UI Condicional</h2>

                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Teste 7: Botões Condicionais</h3>
                    <div className="space-x-4">
                        {/* Botão só aparece se tiver feature CRM */}
                        <IfFeature feature="CRM">
                            <button className="px-4 py-2 bg-green-600 text-white rounded">
                                ✅ Botão CRM (só aparece se tiver feature)
                            </button>
                        </IfFeature>

                        {/* Botão só aparece se tiver permissão */}
                        <IfPermission permission="USERS:WRITE">
                            <button className="px-4 py-2 bg-blue-600 text-white rounded">
                                ✅ Criar Usuário (só aparece se tiver permissão)
                            </button>
                        </IfPermission>
                    </div>
                </div>
            </div>

            {/* Resumo */}
            <div className="bg-blue-50 p-6 rounded-lg mt-8 border-2 border-blue-300">
                <h2 className="text-xl font-semibold mb-4">📊 Resumo dos Testes</h2>
                <div className="space-y-2 text-sm">
                    <p>✅ <strong>CRM:</strong> {hasCRM ? 'Disponível' : 'Não disponível'}</p>
                    <p>✅ <strong>Compras:</strong> {hasProcurement ? 'Disponível' : 'Não disponível'}</p>
                    <p>✅ <strong>Criar Clientes:</strong> {canWriteClients ? 'Permitido' : 'Negado'}</p>
                    <p>✅ <strong>Escrever Dados:</strong> {canWrite ? 'Permitido' : 'Bloqueado'}</p>
                </div>
            </div>
        </div>
    );
}
