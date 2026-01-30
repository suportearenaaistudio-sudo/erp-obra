import { Request, Response } from 'express'; // or your framework
import { CreateExampleUseCase, ArchiveExampleUseCase } from '../../usecases/example.usecases';
import { CreateExampleDto, UpdateExampleDto, ListExampleDto, ExampleIdDto } from '../../dto/example.dto';
import { RequestContext } from '../../../../shared/types/context';
import { AppError, ErrorCode, errorResponse } from '../../../../shared/errors/errors';
import { validate } from '../../../../shared/validation/validation';

/**
 * Example API Handlers
 * 
 * These handlers validate input, call use cases, and format responses.
 * They should be thin - business logic belongs in use cases.
 */

export class ExampleHandlers {
    constructor(
        private readonly createUseCase: CreateExampleUseCase,
        private readonly archiveUseCase: ArchiveExampleUseCase
    ) { }

    /**
     * GET /tenant/examples
     * List all examples for the current tenant
     */
    async list(req: any, res: any, context: RequestContext) {
        try {
            // Validate query params
            const filters = validate(ListExampleDto, {
                status: req.query.status,
                search: req.query.search,
                limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset) : undefined,
            });

            // Get repository from dependency injection
            // const repository = req.container.get('ExampleRepository');
            // const entities = await repository.findAll(context.tenantId!, filters);

            // For now, return mock response
            return res.json({
                data: [],
                total: 0,
                limit: filters.limit,
                offset: filters.offset,
            });
        } catch (error) {
            if (error instanceof AppError) {
                const response = errorResponse(error, context.traceId);
                return res.status(error.statusCode).json(response);
            }
            throw error;
        }
    }

    /**
     * POST /tenant/examples
     * Create a new example
     */
    async create(req: any, res: any, context: RequestContext) {
        try {
            const data = validate(CreateExampleDto, req.body);

            const entity = await this.createUseCase.execute(context.tenantId!, {
                name: data.name,
                createdBy: context.userId!,
            });

            return res.status(201).json({ data: entity });
        } catch (error) {
            if (error instanceof AppError) {
                const response = errorResponse(error, context.traceId);
                return res.status(error.statusCode).json(response);
            }
            throw error;
        }
    }

    /**
     * GET /tenant/examples/:id
     * Get a single example by ID
     */
    async getById(req: any, res: any, context: RequestContext) {
        try {
            const { id } = validate(ExampleIdDto, { id: req.params.id });

            // Get repository
            // const repository = req.container.get('ExampleRepository');
            // const entity = await repository.findById(context.tenantId!, id);

            // if (!entity) {
            //     throw new AppError(ErrorCode.NOT_FOUND, 'Example not found', 404);
            // }

            return res.json({ data: null });
        } catch (error) {
            if (error instanceof AppError) {
                const response = errorResponse(error, context.traceId);
                return res.status(error.statusCode).json(response);
            }
            throw error;
        }
    }

    /**
     * DELETE /tenant/examples/:id
     * Archive an example
     */
    async archive(req: any, res: any, context: RequestContext) {
        try {
            const { id } = validate(ExampleIdDto, { id: req.params.id });

            const entity = await this.archiveUseCase.execute(
                context.tenantId!,
                id,
                context.userId!
            );

            return res.json({ data: entity });
        } catch (error) {
            if (error instanceof AppError) {
                const response = errorResponse(error, context.traceId);
                return res.status(error.statusCode).json(response);
            }
            throw error;
        }
    }
}
