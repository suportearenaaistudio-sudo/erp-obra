import React, { useState } from 'react';
import { mockFinancials, mockProjects } from '../mockData';
import { FinancialRecord } from '../types';
import { Modal } from '../components/Modal';
import { TrendingUp, TrendingDown, DollarSign, Calendar, FileText, Filter } from 'lucide-react';

export const Finance = () => {
  const [financials, setFinancials] = useState<FinancialRecord[]>(mockFinancials);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'AP' | 'AR'>('AP');

  // Form State
  const [newRecord, setNewRecord] = useState({
    description: '',
    amount: '',
    projectId: '',
    category: '',
    dueDate: ''
  });

  const handleOpenModal = (type: 'AP' | 'AR') => {
    setModalType(type);
    setNewRecord({ description: '', amount: '', projectId: '', category: '', dueDate: '' });
    setIsModalOpen(true);
  };

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const record: FinancialRecord = {
      id: `f${Date.now()}`,
      type: modalType,
      description: newRecord.description,
      amount: Number(newRecord.amount),
      projectId: newRecord.projectId,
      category: newRecord.category,
      dueDate: newRecord.dueDate,
      status: 'PENDING'
    };
    setFinancials([record, ...financials]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
          <p className="text-sm text-slate-500">Fluxo de caixa, contas a pagar e receber integradas.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleOpenModal('AP')}
            className="flex-1 md:flex-none px-4 py-2 bg-red-50 text-red-700 border border-red-100 rounded-lg hover:bg-red-100 text-sm font-medium flex items-center gap-2 justify-center transition-colors"
          >
            <TrendingDown size={18} /> Nova Despesa
          </button>
          <button 
            onClick={() => handleOpenModal('AR')}
            className="flex-1 md:flex-none px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-lg hover:bg-green-100 text-sm font-medium flex items-center gap-2 justify-center transition-colors"
          >
            <TrendingUp size={18} /> Nova Receita
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <div className="flex gap-2 text-sm">
             <button className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-slate-600 font-medium shadow-sm hover:text-blue-600">Todos</button>
             <button className="px-3 py-1.5 border border-transparent rounded-md text-slate-500 hover:bg-gray-100">Pendentes</button>
             <button className="px-3 py-1.5 border border-transparent rounded-md text-slate-500 hover:bg-gray-100">Pagos</button>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded">
            <Filter size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-slate-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Vencimento</th>
                <th className="px-6 py-4 font-semibold">Descrição</th>
                <th className="px-6 py-4 font-semibold">Projeto / Obra</th>
                <th className="px-6 py-4 font-semibold">Categoria</th>
                <th className="px-6 py-4 font-semibold text-center">Tipo</th>
                <th className="px-6 py-4 font-semibold text-right">Valor</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {financials.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(rec.dueDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">{rec.description}</td>
                  <td className="px-6 py-4 text-slate-500">{mockProjects.find(p => p.id === rec.projectId)?.name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{rec.category}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${rec.type === 'AR' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                      {rec.type === 'AR' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-medium ${rec.type === 'AR' ? 'text-green-600' : 'text-red-600'}`}>
                    {rec.type === 'AR' ? '+' : '-'} R$ {rec.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      rec.status === 'PAID' ? 'bg-gray-100 text-gray-500' : 
                      rec.status === 'OVERDUE' ? 'bg-red-100 text-red-600' : 
                      'bg-yellow-50 text-yellow-600 border border-yellow-100'
                    }`}>
                      {rec.status === 'PAID' && <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>}
                      {rec.status === 'OVERDUE' && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                      {rec.status === 'PENDING' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>}
                      {rec.status === 'PAID' ? 'Pago' : rec.status === 'OVERDUE' ? 'Vencido' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalType === 'AP' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'}
      >
        <form onSubmit={handleAddRecord} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <input 
              required
              type="text" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={modalType === 'AP' ? "Ex: Pagamento Fornecedor XYZ" : "Ex: Medição 01 - Cliente A"}
              value={newRecord.description}
              onChange={e => setNewRecord({...newRecord, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
               <input 
                required
                type="number" 
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                value={newRecord.amount}
                onChange={e => setNewRecord({...newRecord, amount: e.target.value})}
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento</label>
               <input 
                required
                type="date" 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={newRecord.dueDate}
                onChange={e => setNewRecord({...newRecord, dueDate: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <select 
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={newRecord.category}
              onChange={e => setNewRecord({...newRecord, category: e.target.value})}
            >
              <option value="">Selecione...</option>
              <option value="Material">Material</option>
              <option value="Mão de Obra">Mão de Obra</option>
              <option value="Equipamentos">Equipamentos</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Vendas">Vendas / Receita</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vincular a Obra (Opcional)</label>
            <select 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={newRecord.projectId}
              onChange={e => setNewRecord({...newRecord, projectId: e.target.value})}
            >
              <option value="">Sem vínculo</option>
              {mockProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-slate-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium shadow-sm ${modalType === 'AP' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              Confirmar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};