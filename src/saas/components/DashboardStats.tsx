import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Users,
    Building2,
    CreditCard,
    DollarSign,
    TrendingUp,
    Activity,
} from 'lucide-react';

export const DashboardStats: React.FC = () => {
    const [stats, setStats] = useState({
        totalTenants: 0,
        activeTenants: 0,
        totalUsers: 0,
        mrr: 0,
        trialing: 0,
        conversionRate: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            // NOTE: In a real scenario you might want a specific Edge Function for this aggregation
            // OR use a specialized view. For now, we do multiple queries.

            // Tenants Stats
            const { count: totalTenants } = await supabase.from('tenants').select('*', { count: 'exact', head: true });
            const { count: activeTenants } = await supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active');

            // Users Stats
            const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });

            // Subscriptions/MRR
            // Fetch all active subscriptions with plans to sum price
            const { data: subs } = await supabase
                .from('subscriptions')
                .select('status, plan:plans(price_monthly)')
                .in('status', ['active', 'trialing']);

            let mrr = 0;
            let trialingCount = 0;

            subs?.forEach((sub: any) => {
                if (sub.status === 'active' && sub.plan?.price_monthly) {
                    mrr += sub.plan.price_monthly;
                }
                if (sub.status === 'trialing') {
                    trialingCount++;
                }
            });

            // Conversion Rate (Active / Total)
            const conversion = totalTenants ? ((activeTenants || 0) / totalTenants) * 100 : 0;

            setStats({
                totalTenants: totalTenants || 0,
                activeTenants: activeTenants || 0,
                totalUsers: totalUsers || 0,
                mrr,
                trialing: trialingCount,
                conversionRate: conversion,
            });

        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando estatísticas...</div>;
    }

    const cards = [
        {
            label: 'MRR',
            value: `R$ ${stats.mrr.toFixed(2)}`,
            icon: DollarSign,
            color: 'text-green-600',
            bg: 'bg-green-100',
            sub: 'Receita recorrente mensal',
        },
        {
            label: 'Total Tenants',
            value: stats.totalTenants,
            icon: Building2,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
            sub: `${stats.activeTenants} ativos`,
        },
        {
            label: 'Usuários Totais',
            value: stats.totalUsers,
            icon: Users,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
            sub: 'Em todos os tenants',
        },
        {
            label: 'Em Trial',
            value: stats.trialing,
            icon: Activity,
            color: 'text-orange-600',
            bg: 'bg-orange-100',
            sub: 'Oportunidades de venda',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                    <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-lg ${card.bg}`}>
                                <Icon className={`h-6 w-6 ${card.color}`} />
                            </div>
                            {idx === 0 && <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>}
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">{card.label}</h3>
                            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                            <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
