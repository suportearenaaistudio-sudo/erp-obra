/**
 * Dynamic Menu Configuration
 * 
 * This file defines the dynamic menu structure based on features and permissions
 */

import { FeatureKeys } from '../shared/constants/features';

export interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    path: string;
    feature?: FeatureKeys | string;
    permission?: string;
    children?: MenuItem[];
}

/**
 * Main menu configuration
 * Items are shown/hidden based on feature flags and permissions
 */
export const MENU_CONFIG: MenuItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        path: '/',
    },
    {
        id: 'projects',
        label: 'Projetos',
        icon: 'Building2',
        path: '/projects',
        feature: FeatureKeys.PROJECTS,
        permission: 'WORK_VIEW',
        children: [
            {
                id: 'projects-list',
                label: 'Listar Obras',
                path: '/projects',
                permission: 'WORK_VIEW',
            },
            {
                id: 'projects-create',
                label: 'Nova Obra',
                path: '/projects/new',
                permission: 'WORK_CREATE',
            },
        ],
    },
    {
        id: 'crm',
        label: 'CRM',
        icon: 'Users',
        path: '/crm',
        feature: FeatureKeys.CRM,
        permission: 'CUSTOMER_VIEW',
        children: [
            {
                id: 'customers',
                label: 'Clientes',
                path: '/crm/customers',
                permission: 'CUSTOMER_VIEW',
            },
            {
                id: 'leads',
                label: 'Leads',
                path: '/crm/leads',
                permission: 'CUSTOMER_VIEW',
            },
        ],
    },
    {
        id: 'inventory',
        label: 'Estoque',
        icon: 'Package',
        path: '/inventory',
        feature: FeatureKeys.INVENTORY,
        permission: 'INVENTORY_VIEW',
    },
    {
        id: 'procurement',
        label: 'Compras',
        icon: 'ShoppingCart',
        path: '/procurement',
        feature: FeatureKeys.PROCUREMENT,
        permission: 'PURCHASE_VIEW',
    },
    {
        id: 'finance',
        label: 'Financeiro',
        icon: 'DollarSign',
        path: '/finance',
        feature: FeatureKeys.FINANCE,
        permission: 'FINANCE_VIEW',
        children: [
            {
                id: 'finance-dashboard',
                label: 'Visão Geral',
                path: '/finance',
                permission: 'FINANCE_VIEW',
            },
            {
                id: 'invoices',
                label: 'Faturas',
                path: '/finance/invoices',
                permission: 'FINANCE_VIEW',
            },
            {
                id: 'payments',
                label: 'Pagamentos',
                path: '/finance/payments',
                permission: 'FINANCE_VIEW',
            },
        ],
    },
    {
        id: 'contractors',
        label: 'Prestadores',
        icon: 'HardHat',
        path: '/contractors',
        feature: FeatureKeys.CONTRACTORS,
        permission: 'CONTRACTOR_VIEW',
    },
    {
        id: 'ai',
        label: 'Assistente IA',
        icon: 'Bot',
        path: '/ai-chat',
        feature: FeatureKeys.AI_CHAT,
    },
    {
        id: 'settings',
        label: 'Configurações',
        icon: 'Settings',
        path: '/settings',
        children: [
            {
                id: 'users',
                label: 'Usuários',
                path: '/settings/users',
                permission: 'USER_MANAGE',
            },
            {
                id: 'roles',
                label: 'Perfis',
                path: '/settings/roles',
                permission: 'ROLE_MANAGE',
            },
            {
                id: 'profile',
                label: 'Meu Perfil',
                path: '/settings/profile',
            },
        ],
    },
];

/**
 * Dev Admin menu
 */
export const DEV_ADMIN_MENU: MenuItem[] = [
    {
        id: 'admin-dashboard',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        path: '/dev-admin',
    },
    {
        id: 'admin-tenants',
        label: 'Tenants',
        icon: 'Building',
        path: '/dev-admin/tenants',
    },
    {
        id: 'admin-plans',
        label: 'Planos',
        icon: 'CreditCard',
        path: '/dev-admin/plans',
    },
    {
        id: 'admin-features',
        label: 'Features',
        icon: 'Layers',
        path: '/dev-admin/features',
    },
    {
        id: 'admin-support',
        label: 'Suporte',
        icon: 'HeadphonesIcon',
        path: '/dev-admin/support',
    },
    {
        id: 'admin-audit',
        label: 'Auditoria',
        icon: 'FileText',
        path: '/dev-admin/audit',
    },
    {
        id: 'logsafe',
        label: 'LogSafe Security',
        icon: 'ShieldAlert',
        path: '/dev-admin/logsafe',
        children: [
            {
                id: 'logsafe-dashboard',
                label: 'Dashboard',
                path: '/dev-admin/logsafe',
            },
            {
                id: 'logsafe-policies',
                label: 'Políticas',
                path: '/dev-admin/logsafe/policies',
            },
            {
                id: 'logsafe-events',
                label: 'Investigação',
                path: '/dev-admin/logsafe/events',
            },
        ]
    },
];
