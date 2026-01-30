
import React, { useState, useEffect } from 'react';
import { LogSafePoliciesService, LogSafePolicy } from '../logsafe/logsafe.service';
import { Settings, Shield, Zap, ToggleLeft, ToggleRight, Edit2 } from 'lucide-react';

export const LogSafePolicies: React.FC = () => {
    const [policies, setPolicies] = useState<LogSafePolicy[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPolicies();
    }, []);

    const loadPolicies = async () => {
        setLoading(true);
        try {
            const { policies } = await LogSafePoliciesService.list();
            setPolicies(policies || []);
        } catch (error) {
            console.error('Error loading policies:', error);
        } finally {
            setLoading(false);
        }
    };

    const togglePolicy = async (policy: LogSafePolicy) => {
        try {
            if (policy.enabled) {
                await LogSafePoliciesService.disable(policy.id);
            } else {
                await LogSafePoliciesService.enable(policy.id);
            }
            // Atualizar lista localmente
            setPolicies(policies.map(p =>
                p.id === policy.id ? { ...p, enabled: !p.enabled } : p
            ));
        } catch (error) {
            console.error('Error toggling policy:', error);
            alert('Falha ao alterar estado da política');
        }
    };

    const getSeverityBadge = (severity: string) => {
        const colors: any = {
            'LOW': 'bg-blue-100 text-blue-800',
            'MEDIUM': 'bg-yellow-100 text-yellow-800',
            'HIGH': 'bg-orange-100 text-orange-800',
            'CRITICAL': 'bg-red-100 text-red-800'
        };
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[severity] || 'bg-gray-100'}`}>
                {severity}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Políticas de Segurança</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Configure regras de detecção e respostas automáticas.
                    </p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Nova Política
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Habilitada</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome / Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severidade</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regra (Threshold)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Carregando políticas...</td></tr>
                        ) : policies.map((policy) => (
                            <tr key={policy.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={() => togglePolicy(policy)}
                                        className={`transition-colors ${policy.enabled ? 'text-green-600' : 'text-gray-300'}`}
                                    >
                                        {policy.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <Shield className="w-5 h-5 text-gray-400 mr-3" />
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{policy.name}</div>
                                            <div className="text-xs text-gray-500">{policy.event_type}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getSeverityBadge(policy.severity)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {policy.threshold} em {policy.window_seconds}s
                                    <div className="text-xs text-gray-400 mt-1">
                                        por {policy.group_by}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {policy.action_type ? (
                                        <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-1 rounded text-xs">
                                            <Zap className="w-3 h-3" />
                                            {policy.action_type}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs">Apenas Incidente</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    <button className="text-gray-400 hover:text-blue-600">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
