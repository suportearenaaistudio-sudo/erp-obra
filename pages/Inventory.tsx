import React, { useState } from 'react';
import { mockMaterials, mockProjects } from '../mockData';
import { AlertTriangle, TrendingDown, ArrowUpRight, Search, Plus, Archive } from 'lucide-react';
import { Modal } from '../components/Modal';

export const Inventory = () => {
  const [materials, setMaterials] = useState(mockMaterials);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');

  // Form State for Movement
  const [movement, setMovement] = useState({
    type: 'OUT' as 'IN' | 'OUT',
    quantity: '',
    projectId: '',
    reason: ''
  });

  const getReorderSuggestion = (material: any) => {
    const deficit = material.currentStock - material.minStock - material.reserved;
    if (deficit < 0) return Math.abs(deficit);
    return 0;
  };

  const handleOpenModal = (materialId?: string) => {
    if (materialId) setSelectedMaterialId(materialId);
    else if (materials.length > 0) setSelectedMaterialId(materials[0].id);
    setIsModalOpen(true);
  };

  const handleMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(movement.quantity);
    if (!qty || qty <= 0) return;

    setMaterials(prev => prev.map(m => {
      if (m.id === selectedMaterialId) {
        const newStock = movement.type === 'IN' ? m.currentStock + qty : m.currentStock - qty;
        
        // Validation for OUT
        if (movement.type === 'OUT' && newStock < 0) {
          alert(`Estoque insuficiente! Disponível: ${m.currentStock}`);
          throw new Error("Estoque insuficiente");
        }

        return { ...m, currentStock: newStock };
      }
      return m;
    }));

    setIsModalOpen(false);
    setMovement({ type: 'OUT', quantity: '', projectId: '', reason: '' });
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estoque Global</h1>
          <p className="text-sm text-slate-500">Gestão de materiais, custos médios e reposição.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm"
        >
          <ArrowUpRight size={18} /> Registrar Movimentação
        </button>
      </div>

      {/* MRP / Replenishment Suggestions */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-32 bg-orange-100/30 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
        <div className="flex items-start gap-4 relative z-10">
          <div className="bg-orange-100 p-3 rounded-xl text-orange-600 shadow-sm">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800">Sugestões de Reposição (MRP-Lite)</h3>
            <p className="text-slate-600 text-sm mb-4 max-w-2xl">
              Baseado nas fases planejadas para os próximos 30 dias e estoque mínimo. O sistema detectou riscos de ruptura para os itens abaixo.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map(m => {
                const suggestQty = getReorderSuggestion(m);
                if (suggestQty === 0) return null;
                return (
                  <div key={m.id} className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-3 border border-orange-100/50 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-700">{m.name}</p>
                        <p className="text-xs text-slate-400 mt-1">Estoque: <span className="text-slate-600 font-medium">{m.currentStock} {m.unit}</span></p>
                      </div>
                      <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded uppercase">Crítico</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                       <div className="text-xs text-slate-500">Sugerido: <span className="font-bold text-orange-600">{suggestQty} {m.unit}</span></div>
                       <button className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors shadow-sm">
                        Gerar Requisição
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou SKU..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-600 bg-gray-50 outline-none">
              <option>Todas Categorias</option>
              <option>Civil</option>
              <option>Elétrica</option>
              <option>Hidráulica</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-slate-500 uppercase text-xs tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold">SKU / Material</th>
                <th className="px-6 py-4 font-semibold">Categoria</th>
                <th className="px-6 py-4 font-semibold text-right">Estoque Físico</th>
                <th className="px-6 py-4 font-semibold text-right">Custo Médio</th>
                <th className="px-6 py-4 font-semibold text-right">Valor Total</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMaterials.map((m) => {
                const status = m.currentStock <= m.minStock ? 'CRITICAL' : m.currentStock < (m.minStock * 1.5) ? 'LOW' : 'OK';
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{m.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{m.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">{m.category}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono font-medium text-slate-700">{m.currentStock}</span> <span className="text-slate-400 text-xs">{m.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">R$ {m.avgCost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">R$ {(m.currentStock * m.avgCost).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      {status === 'CRITICAL' && <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-red-100">Crítico</span>}
                      {status === 'LOW' && <span className="text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-orange-100">Baixo</span>}
                      {status === 'OK' && <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-green-100">Normal</span>}
                    </td>
                    <td className="px-6 py-4 text-center flex justify-center gap-2">
                      <button 
                        onClick={() => handleOpenModal(m.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Movimentar"
                      >
                        <ArrowUpRight size={18} />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Histórico">
                        <Archive size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Movimentação */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Movimentação de Estoque"
      >
        <form onSubmit={handleMovement} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
            <select 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={selectedMaterialId}
              onChange={e => setSelectedMaterialId(e.target.value)}
            >
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.currentStock} {m.unit} atual)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Movimento</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMovement({...movement, type: 'OUT'})}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium border ${movement.type === 'OUT' ? 'bg-red-50 border-red-200 text-red-700' : 'border-gray-200 text-slate-600 hover:bg-gray-50'}`}
                >
                  Saída / Retirada
                </button>
                <button
                  type="button"
                  onClick={() => setMovement({...movement, type: 'IN'})}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium border ${movement.type === 'IN' ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 text-slate-600 hover:bg-gray-50'}`}
                >
                  Entrada
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
              <input 
                type="number"
                min="0.01"
                step="0.01"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                value={movement.quantity}
                onChange={e => setMovement({...movement, quantity: e.target.value})}
              />
            </div>
          </div>

          {movement.type === 'OUT' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-slate-700 mb-1">Destino (Obra)</label>
              <select 
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={movement.projectId}
                onChange={e => setMovement({...movement, projectId: e.target.value})}
              >
                <option value="">Selecione a Obra...</option>
                {mockProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">O custo será alocado automaticamente para esta obra.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observação / Justificativa</label>
            <textarea 
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Aplicação na fundação bloco C"
              value={movement.reason}
              onChange={e => setMovement({...movement, reason: e.target.value})}
            />
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
              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium shadow-sm ${movement.type === 'OUT' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              Confirmar {movement.type === 'OUT' ? 'Saída' : 'Entrada'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};