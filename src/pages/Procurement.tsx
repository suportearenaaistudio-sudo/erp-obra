import React from 'react';
import { ShoppingCart, Truck, Clock, CheckCircle, FileText, Plus } from 'lucide-react';

export const Procurement = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingCart className="text-indigo-600" />
                        Suprimentos
                    </h1>
                    <p className="text-slate-500">Gestão de compras e requisições</p>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                    <Plus size={18} /> Nova Requisição
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-100 p-3 rounded-lg text-orange-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Pendentes</p>
                            <h3 className="text-2xl font-bold text-slate-800">8</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                            <Truck size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Em Trânsito</p>
                            <h3 className="text-2xl font-bold text-slate-800">3</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-green-100 p-3 rounded-lg text-green-600">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Entregues (Mês)</p>
                            <h3 className="text-2xl font-bold text-slate-800">45</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center">
                <FileText size={48} className="text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700">Lista de Cotações</h3>
                <p className="text-slate-500">Selecione uma obra para ver as cotações em andamento.</p>
            </div>
        </div>
    );
};
