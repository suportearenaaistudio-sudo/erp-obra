import React from 'react';
import { DollarSign, PieChart, TrendingUp, TrendingDown, Calendar, Download, Plus } from 'lucide-react';

export const Finance = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="text-emerald-600" />
                        Gestão Financeira
                    </h1>
                    <p className="text-slate-500">Fluxo de caixa, contas a pagar e receber</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <Calendar size={18} /> Jan 2026
                    </button>
                    <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                        <Plus size={18} /> Nova Transação
                    </button>
                </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Receitas */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={64} className="text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Entradas (Mês)</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-2">R$ 125.000,00</h3>
                    <div className="flex items-center gap-2 mt-4 text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
                        <TrendingUp size={14} /> +12% vs. anterior
                    </div>
                </div>

                {/* Despesas */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingDown size={64} className="text-red-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Saídas (Mês)</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-2">R$ 84.320,00</h3>
                    <div className="flex items-center gap-2 mt-4 text-xs font-medium text-red-600 bg-red-50 w-fit px-2 py-1 rounded-full">
                        <TrendingUp size={14} /> +5% vs. anterior
                    </div>
                </div>

                {/* Saldo */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign size={64} className="text-white" />
                    </div>
                    <p className="text-sm font-medium text-slate-300">Saldo Atual</p>
                    <h3 className="text-3xl font-bold mt-2">R$ 40.680,00</h3>
                    <p className="text-xs text-slate-400 mt-4">Disponível para saque imediato</p>
                </div>
            </div>

            {/* Charts Section Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm min-h-[300px] flex items-center justify-center">
                    <div className="text-center">
                        <PieChart size={48} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Gráfico de Categorias</p>
                        <p className="text-xs text-slate-400">Dados sendo processados...</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm min-h-[300px] flex items-center justify-center">
                    <div className="text-center">
                        <TrendingUp size={48} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Fluxo de Caixa Projetado</p>
                        <p className="text-xs text-slate-400">Visualização de 6 meses</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
