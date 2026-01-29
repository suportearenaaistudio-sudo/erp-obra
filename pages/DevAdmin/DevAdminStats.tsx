import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    TrendingUp,
    Users,
    DollarSign,
    Clock,
    Building2,
    BarChart3,
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface Stats {
    total_subscriptions: number;
    active_count: number;
    trial_count: number;
    canceled_count: number;
    mrr: number;
    trial_conversion_rate_pct: number;
    trials_expiring_soon: number;
}

interface GrowthData {
    month: string;
    new_tenants: number;
    active_subscriptions: number;
    mrr_change: number;
}

interface TopTenant {
    tenant_name: string;
    plan_name: string;
    monthly_revenue: number;
    current_users: number;
    current_projects: number;
}

export const DevAdminStats: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [growth, setGrowth] = useState<GrowthData[]>([]);
    const [topTenants, setTopTenants] = useState<TopTenant[]>([]);
    const [planDistribution, setPlanDistribution] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            // 1. Get subscription stats
            const { data: statsData } = await supabase
                .from('subscription_stats')
                .select('*')
                .single();

            if (statsData) setStats(statsData);

            // 2. Get monthly growth
            const { data: growthData } = await supabase.rpc('get_monthly_growth');
            if (growthData) {
                const formatted = growthData.slice(0, 6).reverse().map((item: any) => ({
                    month: new Date(item.month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                    new_tenants: item.new_tenants,
                    active_subscriptions: item.active_subscriptions,
                    mrr_change: Number(item.mrr_change) || 0,
                }));
                setGrowth(formatted);
            }

            // 3. Get top tenants
            const { data: topTenantsData } = await supabase.rpc('get_top_tenants_by_revenue', { p_limit: 10 });
            if (topTenantsData) setTopTenants(topTenantsData);

            // 4. Get plan distribution
            const { data: planDistData } = await supabase
                .from('plan_distribution')
                .select('*');
            if (planDistData) setPlanDistribution(planDistData);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Carregando estatísticas...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">📊 Estatísticas Globais</h2>
                <p className="text-gray-600">
                    Visão geral do desempenho do SaaS
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-blue-100 text-sm font-medium">MRR Total</div>
                        <DollarSign className="h-8 w-8 text-blue-200" />
                    </div>
                    <div className="text-3xl font-bold">{formatCurrency(stats?.mrr || 0)}</div>
                    <div className="text-blue-100 text-sm mt-2">Monthly Recurring Revenue</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-green-100 text-sm font-medium">Tenants Ativos</div>
                        <Building2 className="h-8 w-8 text-green-200" />
                    </div>
                    <div className="text-3xl font-bold">{stats?.active_count || 0}</div>
                    <div className="text-green-100 text-sm mt-2">
                        {stats?.total_subscriptions || 0} total • {stats?.canceled_count || 0} cancelados
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-purple-100 text-sm font-medium">Trials Ativos</div>
                        <Clock className="h-8 w-8 text-purple-200" />
                    </div>
                    <div className="text-3xl font-bold">{stats?.trial_count || 0}</div>
                    <div className="text-purple-100 text-sm mt-2">
                        {stats?.trials_expiring_soon || 0} expirando em 7 dias
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-orange-100 text-sm font-medium">Taxa de Conversão</div>
                        <TrendingUp className="h-8 w-8 text-orange-200" />
                    </div>
                    <div className="text-3xl font-bold">
                        {stats?.trial_conversion_rate_pct?.toFixed(1) || 0}%
                    </div>
                    <div className="text-orange-100 text-sm mt-2">Trial → Paid</div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Growth Chart */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-bold mb-4">📈 Crescimento de Tenants (6 meses)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={growth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="new_tenants"
                                stroke="#667eea"
                                strokeWidth={2}
                                name="Novos Tenants"
                            />
                            <Line
                                type="monotone"
                                dataKey="active_subscriptions"
                                stroke="#43e97b"
                                strokeWidth={2}
                                name="Ativos"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* MRR Change Chart */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-bold mb-4">💰 Variação de MRR</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={growth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend />
                            <Bar dataKey="mrr_change" fill="#667eea" name="Variação MRR" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plan Distribution */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-bold mb-4">🎯 Distribuição por Plano</h3>
                    {planDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={planDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.plan_name} (${entry.subscription_count})`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="subscription_count"
                                >
                                    {planDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center text-gray-500 py-12">Sem dados</div>
                    )}
                </div>

                {/* Top Tenants */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-bold mb-4">🏆 Top 10 Tenants por Revenue</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {topTenants.length > 0 ? (
                            topTenants.map((tenant, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <div className="font-semibold text-sm">{tenant.tenant_name}</div>
                                        <div className="text-xs text-gray-600">
                                            {tenant.plan_name} • {tenant.current_users} users • {tenant.current_projects} projetos
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-green-600">
                                            {formatCurrency(tenant.monthly_revenue)}
                                        </div>
                                        <div className="text-xs text-gray-500">/mês</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 py-8">Nenhum tenant ativo</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                    <BarChart3 className="h-6 w-6 text-blue-600 mt-1" />
                    <div>
                        <h4 className="font-bold text-blue-900 mb-2">Resumo Executivo</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>
                                • <strong>{stats?.active_count || 0} empresas</strong> gerando{' '}
                                <strong>{formatCurrency(stats?.mrr || 0)}</strong> de MRR
                            </li>
                            <li>
                                • <strong>{stats?.trial_count || 0} trials ativos</strong> com taxa de conversão de{' '}
                                <strong>{stats?.trial_conversion_rate_pct?.toFixed(1)}%</strong>
                            </li>
                            <li>
                                • <strong>{stats?.trials_expiring_soon || 0} trials</strong> expirando nos próximos 7 dias
                                (ação necessária)
                            </li>
                            <li>
                                • Total de <strong>{stats?.total_subscriptions || 0} subscriptions</strong> (
                                {stats?.canceled_count || 0} canceladas)
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
