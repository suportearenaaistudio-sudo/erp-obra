import { SupabaseClient } from '@supabase/supabase-js';
import { AppError, ErrorCode } from '../../shared/errors/errors';
import { Logger } from '../../shared/logging/logger';

export abstract class BaseTenantRepository<T> {
    protected logger: Logger;

    constructor(
        protected readonly client: SupabaseClient,
        protected readonly tenantId: string,
        protected readonly tableName: string,
        context: string
    ) {
        this.logger = new Logger(context);
        if (!tenantId) {
            throw new AppError(
                ErrorCode.INTERNAL_ERROR,
                'TenantId is required for TenantRepository'
            );
        }
    }

    /**
     * Base query that enforces tenant_id
     */
    protected get baseQuery() {
        return this.client.from(this.tableName).select('*').eq('tenant_id', this.tenantId);
    }

    async findById(id: string): Promise<T | null> {
        const { data, error } = await this.baseQuery.eq('id', id).single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            this.logger.error(`Error finding ${this.tableName} by id`, error);
            throw new AppError(ErrorCode.INTERNAL_ERROR, 'Database error');
        }

        return data as T;
    }

    async create(data: Partial<T>): Promise<T> {
        const { data: created, error } = await this.client
            .from(this.tableName)
            .insert({ ...data, tenant_id: this.tenantId })
            .select()
            .single();

        if (error) {
            this.logger.error(`Error creating ${this.tableName}`, error);
            throw new AppError(ErrorCode.INTERNAL_ERROR, 'Database error');
        }

        return created as T;
    }

    async update(id: string, data: Partial<T>): Promise<T> {
        const { data: updated, error } = await this.client
            .from(this.tableName)
            .update(data)
            .eq('id', id)
            .eq('tenant_id', this.tenantId) // Double check tenant_id
            .select()
            .single();

        if (error) {
            this.logger.error(`Error updating ${this.tableName}`, error);
            throw new AppError(ErrorCode.INTERNAL_ERROR, 'Database error');
        }

        return updated as T;
    }

    async delete(id: string): Promise<void> {
        const { error } = await this.client
            .from(this.tableName)
            .delete()
            .eq('id', id)
            .eq('tenant_id', this.tenantId);

        if (error) {
            this.logger.error(`Error deleting ${this.tableName}`, error);
            throw new AppError(ErrorCode.INTERNAL_ERROR, 'Database error');
        }
    }
}
