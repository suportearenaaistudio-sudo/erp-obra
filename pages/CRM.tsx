import React from 'react';
import { mockDeals, mockClients } from '../mockData';
import { Deal } from '../types';
import { MoreHorizontal, Plus, Calendar, DollarSign, User } from 'lucide-react';

const stages = [
  { id: 'QUALIFICATION', label: 'Qualificação', color: 'bg-slate-100 border-slate-200' },
  { id: 'PROPOSAL', label: 'Proposta Enviada', color: 'bg-blue-50 border-blue-200' },
  { id: 'NEGOTIATION', label: 'Negociação', color: 'bg-indigo-50 border-indigo-200' },
  { id: 'CLOSED_WON', label: 'Fechado (Ganho)', color: 'bg-green-50 border-green-200' },
  { id: 'CLOSED_LOST', label: 'Perdido', color: 'bg-red-50 border-red-200' },
];

// Explicitly typing as React.FC to avoid 'key' prop issues in TypeScript
const DealCard: React.FC<{ deal: Deal }> = ({ deal }) => {
  const client = mockClients.find(c => c.id === deal.clientId);
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing mb-3">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-slate-800 text-sm">{deal.title}</h4>
        <button className="text-slate-400 hover:text-slate-600">
          <MoreHorizontal size={16} />
        </button>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <User size={12} />
        <span className="truncate">{client?.name || 'Cliente Desconhecido'}</span>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <span className="font-bold text-slate-700 text-sm flex items-center gap-1">
          <DollarSign size={12} />
          {deal.value.toLocaleString('pt-BR', { notation: "compact", compactDisplay: "short" })}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            deal.probability > 70 ? 'bg-green-100 text-green-700' : 
            deal.probability > 40 ? 'bg-yellow-100 text-yellow-700' : 
            'bg-slate-100 text-slate-600'
        }`}>
          {deal.probability}%
        </span>
      </div>
      
      {deal.expectedCloseDate && (
        <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
          <Calendar size={10} />
          {new Date(deal.expectedCloseDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export const CRM = () => {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pipeline de Vendas</h1>
          <p className="text-sm text-slate-500">Gerencie oportunidades e acompanhe o funil.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-sm transition-all hover:shadow-md">
          <Plus size={18} /> Novo Negócio
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex h-full gap-4 min-w-[1200px]">
          {stages.map(stage => {
            const deals = mockDeals.filter(d => d.stage === stage.id);
            const totalValue = deals.reduce((acc, d) => acc + d.value, 0);

            return (
              <div key={stage.id} className="flex-1 flex flex-col min-w-[280px]">
                <div className={`p-3 rounded-t-xl border-t border-x ${stage.color} flex justify-between items-center`}>
                  <span className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{stage.label}</span>
                  <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold text-slate-600">{deals.length}</span>
                </div>
                <div className={`bg-slate-50/50 flex-1 border-x border-b border-gray-200 p-3 overflow-y-auto rounded-b-xl`}>
                  {deals.map(deal => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                  {deals.length === 0 && (
                    <div className="h-24 flex items-center justify-center text-slate-400 text-xs italic border-2 border-dashed border-gray-200 rounded-lg">
                      Arraste itens aqui
                    </div>
                  )}
                </div>
                <div className="mt-2 text-right px-2">
                  <span className="text-xs text-slate-500 font-medium">Total: </span>
                  <span className="text-sm font-bold text-slate-700">R$ {totalValue.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};