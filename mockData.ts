import { Project, Client, Material, FinancialRecord, ProcurementOrder, Deal, Contractor, Contract, Measurement } from './types';

export const mockClients: Client[] = [
  { id: 'c1', name: 'Construtora Horizonte', company: 'Horizonte Inc', email: 'contato@horizonte.com', phone: '(11) 9999-9999', status: 'ACTIVE' },
  { id: 'c2', name: 'Roberto Silva', company: 'Particular', email: 'beto@gmail.com', phone: '(21) 8888-8888', status: 'NEGOTIATION' },
  { id: 'c3', name: 'Grupo Vitta', company: 'Vitta Residencial', email: 'compras@vitta.com', phone: '(16) 3333-2222', status: 'LEAD' },
];

export const mockDeals: Deal[] = [
  { id: 'd1', clientId: 'c3', title: 'Residencial Vitta II', value: 1500000, stage: 'PROPOSAL', probability: 60, expectedCloseDate: '2024-03-15' },
  { id: 'd2', clientId: 'c2', title: 'Reforma Cobertura', value: 80000, stage: 'NEGOTIATION', probability: 80, expectedCloseDate: '2024-02-28' },
  { id: 'd3', clientId: 'c1', title: 'Anexo Escritório', value: 45000, stage: 'QUALIFICATION', probability: 30, expectedCloseDate: '2024-04-10' },
];

export const mockMaterials: Material[] = [
  { id: 'm1', sku: 'CIM-001', name: 'Cimento CP II - 50kg', unit: 'sac', category: 'Civil', minStock: 50, currentStock: 32, avgCost: 28.50, reserved: 40 },
  { id: 'm2', sku: 'ARE-002', name: 'Areia Média', unit: 'm3', category: 'Civil', minStock: 10, currentStock: 15, avgCost: 120.00, reserved: 5 },
  { id: 'm3', sku: 'TOL-003', name: 'Tijolo 6 Furos', unit: 'mil', category: 'Civil', minStock: 2, currentStock: 5, avgCost: 650.00, reserved: 1 },
  { id: 'm4', sku: 'FER-004', name: 'Vergalhão 3/8"', unit: 'bar', category: 'Estrutura', minStock: 100, currentStock: 80, avgCost: 45.00, reserved: 60 },
  { id: 'm5', sku: 'PIS-005', name: 'Porcelanato 60x60', unit: 'm2', category: 'Acabamento', minStock: 50, currentStock: 120, avgCost: 89.90, reserved: 100 },
];

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Edifício Solar',
    clientId: 'c1',
    address: 'Av. Paulista, 1000',
    status: 'ACTIVE',
    startDate: '2023-10-01',
    budgetTotal: 500000,
    spentTotal: 125000,
    phases: [
      {
        id: 'ph1',
        name: 'Fundação',
        startDate: '2023-10-01',
        endDate: '2023-11-15',
        status: 'COMPLETED',
        budgetItems: [
          { id: 'bi1', description: 'Concretagem Sapatas', unit: 'vb', quantity: 1, unitPrice: 15000, total: 15000, category: 'MATERIAL' }
        ]
      },
      {
        id: 'ph2',
        name: 'Alvenaria - 1º Pav',
        startDate: '2023-11-20',
        endDate: '2024-01-10',
        status: 'IN_PROGRESS',
        budgetItems: [
          { id: 'bi2', description: 'Levantamento de Paredes', unit: 'm2', quantity: 500, unitPrice: 40, total: 20000, category: 'LABOR' }
        ]
      }
    ]
  },
  {
    id: 'p2',
    name: 'Reforma Residencial Morumbi',
    clientId: 'c2',
    address: 'Rua das Flores, 50',
    status: 'PLANNING',
    startDate: '2024-02-01',
    budgetTotal: 150000,
    spentTotal: 0,
    phases: [
       {
        id: 'ph3',
        name: 'Demolição',
        startDate: '2024-02-01',
        endDate: '2024-02-10',
        status: 'PENDING',
        budgetItems: []
      }
    ]
  }
];

export const mockFinancials: FinancialRecord[] = [
  { id: 'f1', type: 'AP', projectId: 'p1', description: 'Compra de Cimento - NF 5021', amount: 4500, dueDate: '2023-12-05', status: 'PAID', category: 'Materiais' },
  { id: 'f2', type: 'AP', projectId: 'p1', description: 'Empreiteira Silva - Medição 01', amount: 12000, dueDate: '2024-01-05', status: 'PENDING', category: 'Mão de Obra' },
  { id: 'f3', type: 'AR', projectId: 'p1', description: 'Medição Cliente - 1ª Parcela', amount: 50000, dueDate: '2023-11-01', status: 'PAID', category: 'Vendas' },
  { id: 'f4', type: 'AP', projectId: 'p1', description: 'Aluguel Betoneira', amount: 800, dueDate: '2024-01-15', status: 'OVERDUE', category: 'Equipamentos' },
];

export const mockOrders: ProcurementOrder[] = [
  { 
    id: 'po1', 
    code: 'PO-2023-001',
    projectId: 'p1', 
    supplier: 'Cimento & Cia',
    items: [{ materialId: 'm1', qty: 100, unitPrice: 28.50 }], 
    status: 'RECEIVED', 
    totalEstimated: 2850, 
    createdDate: '2023-11-10' 
  },
  { 
    id: 'po2', 
    code: 'PO-2024-045',
    projectId: 'p1', 
    supplier: 'Aço Forte Ltda',
    items: [{ materialId: 'm4', qty: 50, unitPrice: 45.00 }], 
    status: 'ORDERED', 
    totalEstimated: 2250, 
    createdDate: '2024-01-02',
    deliveryDate: '2024-01-20'
  },
  { 
    id: 'po3', 
    code: 'PO-2024-052',
    projectId: 'p2', 
    supplier: 'Depósito Central',
    items: [{ materialId: 'm3', qty: 2, unitPrice: 650.00 }], 
    status: 'REQUESTED', 
    totalEstimated: 1300, 
    createdDate: '2024-02-05' 
  },
];

export const mockContractors: Contractor[] = [
  { id: 'ct1', name: 'Empreiteira Silva & Filhos', specialty: 'Alvenaria/Estrutura', email: 'silva@obras.com', phone: '(11) 98765-4321', document: '12.345.678/0001-90', status: 'ACTIVE' },
  { id: 'ct2', name: 'João Eletricista', specialty: 'Elétrica', email: 'joao@eletrica.com', phone: '(11) 91234-5678', document: '123.456.789-00', status: 'ACTIVE' },
];

export const mockContracts: Contract[] = [
  { id: 'ctr1', contractorId: 'ct1', projectId: 'p1', title: 'Execução de Alvenaria Torre A', totalValue: 45000, startDate: '2023-11-01', endDate: '2024-02-28', status: 'ACTIVE' },
];

export const mockMeasurements: Measurement[] = [
  { id: 'm1', contractId: 'ctr1', periodStart: '2023-11-01', periodEnd: '2023-11-30', value: 12000, status: 'PAID', approvedDate: '2023-12-05' },
  { id: 'm2', contractId: 'ctr1', periodStart: '2023-12-01', periodEnd: '2023-12-31', value: 15000, status: 'PENDING' },
];