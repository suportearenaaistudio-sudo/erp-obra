import React from 'react';
import { DashboardStats } from '../components/DashboardStats';

export const Dashboard: React.FC = () => {
    return (
        <div>
            {/* We can enhance this later, for now reuse Stats */}
            <DashboardStats />
        </div>
    );
};
