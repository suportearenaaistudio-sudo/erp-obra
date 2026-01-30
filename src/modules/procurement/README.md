# Procurement Module

Purchasing and supplier management for Obra360.

## Features (Planned)

- Supplier management
- Purchase requests
- Purchase orders
- Quotation comparison
- Supplier evaluation
- Delivery tracking
- Invoice matching (3-way match)

## Status

📦 **Placeholder** - Not yet implemented

## Next Steps

1. Copy from `_template` module
2. Define Procurement entities (Supplier, PurchaseOrder, PurchaseRequest, Quote)
3. Implement repositories
4. Create use cases (approval workflow, PO generation)
5. Build API endpoints
6. Add email notifications

## Related Tables

- `suppliers`
- `purchase_requests`
- `purchase_orders`
- `purchase_order_items`
- `supplier_quotes`
- `deliveries`

## Feature Key

`FeatureKey.PROCUREMENT_MODULE`

## Permissions

- `SUPPLIER_VIEW`
- `SUPPLIER_MANAGE`
- `PURCHASE_REQUEST_CREATE`
- `PURCHASE_REQUEST_APPROVE`
- `PURCHASE_ORDER_CREATE`
- `PURCHASE_ORDER_APPROVE`
