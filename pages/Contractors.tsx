import React, { useState } from 'react';
import { mockContractors, mockContracts, mockMeasurements, mockProjects } from '../mockData';
import { Contractor, Contract, Measurement } from '../types';
import { Search, Plus, FileText, User, Phone, Calendar, CheckCircle, Clock, DollarSign, ChevronDown } from 'lucide-react';

const ContractorCard: React.FC<{ contractor: Contractor }> = ({ contractor }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex justify-between items-center group">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
        {contractor.name.charAt(0)}
      </div>
      <div>
        <h3 className="font-bold text-slate-800">{contractor.name}</h3>
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600">{contractor.specialty}</span>
          <span className="text-xs">• {contractor.document}</span>
        </p>
      </div>
    </div>
    <div className="text-right">
      <div className="text-sm text-slate-600 flex items-center justify-end gap-1 mb-1">
        <Phone size={14} /> {contractor.phone}
      </div>
      <button className="text-xs font-medium text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">
        Ver Contratos →
      </button>
    </div>
  </div>
);

const MeasurementRow: React.FC<{ measurement: Measurement }> = ({ measurement }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-full ${
          measurement.status === 'PAID' ? 'bg-green-100 text-green-600' :
          measurement.status === 'APPROVED' ? 'bg-blue-100 text-blue-600' :
          'bg-yellow-100 text-yellow-600'
        }`}>
          {measurement.status === 'PAID' ? <CheckCircle size={16} /> :
           measurement.status === 'APPROVED' ? <CheckCircle size={16} /> :
           <Clock size={16} />}
        </div>
        <div>
          <p className="font-medium text-slate-700">Medição {new Date(measurement.periodEnd).toLocaleDateString()}</p>
          <p className="text-xs text-slate-500">
            {new Date(measurement.periodStart).toLocaleDateString()} - {new Date(measurement.periodEnd).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono font-medium text-slate-800">R$ {measurement.value.toLocaleString()}</p>
        <p className="text-xs text-slate-500 uppercase">{measurement.status === 'PENDING' ? 'Pendente' : measurement.status}</p>
      </div>
    </div>
  );
};

const ContractCard: React.FC<{ contract: Contract }> = ({ contract }) => {
  const [expanded, setExpanded] = useState(false);
  const contractor = mockContractors.find(c => c.id === contract.contractorId);
  const project = mockProjects.find(p => p.id === contract.projectId);
  const measurements = mockMeasurements.filter(m => m.contractId === contract.id);
  const totalMeasured = measurements.reduce((acc, m) => acc + m.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      <div 
        className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-slate-800">{contract.title}</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${contract.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {contract.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <User size={14} /> {contractor?.name} 
            <span className="text-slate-300">|</span> 
            <span className="font-medium text-blue-600">{project?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <div className="text-right">
            <p className="text-xs text-slate-400">Valor Contrato</p>
            <p className="font-mono font-medium text-slate-700">R$ {contract.totalValue.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Executado</p>
            <p className="font-mono font-medium text-blue-600">R$ {totalMeasured.toLocaleString()}</p>
          </div>
          <ChevronDown size={20} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-5 bg-slate-50/50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Medições Realizadas</h4>
            <button className="text-sm bg-white border border-gray-300 text-slate-600 px-3 py-1.5 rounded-lg hover:text-blue-600 hover:border-blue-300 flex items-center gap-2 shadow-sm">
              <Plus size={14} /> Nova Medição
            </button>
          </div>
          <div className="space-y-2">
            {measurements.length > 0 ? (
              measurements.map(m => <MeasurementRow key={m.id} measurement={m} />)
            ) : (
              <p className="text-sm text-slate-400 italic">Nenhuma medição registrada.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const Contractors = () => {
  const [activeTab, setActiveTab] = useState<'CONTRACTS' | 'DIRECTORY'>('CONTRACTS');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Empreiteiros e Medições</h1>
          <p className="text-sm text-slate-500">Gestão de contratos de mão de obra e pagamentos por produção.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-sm">
          <Plus size={18} /> Novo Contrato
        </button>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('CONTRACTS')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'CONTRACTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Contratos Ativos
        </button>
        <button 
          onClick={() => setActiveTab('DIRECTORY')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'DIRECTORY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Diretório de Prestadores
        </button>
      </div>

      {activeTab === 'CONTRACTS' ? (
        <div className="space-y-4">
           {mockContracts.map(c => <ContractCard key={c.id} contract={c} />)}
        </div>
      ) : (
        <div>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar empreiteiro..." 
              className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockContractors.map(c => <ContractorCard key={c.id} contractor={c} />)}
          </div>
        </div>
      )}
    </div>
  );
};