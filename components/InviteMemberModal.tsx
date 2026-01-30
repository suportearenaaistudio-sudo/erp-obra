import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Mail, Shield, AlertCircle, CheckCircle } from 'lucide-react';

interface Role {
    id: string;
    name: string;
}

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInviteSent: () => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, onInviteSent }) => {
    const { tenant } = useAuth();
    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');

    useEffect(() => {
        if (isOpen && tenant) {
            loadRoles();
            setStatus('idle');
            setEmail('');
            setGeneratedLink('');
        }
    }, [isOpen, tenant]);

    const loadRoles = async () => {
        if (!tenant) return;
        const { data } = await supabase
            .from('roles')
            .select('id, name')
            .eq('tenant_id', tenant.id)
            .order('name');

        if (data) {
            setAvailableRoles(data);
            if (data.length > 0) setSelectedRole(data[0].id);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        setErrorMessage('');

        try {
            // Criar convite no BD
            const { data, error } = await supabase
                .from('invites')
                .insert({
                    tenant_id: tenant?.id,
                    email,
                    role_id: selectedRole,
                    invited_by: (await supabase.auth.getUser()).data.user?.id
                })
                .select()
                .single();

            if (error) throw error;

            // Gerar link local para demonstração (Em produção enviaria email)
            const link = `${window.location.origin}/#/join?token=${data.token}`;
            setGeneratedLink(link);
            setStatus('success');
            onInviteSent();

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err.message || 'Erro ao enviar convite');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Convidar Membro</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {status === 'success' ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-2">Convite Criado!</h4>
                        <p className="text-slate-500 mb-6">
                            O convite foi registrado. Copie o link abaixo e envie para <strong>{email}</strong>:
                        </p>

                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 mb-6 break-all font-mono text-sm text-slate-600">
                            {generatedLink}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleInvite} className="p-6 space-y-4">
                        {status === 'error' && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 text-sm">
                                <AlertCircle size={18} />
                                {errorMessage}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                E-mail do Membro
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    placeholder="joao@empresa.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Cargo / Função
                            </label>
                            <div className="relative">
                                <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all appearance-none bg-white"
                                >
                                    {availableRoles.map(role => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={status === 'sending'}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30"
                            >
                                {status === 'sending' ? 'Criando Convite...' : 'Gerar Link de Convite'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
