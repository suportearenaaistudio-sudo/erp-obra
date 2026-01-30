import { z } from 'zod';

/**
 * DTOs (Data Transfer Objects) with Zod validation
 * 
 * Use these to validate and type incoming requests
 */

export const CreateExampleDto = z.object({
    name: z.string().min(3).max(100),
});

export type CreateExampleDto = z.infer<typeof CreateExampleDto>;

export const UpdateExampleDto = z.object({
    name: z.string().min(3).max(100).optional(),
    status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export type UpdateExampleDto = z.infer<typeof UpdateExampleDto>;

export const ListExampleDto = z.object({
    status: z.enum(['active', 'inactive', 'archived']).optional(),
    search: z.string().optional(),
    limit: z.number().int().positive().max(100).optional().default(10),
    offset: z.number().int().nonnegative().optional().default(0),
});

export type ListExampleDto = z.infer<typeof ListExampleDto>;

export const ExampleIdDto = z.object({
    id: z.string().uuid(),
});

export type ExampleIdDto = z.infer<typeof ExampleIdDto>;
