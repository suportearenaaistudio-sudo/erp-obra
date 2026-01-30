import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, AlertTriangle, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TrialBanner = () => {
    const { subscription, isBefore, addDays } = useAuth(); // Assuming isBefore/addDays are available or we use native Date

    if (!subscription) return null;

    // Se já for plano pago ativo, não mostra nada
    if (subscription.status === 'active' && subscription.plan?.name !== 'trial') return null;

    // Se não tiver data de fim de trial, ignora (erro de dados)
    if (!subscription.trial_end) return null;

    const trialEnd = new Date(subscription.trial_end);
    const now = new Date();

    // Dias restantes
    const diffTime = Math.abs(trialEnd.getTime() - now.getTime());
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isExpired = now > trialEnd;

    // Se expirou e status não é active (provavelmente cancelled ou incomplete)
    if (isExpired && subscription.status !== 'active') {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-red-600" size={24} />
                        <div>
                            <p className="font-bold text-red-800">Seu período de teste expirou!</p>
                            <p className="text-sm text-red-600">
                                O acesso a funcionalidades avançadas foi bloqueado. Assine agora para continuar usando.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Se faltam 3 dias ou menos
    if (daysLeft <= 3) {
        return (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Clock className="text-amber-600" size={24} />
                        <div>
                            <p className="font-bold text-amber-800">
                                Seu teste gratuito acaba em {daysLeft} dia{daysLeft !== 1 ? 's' : ''}!
                            </p>
                            <p className="text-sm text-amber-600">
                                Não perca o acesso aos seus dados e funcionalidades premium.
                            </p>
                        </div>
                    </div>
                    {/* Botão seria um Link para Billing, mas como não temos checkout ainda, deixamos sem ação ou mailto */}
                </div>
            </div>
        );
    }

    // Se está no trial normal
    return (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg shadow-sm">
            <div className="flex items-center gap-3">
                <Crown className="text-blue-600" size={24} />
                <div>
                    <p className="font-bold text-blue-800">Você está no Período de Teste Gratuito</p>
                    <p className="text-sm text-blue-600">
                        Aproveite <strong>{daysLeft} dias restantes</strong> para testar todas as funcionalidades do plano Pro.
                    </p>
                </div>
            </div>
        </div>
    );
};
