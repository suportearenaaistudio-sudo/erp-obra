import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Plan {
    id: string;
    display_name: string;
    price_monthly: number;
    max_users: number;
    max_projects: number;
    max_storage_gb: number;
    included_features: string[];
}

export const PlansList: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        setLoading(true);
        const { data } = await supabase.from('plans').select('*').order('price_monthly', { ascending: true });
        setPlans(data || []);
        setLoading(false);
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Carregando planos...</div>;
    }

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {plans.map(plan => (
                    <div
                        key={plan.id}
                        style={{
                            background: 'white',
                            border: '2px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '24px',
                        }}
                    >
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                            {plan.display_name}
                        </h3>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea', marginBottom: '16px' }}>
                            R$ {plan.price_monthly.toFixed(2)}
                            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'normal' }}>/mês</span>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Limites:</div>
                            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                                👥 {plan.max_users} usuários
                            </div>
                            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                                🏗️ {plan.max_projects} projetos
                            </div>
                            <div style={{ fontSize: '13px' }}>
                                💾 {plan.max_storage_gb} GB storage
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                                Features ({plan.included_features.length}):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {plan.included_features.slice(0, 4).map((feature: string) => (
                                    <span
                                        key={feature}
                                        style={{
                                            padding: '2px 8px',
                                            background: '#f3f4f6',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                        }}
                                    >
                                        {feature}
                                    </span>
                                ))}
                                {plan.included_features.length > 4 && (
                                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                        +{plan.included_features.length - 4}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
