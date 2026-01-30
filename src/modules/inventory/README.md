# Inventory Module

Inventory and materials management for Obra360.

## Features (Planned)

- Material catalog
- Stock management
- Warehouse management
- Stock movements (in/out)
- Stock alerts (minimum levels)
- Inventory valuation
- Material consumption tracking

## Status

📦 **Placeholder** - Not yet implemented

## Next Steps

1. Copy from `_template` module
2. Define Inventory entities (Material, Stock, Warehouse, Movement)
3. Implement repositories with multi-location support
4. Create use cases (stock in/out, transfers, adjustments)
5. Build API endpoints
6. Add barcode/QR support

## Related Tables

- `materials`
- `warehouses`
- `stock`
- `stock_movements`
- `inventory_adjustments`

## Feature Key

`FeatureKey.INVENTORY_MODULE`

## Permissions

- `MATERIAL_VIEW`
- `MATERIAL_CREATE`
- `MATERIAL_UPDATE`
- `MATERIAL_DELETE`
- `STOCK_VIEW`
- `STOCK_ADJUST`
- `WAREHOUSE_MANAGE`
