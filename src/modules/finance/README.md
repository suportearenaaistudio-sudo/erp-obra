# Finance Module

Financial management and accounting for Obra360.

## Features (Planned)

- Accounts payable
- Accounts receivable
- Cash flow management
- Bank reconciliation
- Chart of accounts
- General ledger
- Financial reports (P&L, Balance Sheet, Cash Flow)
- Cost centers
- Budget management

## Status

📦 **Placeholder** - Not yet implemented

## Next Steps

1. Copy from `_template` module
2. Define Finance entities (Invoice, Payment, Transaction, Account)
3. Implement double-entry accounting logic
4. Create repositories
5. Create use cases (payment processing, reconciliation)
6. Build API endpoints
7. Add financial reports

## Related Tables

- `accounts`
- `invoices`
- `payments`
- `transactions`
- `bank_accounts`
- `financial_entries`
- `cost_centers`
- `budgets`

## Feature Key

`FeatureKey.FINANCE_MODULE`

## Permissions

- `INVOICE_VIEW`
- `INVOICE_CREATE`
- `INVOICE_APPROVE`
- `PAYMENT_VIEW`
- `PAYMENT_CREATE`
- `PAYMENT_APPROVE`
- `FINANCIAL_REPORT_VIEW`
- `BUDGET_MANAGE`
