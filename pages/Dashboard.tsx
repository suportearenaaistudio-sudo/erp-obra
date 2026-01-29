import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { mockProjects, mockFinancials } from '../mockData';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const KpiCard = ({ title, value, subtext, color }: { title: string; value: string; subtext: string; color: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
    <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wide">{title}</h3>
    <div className="mt-4">
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      <p className="text-slate-400 text-xs mt-1">{subtext}</p>
    </div>
  </div>
);

export const Dashboard = () => {
  // Calculations
  const activeProjects = mockProjects.filter(p => p.status === 'ACTIVE').length;
  const totalBudget = mockProjects.reduce((acc, p) => acc + p.budgetTotal, 0);
  const totalSpent = mockProjects.reduce((acc, p) => acc + p.spentTotal, 0);
  const pendingAP = mockFinancials
    .filter(f => f.type === 'AP' && f.status === 'PENDING')
    .reduce((acc, f) => acc + f.amount, 0);

  const data = [
    { name: 'Orçado', amount: totalBudget },
    { name: 'Realizado', amount: totalSpent },
  ];

  const cashFlowData = [
    { name: 'Out', Receita: 40000, Despesa: 24000 },
    { name: 'Nov', Receita: 30000, Despesa: 13980 },
    { name: 'Dez', Receita: 20000, Despesa: 48000 }, // Negative cashflow example
    { name: 'Jan', Receita: 27800, Despesa: 39080 },
    { name: 'Fev', Receita: 18900, Despesa: 4800 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Obras Ativas" 
          value={activeProjects.toString()} 
          subtext="2 em planejamento" 
          color="text-blue-600"
        />
        <KpiCard 
          title="Contas a Pagar (Pend.)" 
          value={`R$ ${pendingAP.toLocaleString()}`} 
          subtext="Vencimento próximos 7 dias" 
          color="text-red-500"
        />
        <KpiCard 
          title="Execução Financeira" 
          value={`${((totalSpent / totalBudget) * 100).toFixed(1)}%`} 
          subtext="Média global de avanço" 
          color="text-emerald-500"
        />
        <KpiCard 
          title="Rupturas Previstas" 
          value="3" 
          subtext="Materiais críticos para próxima fase" 
          color="text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Fluxo de Caixa (Real vs Projetado)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="Receita" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesa" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Orçado x Realizado Global</h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="amount"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3B82F6' : '#6366F1'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
