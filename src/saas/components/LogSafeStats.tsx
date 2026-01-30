
import React, { useState, useEffect } from 'react';
import { LogSafeEventsService } from '../logsafe/logsafe.service';
import { ShieldAlert, Activity, UserX, AlertTriangle } from 'lucide-react';

export const LogSafeStats: React.FC = () => {
    const [stats, setStats] = useState({
        totalEvents: 0,
        incidentsBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        timeRange: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await LogSafeEventsService.stats(24);
            setStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse h-32 bg-gray-100 rounded-xl mb-8"></div>;
    }

    const { incidentsBySeverity } = stats;
    const totalIncidents = Object.values(incidentsBySeverity).reduce((a, b) => a + b, 0);

    const cards = [
        {
            label: 'Total de Incidentes (24h)',
            value: totalIncidents,
            icon: ShieldAlert,
            color: 'text-red-600',
            bg: 'bg-red-100',
            sub: `${incidentsBySeverity.CRITICAL} Críticos`,
        },
        {
            label: 'Eventos Monitorados',
            value: stats.totalEvents,
            icon: Activity,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
            sub: 'Últimas 24 horas',
        },
        {
            label: 'Incidentes Críticos',
            value: incidentsBySeverity.CRITICAL,
            icon: AlertTriangle,
            color: 'text-orange-600',
            bg: 'bg-orange-100',
            sub: 'Ação imediata necessária',
        },
        {
            label: 'Ações de Bloqueio',
            value: 0, // TODO add to API stats
            icon: UserX,
            color: 'text-gray-600',
            bg: 'bg-gray-100',
            sub: 'Usuários/IPs bloqueados',
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
