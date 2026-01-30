export enum FeatureKeys {
    // Modules
    CRM = 'CRM',
    PROJECTS = 'PROJECTS',
    INVENTORY = 'INVENTORY',
    PROCUREMENT = 'PROCUREMENT',
    FINANCE = 'FINANCE',
    CONTRACTORS = 'CONTRACTORS',

    // Add-ons
    BUDGET_PDF = 'BUDGET_PDF',
    REPORTS_EXPORT = 'REPORTS_EXPORT',
    AI_CHAT = 'AI_CHAT',
    AI_RECEIPT = 'AI_RECEIPT',

    // Beta / Experimental
    MOBILE_APP = 'MOBILE_APP',
    INTEGRATIONS = 'INTEGRATIONS',
}

export const FEATURE_TO_ROUTE: Record<FeatureKeys, string> = {
    [FeatureKeys.CRM]: '/crm',
    [FeatureKeys.PROJECTS]: '/projects',
    [FeatureKeys.INVENTORY]: '/inventory',
    [FeatureKeys.PROCUREMENT]: '/procurement',
    [FeatureKeys.FINANCE]: '/finance',
    [FeatureKeys.CONTRACTORS]: '/contractors',
    [FeatureKeys.BUDGET_PDF]: '', // Action only
    [FeatureKeys.REPORTS_EXPORT]: '', // Action only
    [FeatureKeys.AI_CHAT]: '/ai-assistant',
    [FeatureKeys.AI_RECEIPT]: '', // Component only
    [FeatureKeys.MOBILE_APP]: '',
    [FeatureKeys.INTEGRATIONS]: '/settings/integrations',
};

export const ROUTE_TO_FEATURE: Record<string, FeatureKeys> = Object.entries(FEATURE_TO_ROUTE).reduce(
    (acc, [feature, route]) => {
        if (route) acc[route] = feature as FeatureKeys;
        return acc;
    },
    {} as Record<string, FeatureKeys>
);
