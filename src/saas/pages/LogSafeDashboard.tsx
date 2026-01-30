
import React from 'react';
import { LogSafeStats } from '../components/LogSafeStats';
import { LogSafeIncidentsTable } from '../components/LogSafeIncidentsTable';

export const LogSafeDashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">LogSafe Security Center</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Monitoramento em tempo real, gestão de incidentes e políticas de segurança.
                </p>
            </div>

            <LogSafeStats />

            <LogSafeIncidentsTable />
        </div>
    );
};
