/**
 * Module Registry (Implemented ✅)
 * 
 * This serves as a centralized registry for all modules,
 * making it easy to enable/disable modules and configure their routes, permissions, and features.
 * 
 * Use this registry to:
 * - Track all available modules
 * - Link feature flags to modules
 * - Define required permissions per module
 * - Manage module dependencies
 */

import { FeatureKeys } from '../shared/constants/features';

export interface ModuleDefinition {
    name: string;
    featureKey: FeatureKeys;
    description: string;
    version: string;
    routes: string[];
    permissions: string[];
    dependencies?: FeatureKeys[];
    isCore: boolean;
}

/**
 * Module Registry
 * 
 * Register all modules here. This enables:
 * - Dynamic module loading
 * - Feature flag integration
 * - Permission management
 * - Dependency resolution
 */
export const ModuleRegistry: Record<string, ModuleDefinition> = {
    crm: {
        name: 'CRM',
        featureKey: FeatureKeys.CRM,
        description: 'Customer Relationship Management',
        version: '1.0.0',
        routes: ['/tenant/customers', '/tenant/leads', '/tenant/proposals'],
        permissions: ['CUSTOMER_VIEW', 'CUSTOMER_CREATE', 'LEAD_MANAGE'],
        isCore: false,
    },

    works: {
        name: 'Works',
        featureKey: FeatureKeys.PROJECTS,
        description: 'Construction Project Management',
        version: '1.0.0',
        routes: ['/tenant/works', '/tenant/work-phases', '/tenant/work-tasks'],
        permissions: ['WORK_VIEW', 'WORK_CREATE', 'WORK_PHASE_MANAGE'],
        isCore: true,
    },

    inventory: {
        name: 'Inventory',
        featureKey: FeatureKeys.INVENTORY,
        description: 'Materials and Stock Management',
        version: '1.0.0',
        routes: ['/tenant/materials', '/tenant/stock', '/tenant/warehouses'],
        permissions: ['MATERIAL_VIEW', 'STOCK_VIEW', 'STOCK_ADJUST'],
        isCore: false,
    },

    procurement: {
        name: 'Procurement',
        featureKey: FeatureKeys.PROCUREMENT,
        description: 'Purchasing and Supplier Management',
        version: '1.0.0',
        routes: ['/tenant/suppliers', '/tenant/purchase-orders', '/tenant/purchase-requests'],
        permissions: ['SUPPLIER_VIEW', 'PURCHASE_ORDER_CREATE', 'PURCHASE_REQUEST_APPROVE'],
        dependencies: [FeatureKeys.INVENTORY],
        isCore: false,
    },

    finance: {
        name: 'Finance',
        featureKey: FeatureKeys.FINANCE,
        description: 'Financial Management and Accounting',
        version: '1.0.0',
        routes: ['/tenant/invoices', '/tenant/payments', '/tenant/accounts'],
        permissions: ['INVOICE_VIEW', 'PAYMENT_CREATE', 'FINANCIAL_REPORT_VIEW'],
        isCore: true,
    },

    ai: {
        name: 'AI Assistant',
        featureKey: FeatureKeys.AI_CHAT,
        description: 'AI-powered features and intelligent assistance',
        version: '1.0.0',
        routes: ['/tenant/ai/chat', '/tenant/ai/analyze'],
        permissions: ['AI_CHAT_USE', 'AI_DOCUMENT_ANALYZE'],
        isCore: false,
    },
};

/**
 * Get module by feature key
 */
export function getModuleByFeature(featureKey: FeatureKeys): ModuleDefinition | undefined {
    return Object.values(ModuleRegistry).find(m => m.featureKey === featureKey);
}

/**
 * Get all core modules
 */
export function getCoreModules(): ModuleDefinition[] {
    return Object.values(ModuleRegistry).filter(m => m.isCore);
}

/**
 * Get all optional modules
 */
export function getOptionalModules(): ModuleDefinition[] {
    return Object.values(ModuleRegistry).filter(m => !m.isCore);
}

/**
 * Check if a module's dependencies are satisfied
 */
export function areDependenciesSatisfied(
    module: ModuleDefinition,
    enabledFeatures: FeatureKeys[]
): boolean {
    if (!module.dependencies) return true;
    return module.dependencies.every(dep => enabledFeatures.includes(dep));
}
