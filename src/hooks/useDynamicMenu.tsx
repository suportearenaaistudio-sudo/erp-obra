/**
 * useDynamicMenu Hook
 * 
 * Filters menu items based on user features and permissions
 */

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from './useFeatureFlags';
import { MENU_CONFIG, MenuItem } from '../config/menu.config';

export function useDynamicMenu() {
    const { user } = useAuth();
    const { hasFeature } = useFeatureFlags();

    /**
     * Check if user has permission
     */
    const hasPermission = (permission?: string): boolean => {
        if (!permission) return true;
        if (!user || !user.permissions) return false;

        // Check for wildcard permission
        if (user.permissions.includes('*')) return true;

        return user.permissions.includes(permission);
    };

    /**
     * Filter menu item based on feature and permission
     */
    const canShowMenuItem = (item: MenuItem): boolean => {
        // Check feature flag
        if (item.feature && !hasFeature(item.feature)) {
            return false;
        }

        // Check permission
        if (item.permission && !hasPermission(item.permission)) {
            return false;
        }

        return true;
    };

    /**
     * Filter menu items recursively
     */
    const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
        return items
            .filter(canShowMenuItem)
            .map(item => {
                if (item.children) {
                    const filteredChildren = filterMenuItems(item.children);
                    // Only show parent if it has visible children or has its own path
                    if (filteredChildren.length > 0 || !item.children) {
                        return { ...item, children: filteredChildren };
                    }
                    return null;
                }
                return item;
            })
            .filter((item): item is MenuItem => item !== null);
    };

    /**
     * Get filtered menu
     */
    const menu = useMemo(() => {
        return filterMenuItems(MENU_CONFIG);
    }, [user, user?.features, user?.permissions]);

    return {
        menu,
        hasFeature,
        hasPermission,
        canShowMenuItem,
    };
}
