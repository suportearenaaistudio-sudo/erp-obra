/**
 * AI Tools - Types and Interfaces
 */

/**
 * Context passed to every tool handler
 * Contains authentication and authorization info
 */
export interface ToolContext {
    tenantId: string;
    userId: string;
    permissions: string[];
    userEmail: string;
    userName: string;
}

/**
 * Result of a tool execution
 */
export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * Tool Handler Interface
 */
import { FeatureKeys } from '@/lib/constants/features';

/**
 * Tool Handler Interface
 */
export interface ToolHandler {
    /**
     * Permission required to execute this tool
     * If user doesn't have this permission, tool returns error
     */
    requiredPermission?: string;

    /**
     * Feature required to execute this tool (e.g. FeatureKeys.FINANCE)
     */
    requiredFeature?: FeatureKeys;

    /**
     * Execute the tool with given arguments and context
     */
    execute: (args: Record<string, any>, context: ToolContext) => Promise<any>;
}

/**
 * Tool Registry
 * Maps tool name to handler
 */
export type ToolRegistry = Record<string, ToolHandler>;
