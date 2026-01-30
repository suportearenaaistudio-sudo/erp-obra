import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { CheckCircle, XCircle } from 'lucide-react';

interface Feature {
    id: string;
    feature_key: string;
    display_name: string;
    description: string;
    category: string;
    active: boolean;
}

export const FeaturesList: React.FC = () => {
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFeatures();
    }, []);

    const loadFeatures = async () => {
        setLoading(true);
        const { data } = await supabase.from('features').select('*').order('category', { ascending: true });
        setFeatures(data || []);
        setLoading(false);
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Carregando features...</div>;
    }

    return (
        <div>
            <div style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb' }}>
                        <tr>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                FEATURE KEY
                            </th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                NOME
                            </th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                CATEGORIA
                            </th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                STATUS
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {features.map((feature, index) => (
                            <tr
                                key={feature.id}
                                style={{ borderTop: index > 0 ? '1px solid #e5e7eb' : 'none' }}
                            >
                                <td style={{ padding: '16px' }}>
                                    <code style={{
                                        padding: '4px 8px',
                                        background: '#f3f4f6',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        fontFamily: 'monospace',
                                    }}>
                                        {feature.feature_key}
                                    </code>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ fontWeight: '500' }}>{feature.display_name}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                        {feature.description}
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{
                                        padding: '4px 12px',
                                        background: feature.category === 'MODULE' ? '#dbeafe' :
                                            feature.category === 'ADD_ON' ? '#fef3c7' : '#f3e8ff',
                                        color: feature.category === 'MODULE' ? '#1e40af' :
                                            feature.category === 'ADD_ON' ? '#92400e' : '#6b21a8',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                    }}>
                                        {feature.category}
                                    </span>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    {feature.active ? (
                                        <CheckCircle size={20} style={{ color: '#10b981' }} />
                                    ) : (
                                        <XCircle size={20} style={{ color: '#ef4444' }} />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
