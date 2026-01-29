import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Bell, 
  Sparkles,
  Menu,
  X,
  Building2,
  HardHat,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  LogOut,
  ChevronRight,
  UserCog
} from 'lucide-react';

// Componente de Item da Sidebar
const SidebarItem = ({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick: () => void }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`
    }
  >
    <Icon size={20} className="stroke-[1.5]" />
    <span className="font-medium text-sm tracking-wide">{label}</span>
    <ChevronRight size={16} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
  </NavLink>
);

// Componente de Atalho Rápido na Barra Flutuante
const QuickAction = ({ to, icon: Icon, tooltip }: { to: string; icon: any; tooltip: string }) => (
  <NavLink 
    to={to}
    className={({ isActive }) => `
      relative p-2.5 rounded-xl transition-all duration-300 group
      ${isActive 
        ? 'bg-blue-100 text-blue-700 shadow-inner' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:-translate-y-0.5'
      }
    `}
  >
    <Icon size={20} strokeWidth={2} />
    {/* Tooltip */}
    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
      {tooltip}
    </span>
  </NavLink>
);

export const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Fecha sidebar ao mudar de rota
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  // Efeito de scroll para a barra
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-600 selection:bg-blue-200 selection:text-blue-900">
      
      {/* --- OVERLAY BACKDROP (Quando Sidebar Aberta) --- */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* --- SIDEBAR COMPLETA (Drawer) --- */}
      <aside 
        className={`
          fixed top-0 left-0 bottom-0 w-80 bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/30">
                <Building2 className="text-white" size={24} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-lg leading-none">Obra360</h2>
                <p className="text-xs text-slate-400 mt-1">Enterprise ERP</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sidebar Menu */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            
            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Principal</p>
              <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard Geral" onClick={() => {}} />
              <SidebarItem to="/projects" icon={HardHat} label="Gestão de Obras" onClick={() => {}} />
              <SidebarItem to="/crm" icon={Users} label="CRM & Vendas" onClick={() => {}} />
            </div>

            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Operacional</p>
              <SidebarItem to="/contractors" icon={UserCog} label="Empreiteiros & Contratos" onClick={() => {}} />
              <SidebarItem to="/inventory" icon={Package} label="Estoque Global" onClick={() => {}} />
              <SidebarItem to="/procurement" icon={ShoppingCart} label="Suprimentos" onClick={() => {}} />
            </div>

            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Financeiro</p>
              <SidebarItem to="/finance" icon={DollarSign} label="Financeiro" onClick={() => {}} />
            </div>

            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Inteligência</p>
              <SidebarItem to="/ai-assistant" icon={Sparkles} label="Assistente IA" onClick={() => {}} />
            </div>

          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white text-slate-500 hover:text-slate-800 hover:shadow-sm transition-all text-sm font-medium">
              <Settings size={18} /> Configurações
            </button>
            <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all text-sm font-medium mt-1">
              <LogOut size={18} /> Sair do Sistema
            </button>
          </div>
        </div>
      </aside>


      {/* --- FLOATING NAVBAR (Dynamic Island) --- */}
      <header className="fixed top-0 left-0 right-0 z-40 pointer-events-none flex justify-center pt-6 px-4">
        <div 
          className={`
            pointer-events-auto
            w-full max-w-5xl
            bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60
            border border-white/40 shadow-xl shadow-slate-200/50
            rounded-2xl
            flex items-center justify-between
            py-2 px-3 md:px-4
            transition-all duration-500 ease-out
            ${scrolled ? 'scale-[0.98] py-2' : 'scale-100'}
          `}
        >
          
          {/* Left: Menu Trigger & Brand Icon */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors active:scale-95"
              aria-label="Abrir Menu"
            >
              <Menu size={22} />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-2 text-slate-800">
               <span className="font-bold tracking-tight">Obra360</span>
            </div>
          </div>

          {/* Center: Quick Access Shortcuts (Funções mais usadas) */}
          <nav className="flex items-center gap-1 md:gap-2">
            <QuickAction to="/" icon={LayoutDashboard} tooltip="Dashboard" />
            <QuickAction to="/projects" icon={HardHat} tooltip="Obras" />
            <QuickAction to="/crm" icon={Users} tooltip="CRM" />
            
            {/* Divider */}
            <div className="h-5 w-px bg-slate-200 mx-2"></div>
            
            <NavLink 
              to="/ai-assistant"
              className={({ isActive }) => `
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700' 
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100'}
              `}
            >
              <Sparkles size={16} />
              <span className="hidden md:inline">Ask AI</span>
            </NavLink>
          </nav>

          {/* Right: Search & Profile */}
          <div className="flex items-center gap-2 md:gap-4 pl-2">
            
            {/* Search Button */}
            <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
              <Search size={20} />
            </button>

            {/* Notification */}
            <button className="relative p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>

            {/* Profile Avatar */}
            <div className="pl-2 border-l border-slate-200 hidden sm:block">
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="text-right hidden lg:block">
                  <p className="text-xs font-bold text-slate-700">Eng. Silva</p>
                  <p className="text-[10px] text-slate-400">Admin</p>
                </div>
                <img 
                  src="https://ui-avatars.com/api/?name=Engineer+Silva&background=0D8ABC&color=fff" 
                  alt="Profile" 
                  className="w-9 h-9 rounded-full border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-blue-200 transition-all"
                />
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      {/* Adicionado padding-top significativo para compensar a navbar flutuante */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-32 pb-10 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
};