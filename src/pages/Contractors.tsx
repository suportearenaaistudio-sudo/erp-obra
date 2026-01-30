import React from 'react';
import { UserCog, Users, HardHat, FileSignature, Plus, ShieldCheck } from 'lucide-react';

export const Contractors = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <UserCog className="text-purple-600" />
                        Empreiteiros & Contratos
                    </h1>
                    <p className="text-slate-500">Gestão de terceiros e documentação</p>
                </div>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg shadow-purple-500/20">
                    <Plus size={18} /> Novo Contrato
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500">Total de Contratos</p>
                    <h3 className="text-2xl font-bold text-slate-800">14</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500">Ativos</p>
                    <h3 className="text-2xl font-bold text-green-600">8</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500">A Vencer (30 dias)</p>
                    <h3 className="text-2xl font-bold text-amber-600">2</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500">Documentos Pendentes</p>
                    <h3 className="text-2xl font-bold text-red-500">5</h3>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm min-h-[300px] flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <ShieldCheck size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">Controle de Documentação</h3>
                    <p className="text-slate-500 mt-2">
                        O sistema monitora automaticamente o vencimento de documentações de terceiros (NRs, ASO, Seguros).
                    </p>
                </div>
            </div>
        </div>
    );
};
