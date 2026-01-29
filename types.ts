export type Role = 'ADMIN' | 'FINANCE' | 'SITE_MANAGER' | 'PURCHASING' | 'SALES';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'LEAD' | 'NEGOTIATION' | 'ACTIVE' | 'ARCHIVED';
}

export interface Deal {
  id: string;
  clientId: string;
  title: string;
  value: number;
  stage: 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  probability: number;
  expectedCloseDate: string;
}

export interface Material {
  id: string;
  sku: string;
  name: string;
  unit: string;
  category: string;
  minStock: number;
  currentStock: number;
  avgCost: number;
  reserved: number; // Reserved for upcoming phases
}

export interface BudgetLineItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'OTHER';
}

export interface ProjectPhase {
  id: string;
  name: string; // e.g., "Fundação", "Estrutura"
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  budgetItems: BudgetLineItem[];
  materialKitId?: string; // Linked material kit
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  address: string;
  status: 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startDate: string;
  phases: ProjectPhase[];
  budgetTotal: number;
  spentTotal: number;
}

export interface FinancialRecord {
  id: string;
  type: 'AP' | 'AR'; // Accounts Payable / Receivable
  projectId?: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  category: string;
}

export interface ProcurementOrder {
  id: string;
  code: string;
  projectId: string;
  supplier: string;
  items: { materialId: string; qty: number; unitPrice: number }[];
  status: 'REQUESTED' | 'QUOTING' | 'APPROVED' | 'ORDERED' | 'RECEIVED';
  totalEstimated: number;
  createdDate: string;
  deliveryDate?: string;
}

export interface Contractor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  document: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Contract {
  id: string;
  contractorId: string;
  projectId: string;
  title: string;
  totalValue: number;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
}

export interface Measurement {
  id: string;
  contractId: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  status: 'PENDING' | 'APPROVED' | 'PAID';
  approvedDate?: string;
}