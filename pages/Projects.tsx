import React, { useState } from 'react';
import { mockProjects, mockClients } from '../mockData';
import { Project } from '../types';
import { ChevronDown, ChevronRight, FileText, Calendar, DollarSign, Plus, MapPin, User } from 'lucide-react';
import { Modal } from '../components/Modal';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const percentComplete = project.budgetTotal > 0 ? (project.spentTotal / project.budgetTotal) * 100 : 0;

  return (
    <div 
      onClick={onClick}
      className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-400 cursor-pointer transition-all shadow-sm hover:shadow-md group"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{project.name}</h3>
          <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
            <MapPin size={12} /> {project.address}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {project.status === 'ACTIVE' ? 'Em Andamento' : 'Planejamento'}
        </span>
      </div>
      
      <div className="mt-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600 font-medium">Progresso Financeiro</span>
          <span className="font-bold text-slate-800">{percentComplete.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${percentComplete}%` }}></div>
        </div>
        <div className="flex justify-between text-xs mt-3 text-slate-500">
          <span className="bg-red-50 text-red-700 px-2 py-1 rounded">Realizado: R$ {project.spentTotal.toLocaleString()}</span>
          <span className="bg-gray-50 text-slate-700 px-2 py-1 rounded">Orçamento: R$ {project.budgetTotal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

const PhaseDetail = ({ project }: { project: Project }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Cronograma Físico-Financeiro: {project.name}</h2>
        <div className="space-x-2 flex">
          <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-slate-700 font-medium shadow-sm">
            Exportar PDF
          </button>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm flex items-center gap-2">
            <Plus size={16} /> Adicionar Fase
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {project.phases.length > 0 ? project.phases.map((phase) => (
          <div key={phase.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-4 flex justify-between items-center border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${phase.status === 'COMPLETED' ? 'bg-green-500 shadow-green-200 shadow-lg' : phase.status === 'IN_PROGRESS' ? 'bg-blue-500 shadow-blue-200 shadow-lg' : 'bg-gray-300'}`}></div>
                <h3 className="font-semibold text-slate-800">{phase.name}</h3>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-gray-200"><Calendar size={14}/> {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}</span>
                <span className="flex items-center gap-1.5 font-mono font-medium text-slate-700 bg-white px-2 py-1 rounded border border-gray-200"><DollarSign size={14}/> {phase.budgetItems.reduce((acc, item) => acc + item.total, 0).toLocaleString()}</span>
              </div>
            </div>
            
            {/* Expanded Content (Simulated) */}
            <div className="p-4 bg-white">
               <table className="w-full text-sm">
                 <thead className="text-xs text-slate-400 uppercase bg-gray-50/50">
                    <tr>
                      <th className="px-3 py-2 text-left rounded-l-lg">Item</th>
                      <th className="px-3 py-2 text-left">Categoria</th>
                      <th className="px-3 py-2 text-right">Qtd</th>
                      <th className="px-3 py-2 text-right">Unitário</th>
                      <th className="px-3 py-2 text-right rounded-r-lg">Total</th>
                    </tr>
                 </thead>
                 <tbody className="text-slate-600">
                    {phase.budgetItems.length > 0 ? phase.budgetItems.map(item => (
                      <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-3 font-medium">{item.description}</td>
                        <td className="px-3 py-3"><span className="text-[10px] font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase">{item.category}</span></td>
                        <td className="px-3 py-3 text-right">{item.quantity} {item.unit}</td>
                        <td className="px-3 py-3 text-right">R$ {item.unitPrice.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-bold text-slate-800">R$ {item.total.toLocaleString()}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="text-center py-8 text-slate-400 italic">Nenhum item orçado nesta fase</td></tr>
                    )}
                 </tbody>
               </table>
               
               {/* Material Kit Link */}
               <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                 <div className="text-xs text-slate-500 flex items-center gap-2">
                   <FileText size={14} /> Kit de Materiais vinculado: <span className="font-medium text-blue-600 cursor-pointer hover:underline">Padrão Alvenaria v2</span>
                 </div>
                 <button className="text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 flex items-center gap-1.5 transition-colors">
                   <Plus size={14}/> Liberar Requisição de Materiais
                 </button>
               </div>
            </div>
          </div>
        )) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-slate-400">Nenhuma fase cadastrada para esta obra.</p>
            <button className="mt-2 text-blue-600 hover:text-blue-700 font-medium text-sm">Criar primeira fase</button>
          </div>
        )}
      </div>
    </div>
  );
};

export const Projects = () => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [newProject, setNewProject] = useState({
    name: '',
    clientId: '',
    address: '',
    budgetTotal: ''
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const project: Project = {
      id: `p${Date.now()}`,
      name: newProject.name,
      clientId: newProject.clientId,
      address: newProject.address,
      status: 'PLANNING',
      startDate: new Date().toISOString(),
      budgetTotal: Number(newProject.budgetTotal) || 0,
      spentTotal: 0,
      phases: []
    };
    
    setProjects([project, ...projects]);
    setIsModalOpen(false);
    setNewProject({ name: '', clientId: '', address: '', budgetTotal: '' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Obras</h1>
          <p className="text-sm text-slate-500">Acompanhe o cronograma físico-financeiro de todos os projetos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-sm font-medium transition-all hover:shadow-md"
        >
          <Plus size={20} /> Nova Obra
        </button>
      </div>

      {!selectedProject ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onClick={() => setSelectedProject(p)} />
          ))}
        </div>
      ) : (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <button 
            onClick={() => setSelectedProject(null)}
            className="mb-4 text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
          >
            ← Voltar para lista de obras
          </button>
          <PhaseDetail project={selectedProject} />
        </div>
      )}

      {/* Modal Nova Obra */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Nova Obra"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Obra</label>
            <input 
              required
              type="text" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: Residencial Vista Alegre"
              value={newProject.name}
              onChange={e => setNewProject({...newProject, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <div className="relative">
              <select 
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                value={newProject.clientId}
                onChange={e => setNewProject({...newProject, clientId: e.target.value})}
              >
                <option value="">Selecione um cliente...</option>
                {mockClients.map(client => (
                  <option key={client.id} value={client.id}>{client.name} - {client.company}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
            <input 
              required
              type="text" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Rua, Número, Bairro, Cidade"
              value={newProject.address}
              onChange={e => setNewProject({...newProject, address: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Orçamento Estimado (R$)</label>
            <input 
              required
              type="number" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0,00"
              value={newProject.budgetTotal}
              onChange={e => setNewProject({...newProject, budgetTotal: e.target.value})}
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Criar Obra
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};