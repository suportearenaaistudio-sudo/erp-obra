import { SupabaseClient } from '@supabase/supabase-js';
import { BaseTenantRepository } from '../../../../infra/db/repositories/base.repository';
import { IExampleRepository } from '../../repositories/example.repository';
import { ExampleEntity } from '../../domain/entities/example.entity';

/**
 * Supabase implementation of ExampleRepository
 * 
 * IMPORTANT: 
 * - Extends BaseTenantRepository for multi-tenant safety
 * - All queries MUST include tenantId filter
 * - Use RLS policies for additional security layer
 */
export class SupabaseExampleRepository extends BaseTenantRepository implements IExampleRepository {
    private readonly tableName = 'example_entities'; // Change to your table name

    constructor(supabase: SupabaseClient) {
        super(supabase);
    }

    async findById(tenantId: string, id: string): Promise<ExampleEntity | null> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error finding entity:', error);
            return null;
        }

        return this.mapToEntity(data);
    }

    async findAll(
        tenantId: string,
        filters?: {
            status?: string;
            search?: string;
            limit?: number;
            offset?: number;
        }
    ): Promise<ExampleEntity[]> {
        let query = this.supabase
            .from(this.tableName)
            .select('*')
            .eq('tenant_id', tenantId);

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (filters?.search) {
            query = query.ilike('name', `%${filters.search}%`);
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        if (filters?.offset) {
            query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error finding entities:', error);
            return [];
        }

        return (data || []).map(this.mapToEntity);
    }

    async count(tenantId: string, filters?: { status?: string }): Promise<number> {
        let query = this.supabase
            .from(this.tableName)
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        const { count, error } = await query;

        if (error) {
            console.error('Error counting entities:', error);
            return 0;
        }

        return count || 0;
    }

    async create(
        tenantId: string,
        entity: Omit<ExampleEntity, 'id' | 'tenantId'>
    ): Promise<ExampleEntity> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert({
                tenant_id: tenantId,
                ...entity,
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create entity: ${error.message}`);
        }

        return this.mapToEntity(data);
    }

    async update(
        tenantId: string,
        id: string,
        updates: Partial<ExampleEntity>
    ): Promise<ExampleEntity | null> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('tenant_id', tenantId)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating entity:', error);
            return null;
        }

        return this.mapToEntity(data);
    }

    async delete(tenantId: string, id: string): Promise<boolean> {
        // Soft delete (recommended)
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ status: 'archived', updated_at: new Date().toISOString() })
            .eq('tenant_id', tenantId)
            .eq('id', id);

        // Hard delete (use with caution)
        // const { error } = await this.supabase
        //     .from(this.tableName)
        //     .delete()
        //     .eq('tenant_id', tenantId)
        //     .eq('id', id);

        if (error) {
            console.error('Error deleting entity:', error);
            return false;
        }

        return true;
    }

    /**
     * Map database row to domain entity
     */
    private mapToEntity(row: any): ExampleEntity {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            createdBy: row.created_by,
            updatedBy: row.updated_by,
        };
    }
}
