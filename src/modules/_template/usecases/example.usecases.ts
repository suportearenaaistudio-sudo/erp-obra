import { IExampleRepository } from '../repositories/example.repository';
import { ExampleEntity, canArchiveEntity } from '../domain/entities/example.entity';
import { AppError, ErrorCode } from '../../../shared/errors/errors';

/**
 * Use Case: Create Example Entity
 * 
 * Business logic for creating a new entity with validation and business rules.
 */
export class CreateExampleUseCase {
    constructor(private readonly repository: IExampleRepository) { }

    async execute(
        tenantId: string,
        data: {
            name: string;
            createdBy: string;
        }
    ): Promise<ExampleEntity> {
        // Business validation
        if (!data.name || data.name.trim().length < 3) {
            throw new AppError(
                ErrorCode.VALIDATION_ERROR,
                'Name must be at least 3 characters',
                400
            );
        }

        // Check for duplicates (example business rule)
        const existing = await this.repository.findAll(tenantId, {
            search: data.name,
            limit: 1,
        });

        if (existing.length > 0 && existing[0].name.toLowerCase() === data.name.toLowerCase()) {
            throw new AppError(
                ErrorCode.VALIDATION_ERROR,
                'An entity with this name already exists',
                400
            );
        }

        // Create entity
        const entity = await this.repository.create(tenantId, {
            name: data.name.trim(),
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: data.createdBy,
        });

        return entity;
    }
}

/**
 * Use Case: Archive Example Entity
 * 
 * Business logic for archiving an entity with validation.
 */
export class ArchiveExampleUseCase {
    constructor(private readonly repository: IExampleRepository) { }

    async execute(
        tenantId: string,
        entityId: string,
        userId: string
    ): Promise<ExampleEntity> {
        // Find entity
        const entity = await this.repository.findById(tenantId, entityId);
        if (!entity) {
            throw new AppError(ErrorCode.NOT_FOUND, 'Entity not found', 404);
        }

        // Business rule validation
        if (!canArchiveEntity(entity)) {
            throw new AppError(
                ErrorCode.VALIDATION_ERROR,
                'Entity is already archived',
                400
            );
        }

        // Archive
        const archived = await this.repository.update(tenantId, entityId, {
            status: 'archived',
            updatedBy: userId,
            updatedAt: new Date(),
        });

        if (!archived) {
            throw new AppError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to archive entity',
                500
            );
        }

        return archived;
    }
}
