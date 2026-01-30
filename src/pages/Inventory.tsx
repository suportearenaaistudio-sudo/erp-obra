import React from 'react';
import { Package, Plus, Search, Filter, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';

export const Inventory = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="text-blue-600" />
                        Estoque Global
                    </h1>
                    <p className="text-slate-500">Gerencie materiais e equipamentos em todas as obras</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <Filter size={18} /> Filtros
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
                        <Plus size={18} /> Novo Item
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500 font-medium">Valor Total em Estoque</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">R$ 452.190,00</h3>
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-2 bg-green-50 w-fit px-2 py-1 rounded-full">
                        <ArrowUpRight size={12} /> +2.5% vs. mês anterior
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500 font-medium">Itens em Alerta</p>
                    <h3 className="text-2xl font-bold text-amber-600 mt-1">12</h3>
                    <p className="text-xs text-slate-400 mt-2">Estoque baixo</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500 font-medium">Movimentações (Hoje)</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">28</h3>
                    <div className="flex items-center gap-1 text-xs text-blue-600 mt-2">
                        15 Entradas / 13 Saídas
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500 font-medium">Obras Atendidas</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">4</h3>
                    <p className="text-xs text-slate-400 mt-2">Ativas no momento</p>
                </div>
            </div>

            {/* Main Content Placeholder */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm min-h-[400px] flex items-center justify-center flex-col gap-4 text-center p-8">
                <div className="bg-slate-50 p-4 rounded-full">
                    <Search size={32} className="text-slate-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Nenhum item encontrado</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-1">
                        Seu estoque está sincronizado. Use o botão "Novo Item" para adicionar materiais.
                    </p>
                </div>
            </div>
        </div>
    );
};
