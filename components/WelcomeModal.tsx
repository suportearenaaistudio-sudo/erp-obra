import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, CheckCircle, ArrowRight, Building2, Users, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WelcomeModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { profile, tenant, isTenantAdmin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Checar se já viu o modal
        const hasSeenWelcome = localStorage.getItem(`obra360_welcome_${profile?.id}`);

        // Mostrar apenas se não viu, se tem perfil carregado e se é admin (opcional, todos podem ver)
        if (!hasSeenWelcome && profile && tenant) {
            // Pequeno delay para animação de entrada ficar fluida
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [profile, tenant]);

    const handleClose = () => {
        setIsOpen(false);
        if (profile?.id) {
            localStorage.setItem(`obra360_welcome_${profile.id}`, 'true');
        }
    };

    if (!isOpen) return null;

    const steps = [
        {
            icon: Building2,
            title: 'Configure sua Empresa',
            desc: 'Personalize os dados da sua organização.',
            action: () => { handleClose(); navigate('/admin'); },
            btnText: 'Ir para Configurações',
            check: isTenantAdmin() // Só mostra esse passo/botão relevante se for admin
        },
        {
            icon: Users,
            title: 'Convide sua Equipe',
            desc: 'Traga seus colaboradores para o Obra360.',
            action: () => { handleClose(); navigate('/admin'); }, // Redireciona para admin onde tem convites
            btnText: 'Convidar Membros',
            check: isTenantAdmin()
        },
        {
            icon: FolderPlus,
            title: 'Crie sua Primeira Obra',
            desc: 'Comece a gerenciar seus projetos agora mesmo.',
            action: () => { handleClose(); navigate('/projects'); },
            btnText: 'Criar Projeto',
            check: true
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                {/* Header com gradiente */}
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold mb-2">Bem-vindo(a) ao Obra360! 🚀</h2>
                        <p className="text-blue-100 text-lg">
                            Olá, <strong>{profile?.name}</strong>! Estamos felizes em tê-lo(a) conosco na <strong>{tenant?.name}</strong>.
                        </p>
                    </div>

                    {/* Elementos decorativos de fundo */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl" />

                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    <p className="text-slate-600 mb-8 text-lg">
                        Para você começar com o pé direito, preparamos alguns passos importantes:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {steps.filter(s => s.check).map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center text-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-200 hover:shadow-lg transition-all group">
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                    <step.icon size={28} />
                                </div>
                                <h3 className="font-bold text-slate-800 mb-2">{step.title}</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-grow">{step.desc}</p>

                                <button
                                    onClick={step.action}
                                    className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                    {step.btnText} <ArrowRight size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={handleClose}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                        >
                            Começar a Usar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
