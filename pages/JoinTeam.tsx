import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, CheckCircle, AlertCircle, Building2, ArrowRight } from 'lucide-react';

export default function JoinTeam() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [inviteData, setInviteData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [accepting, setAccepting] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Token de convite inválido ou ausente.');
            setLoading(false);
            return;
        }
        checkInvite();
    }, [token]);

    const checkInvite = async () => {
        try {
            const { data, error } = await supabase.rpc('get_invite_details', { p_token: token });

            if (error) throw error;

            // data is array or object depending on RPC return type (RETURNS TABLE returns array of objects)
            const invite = Array.isArray(data) ? data[0] : data;

            if (!invite || !invite.valid) {
                setError('Este convite expirou ou não é válido.');
            } else {
                setInviteData(invite);
            }
        } catch (err: any) {
            console.error(err);
            setError('Erro ao validar convite.');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!user) {
            // Redirect to login preserving the join URL
            navigate(`/login?redirectTo=/join?token=${token}`);
            return;
        }

        setAccepting(true);
        try {
            const { data, error } = await supabase.rpc('accept_invite', { p_token: token });

            if (error) throw error;

            if (data.success) {
                // Force reload or redirect to dashboard
                window.location.href = '/';
            } else {
                setError(data.error || 'Erro ao aceitar convite.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro inesperado.');
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Ops! Algo deu errado</h2>
                    <p className="text-slate-500 mb-8">{error}</p>
                    <Link to="/" className="inline-flex items-center text-blue-600 font-medium hover:underline">
                        Voltar para Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-blue-500/20 shadow-lg transform -rotate-3">
                        <Building2 size={40} />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        Convite para Equipe
                    </h2>

                    <p className="text-slate-500 mb-8">
                        Você foi convidado para participar da equipe <strong>{inviteData.tenant_name}</strong> no Obra360.
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-8 text-left">
                        <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Convidado por</div>
                        <div className="font-medium text-slate-700">{inviteData.inviter_email || 'Administrador'}</div>

                        <div className="mt-3 text-xs font-semibold text-slate-400 uppercase mb-1">Seu email</div>
                        <div className="font-medium text-slate-700">{inviteData.invite_email}</div>
                    </div>

                    {!user ? (
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate(`/login?returnTo=/join?token=${token}`)}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                            >
                                Entrar com minha conta <ArrowRight size={18} />
                            </button>
                            <button
                                onClick={() => navigate(`/register?returnTo=/join?token=${token}`)}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                            >
                                Criar nova conta
                            </button>
                            <p className="text-xs text-slate-400 mt-4">
                                Você precisa estar logado para aceitar o convite.
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={handleAccept}
                            disabled={accepting}
                            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {accepting ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" /> Processando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={20} /> Aceitar e Entrar
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
