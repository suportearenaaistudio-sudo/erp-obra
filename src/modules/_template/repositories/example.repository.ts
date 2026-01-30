import { ExampleEntity } from '../domain/entities/example.entity';

/**
 * Repository Interface
 * 
 * Define contracts for data access without implementation details.
 * This enables dependency inversion and makes testing easier.
 */
export interface IExampleRepository {
    /**
     * Find entity by ID within a tenant
     */
    findById(tenantId: string, id: string): Promise<ExampleEntity | null>;

    /**
     * Find all entities for a tenant with optional filters
     */
    findAll(tenantId: string, filters?: {
        status?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<ExampleEntity[]>;

    /**
     * Count entities for a tenant
     */
    count(tenantId: string, filters?: { status?: string }): Promise<number>;

    /**
     * Create a new entity
     */
    create(tenantId: string, entity: Omit<ExampleEntity, 'id' | 'tenantId'>): Promise<ExampleEntity>;

    /**
     * Update an existing entity
     */
    update(tenantId: string, id: string, data: Partial<ExampleEntity>): Promise<ExampleEntity | null>;

    /**
     * Delete an entity (soft delete recommended)
     */
    delete(tenantId: string, id: string): Promise<boolean>;
}
