import React, { useState } from 'react';
import { mockOrders, mockProjects } from '../mockData';
import { ProcurementOrder } from '../types';
import { Search, Filter, Plus, FileText, Truck, CheckCircle, Clock } from 'lucide-react';

export const Procurement = () => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'REQ'>('ORDERS');

  const getStatusColor = (status: ProcurementOrder['status']) => {
    switch(status) {
      case 'RECEIVED': return 'bg-green-100 text-green-700';
      case 'ORDERED': return 'bg-blue-100 text-blue-700';
      case 'APPROVED': return 'bg-indigo-100 text-indigo-700';
      case 'QUOTING': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Suprimentos e Compras</h1>
          <p className="text-sm text-slate-500">Gestão de requisições, cotações e pedidos de compra.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-300 text-slate-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2">
            <FileText size={18} /> Relatórios
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 shadow-sm">
            <Plus size={18} /> Nova Requisição
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('ORDERS')}
            className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'ORDERS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Pedidos de Compra
          </button>
          <button 
            onClick={() => setActiveTab('REQ')}
            className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'REQ' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Requisições em Aberto
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-gray-50 flex gap-4 border-b border-gray-200">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por PO, Fornecedor ou Obra..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-slate-600 hover:text-blue-600 flex items-center gap-2 text-sm">
            <Filter size={16} /> Filtros
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Código</th>
                <th className="px-6 py-3 font-medium">Obra / Projeto</th>
                <th className="px-6 py-3 font-medium">Fornecedor</th>
                <th className="px-6 py-3 font-medium">Itens</th>
                <th className="px-6 py-3 font-medium text-right">Valor Total</th>
                <th className="px-6 py-3 font-medium">Data Criação</th>
                <th className="px-6 py-3 font-medium text-center">Status</th>
                <th className="px-6 py-3 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockOrders.map((order) => {
                const project = mockProjects.find(p => p.id === order.projectId);
                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-mono font-medium text-blue-600">{order.code}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{project?.name}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[150px]">{project?.address}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{order.supplier}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {order.items.length} item(s) 
                      <span className="text-xs text-slate-400 block">Ex: {order.items[0]?.materialId}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">
                      R$ {order.totalEstimated.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(order.createdDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                        {order.status === 'RECEIVED' && <CheckCircle size={12} />}
                        {order.status === 'ORDERED' && <Truck size={12} />}
                        {order.status === 'REQUESTED' && <Clock size={12} />}
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-slate-400 hover:text-blue-600 font-medium text-xs border border-gray-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors">
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-slate-500">Mostrando <span className="font-medium">1-3</span> de <span className="font-medium">12</span> pedidos</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-slate-600 disabled:opacity-50" disabled>Anterior</button>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-slate-600 hover:bg-white">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  );
};