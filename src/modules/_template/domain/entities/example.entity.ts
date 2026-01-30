/**
 * Example Domain Entity
 * 
 * Entities are objects with identity that persist over time.
 * They contain business logic and enforce invariants.
 */

export interface ExampleEntity {
    id: string;
    tenantId: string;
    name: string;
    status: 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy?: string;
}

/**
 * Example factory function for creating a new entity
 */
export function createExampleEntity(
    data: Omit<ExampleEntity, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Omit<ExampleEntity, 'id'> {
    return {
        ...data,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

/**
 * Example business rule validation
 */
export function canArchiveEntity(entity: ExampleEntity): boolean {
    return entity.status !== 'archived';
}
