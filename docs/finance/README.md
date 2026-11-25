# Finance module

The finance workspace lives inside the Hayata HMS app at `/staff/finance`. It uses the app shell, auth store and RBAC matrix, and serves its data from typed `/api/finance/*` clients. In development those requests are fulfilled by MSW; in production they hit the REST backend.

## Run

```bash
npm install
npm run dev          # MSW worker starts automatically in dev
npm test             # Vitest unit tests (lib/money.ts)
npm run test:e2e     # Playwright (config in playwright.config.ts)
npm run build
```

The MSW worker script is `public/mockServiceWorker.js` (generated with `npx msw init public --save`).

## Routes

| Route | Page | Permission |
| --- | --- | --- |
| `/staff/finance` | Accounting dashboard | `finance:view` |
| `/staff/finance/accounts` | Chart of accounts list | `accounts:view` |
| `/staff/finance/accounts/new` | Create account | `accounts:create` |
| `/staff/finance/accounts/:id` | Account detail + audit | `accounts:view` |
| `/staff/finance/accounts/:id/edit` | Edit account | `accounts:edit` |
| `/staff/finance/invoices` | Invoice list + AR aging | `invoice:view` |
| `/staff/finance/invoices/new` | Create invoice | `invoice:create` |
| `/staff/finance/invoices/:id` | Invoice document, PDF, payments | `invoice:view` |

Route guards use the existing `PermissionRoute`; components use `<Can permission="invoice:approve">` and `<RoleGate roles={...}>`.

## Structure

```
src/features/finance/
  api/          typed REST clients + TanStack Query hooks
  components/   MoneyInput, CurrencyDisplay, DataTable, ConfirmDialog,
                DateRangePicker, StatusBadge, EmptyState, Can, RoleGate
  mocks/        MSW handlers, browser worker, seed data
  pages/        finance dashboard and implemented modules
  schemas/      Zod schemas mirroring the core types
  utils/        CSV/XLSX export, invoice PDF generation
src/lib/money.ts          Money helpers (decimal.js, string amounts)
src/lib/permissions.ts    Finance role → permission matrix
src/types/finance.ts      Finance-facing type aliases
```

## Conventions

1. **Money is always a string.** Use `Money { amount, currency }` and helpers from `lib/money.ts` (`add`, `subtract`, `multiply`, `compare`, `format`, `round`). Never store floats; round only for display. Rounding defaults to half-up and is configurable per currency via `setMoneyConfig`.
2. **Dates are UTC ISO strings.** Use `DateRangePicker`, which stores UTC boundaries; never mutate a `Date` in place.
3. **Forms use React Hook Form + Zod** with `mode: 'onBlur'`. Server errors arrive as `{ code, message, fieldErrors }` and are mapped back onto fields.
4. **Mutations invalidate queries** through the query hooks in `api/`; success/error feedback uses Sonner toasts.
5. **Destructive actions use `ConfirmDialog`** with a required reason; the reason is written to the audit log via the MSW `POST /api/finance/audit` handler.
6. **TODO(API)** marks code that will change when the real backend is connected (in-memory MSW stores, audit IP, etc.). Every stubbed endpoint has a working MSW handler.

## Money helpers

`lib/money.ts` exports: `money`, `zero`, `add`, `subtract`, `multiply`, `divide`, `sum`, `compare`, `greaterThan`, `lessThan`, `equals`, `isZero`, `isNegative`, `absolute`, `negate`, `round`, `format`, `parse`, `decimalsFor`, `getMoneyConfig`, `setMoneyConfig`. Unit tests live in `src/lib/money.test.ts`.

## Invoices

- Create: line items (quantity × unit price), tax rate, discount, currency, issue/due dates and notes. The invoice number is allocated from the company sequence exposed by `GET /api/finance/meta` (`nextInvoiceNumber`).
- Totals are computed client-side with decimal.js for immediate feedback and recomputed authoritatively by the MSW/backend handler on save.
- Status is derived from paid amount and due date: `DRAFT → SENT → PARTIALLY_PAID → PAID`, with `OVERDUE` and `VOID` states.
- Payments are allocated to invoices with an idempotency key; overpayment and allocation mismatch are rejected with field errors.
- The detail page can **Generate PDF** (`jsPDF`) or print the invoice, and shows the AR aging bucket.

## Adding a new module

1. Add core types to `src/types/domain.ts` (and an alias in `src/types/finance.ts`).
2. Add a Zod schema in `src/features/finance/schemas/index.ts`.
3. Add MSW handlers and seed rows in `src/features/finance/mocks/` and export from `mocks/index.ts`.
4. Add a typed API client + Query hooks in `src/features/finance/api/`; invalidate related queries on mutation.
5. Add the page in `src/features/finance/pages/`, export it from `pages/index.ts`, register the route in `src/app/staff-routes.tsx` and add the nav item in `src/components/layout/navigation.ts`.
6. Add permissions to `Permission` in `types/domain.ts`, the finance matrix in `lib/permissions.ts`, the defaults in `lib/permission-data.ts`, and the PHP seed in `server/php/setup.php`.
7. Wire every mutation to `recordAudit(...)`.

## Phase status

- ✅ Foundation: money, permissions, Zod schemas, MSW, shell routing, reusable components, Chart of Accounts vertical slice.
- ✅ Invoices & Payments (AR): create/send invoices, partial payments, AR aging, PDF generation, CSV export.
- ⬜ Journal Entries, General Ledger, Bills/AP, Expenses, Bank Reconciliation, Budgets, Tax, full report engine, audit UI, RBAC tests — planned in the later phases.
