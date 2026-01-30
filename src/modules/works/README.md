# Works Module

Construction project and work management for Obra360.

## Features (Planned)

- Project/Work management
- Work phases and milestones
- Task management
- Progress tracking
- Budget vs Actual
- Timeline management
- Resource allocation 

## Status

🚧 **Partially Implemented** - Core entities exist, needs refactoring to template structure

## Next Steps

1. Refactor existing code to match template structure
2. Migrate existing entities to `domain/`
3. Create proper repository interfaces
4. Implement use cases
5. Update API endpoints
6. Add comprehensive validation

## Related Tables

- `works`
- `work_phases`
- `work_tasks`
- `work_progress`
- `work_budget_items`

## Feature Key

`FeatureKey.WORKS_MODULE`

## Permissions

- `WORK_VIEW`
- `WORK_CREATE`
- `WORK_UPDATE`
- `WORK_DELETE`
- `WORK_PHASE_MANAGE`
- `WORK_TASK_MANAGE`
