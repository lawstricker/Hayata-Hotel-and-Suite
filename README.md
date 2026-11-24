# Hayata Hotel & Suite — Hotel Management System

A polished, production-style frontend for a complete hotel operations platform. The demo combines front office, reservations, rooms, housekeeping, guest CRM, restaurant and bar POS, kitchen display, real-time inventory, purchasing, billing, reporting, staff, events, and RBAC in one responsive workspace.

> The backend is intentionally mocked in-browser. All workflows are interactive and persist meaningful state for the current session.

## Highlights

- **Role-aware application shell** with ten demo roles, route guards, hidden navigation, contextual permissions, and a 403 page.
- **Real-time inventory engine** with a fake WebSocket event bus, live stock movements, low-stock crossings, animated notifications, alerts, ledger, adjustments, transfers, requisitions, purchase orders, suppliers, and stock takes.
- **Complete hotel operations** including reservation calendar/list, check-in/out, room rack, availability grid, housekeeping drag-and-drop board, maintenance tickets, guest 360° profiles, CRM campaigns, NPS, folios, invoices, and payments.
- **Restaurant and bar POS** with category browsing, modifiers, table/order type, discounts, tips, split bills, age verification, checkout, KDS workflow, menu management, tabs, and room transfers.
- **In-room QR dining** with one unique menu code per checked-in stay, printable door cards, a public guest ordering flow, room-service tickets in the kitchen, and folio-based charges.
- **Enterprise design system** built with Tailwind CSS 4 and Radix-based shadcn-style primitives, including light/dark themes, persistent sidebar, command palette, notifications, skeletons, toasts, responsive mobile navigation, and accessible focus states.
- **Subtle motion** with Framer Motion for route transitions, KPI updates, POS interactions, and live feedback.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Radix UI primitives (shadcn-style local components)
- React Router
- Zustand
- TanStack Query
- Recharts
- React Hook Form + Zod
- date-fns
- Lucide React
- Framer Motion
- Sonner

## Setup

### Requirements

- Node.js 20 or newer
- npm 10 or newer

### Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Production build

```bash
npm run build
npm run preview
```

### Other commands

```bash
npm run lint
```

### Production optimization

The route tree is lazy-loaded, and `vite.config.ts` splits the largest vendor dependencies into dedicated production chunks for charts, Radix UI, Framer Motion, forms, dates, icons, and the React runtime. This keeps feature modules independently cacheable and avoids loading POS, reporting, inventory, and administration code until it is requested.

### Thermal printer bridge

Room QR orders are sent to an HTTP print bridge, which forwards an ESC/POS receipt to the thermal printer over TCP. Browsers cannot open raw printer sockets, so the bridge is required:

```bash
npm run print-bridge
```

By default it listens on port `8787` and forwards to `127.0.0.1:9100`. Configure these environment variables as needed:

- `BRIDGE_PORT` — bridge listen port
- `PRINTER_IP` — default thermal printer local IP
- `PRINTER_PORT` — default thermal printer port, usually `9100`
- `BRIDGE_TOKEN` — optional shared secret
- `ALLOWED_ORIGIN` — CORS origin, defaults to `*`
- `DRY_RUN=1` — log receipts without sending them to a printer

In **Settings → Kitchen printer**, enter the bridge IP/hostname and port that the guest device can reach, plus the thermal printer’s local IP and port. Use an HTTPS reverse proxy on the bridge when the app is deployed over HTTPS; browsers block mixed-content requests from HTTPS pages to plain HTTP hosts.

## Demo credentials

Every account uses the password **`demo123`**.

| Role | Email |
| --- | --- |
| Super Admin | `elena@hayatahotel.com` |
| Hotel Manager | `marcus@hayatahotel.com` |
| Front Desk | `amara@hayatahotel.com` |
| Housekeeping | `sofia@hayatahotel.com` |
| Restaurant Manager | `daniel@hayatahotel.com` |
| Bar Manager | `nina@hayatahotel.com` |
| Store Manager | `omar@hayatahotel.com` |
| Accountant | `grace@hayatahotel.com` |
| Waiter | `leo@hayatahotel.com` |
| Bartender | `maya@hayatahotel.com` |

Use the **role switcher in the avatar menu** to preview every permission set instantly without signing out.

## Keyboard shortcuts

- `⌘K` / `Ctrl+K` — global search across guests, reservations, inventory, and orders
- `Esc` — close an open dialog or command palette
- `Tab` / `Shift+Tab` — keyboard navigation through interactive controls

## Project structure

```text
src/
├── app/            # Lazy-loaded application route tree
├── components/     # UI primitives, layout, data table, shared states
├── features/       # Auth, dashboard, hotel ops, guest ordering, CRM, POS, inventory, finance
├── hooks/          # Real-time simulation and feature hooks
├── lib/            # RBAC matrix and utilities
├── mock/           # Seed data, fake API, event bus
├── store/          # Zustand session and operational stores
├── types/          # HMS domain model
└── utils/          # Public utility exports
```

## Feature checklist

### Foundation

- [x] Responsive desktop, tablet, and mobile layouts
- [x] Collapsible persistent sidebar and mobile drawer/bottom navigation
- [x] Light/dark mode persisted in local storage
- [x] Global command palette and notifications
- [x] Toast, skeleton, empty, error, and loading patterns
- [x] Framer Motion page and micro-interactions

### Access control

- [x] Ten roles with a centralized permission matrix
- [x] Guarded routes with 403 handling
- [x] Permission-aware navigation and dashboard metrics
- [x] Instant role preview for reviewers
- [x] Interactive RBAC editor in Settings
- [x] Persisted role permission overrides that update guards and navigation immediately

### Hotel operations

- [x] Reservation calendar and list
- [x] New reservation flow with validation
- [x] Check-in, check-out, cancellation, no-show states
- [x] Room rack, room types, availability grid
- [x] Housekeeping drag-and-drop board
- [x] Maintenance tickets and resolution workflow

### Guest CRM

- [x] Searchable guest directory and segments
- [x] Guest 360° profile, preferences, notes, and stay history
- [x] Loyalty tiers and points ledger
- [x] Campaigns, birthdays, feedback, and NPS

### Restaurant and bar

- [x] Restaurant and bar POS
- [x] Modifiers, table selection, discounts, tips, split bill, payment
- [x] Age verification for restricted products
- [x] Live kitchen/bar display workflow
- [x] Menu, table, order, and bar-tab management
- [x] One permanent QR menu code per room, reusable by every guest
- [x] Guest-facing kitchen ordering with cart, instructions, ETA, and room folio charges
- [x] Printable room QR cards and guest menu link sharing
- [x] Automatic kitchen thermal printing through a configurable IP print bridge
- [x] Failed-print queue with automatic and manual retry

### Inventory and purchasing

- [x] Live inventory dashboard and valuation
- [x] Item master, SKU, thresholds, batches, expiry, location, and barcode
- [x] Real-time stock ledger and stock-level toasts
- [x] Critical/warning/expiry alerts with acknowledge and snooze
- [x] One-click purchase order from an alert
- [x] Transfers, requisitions, approvals, fulfillment, suppliers, and stock takes
- [x] Simulated background consumption every 12 seconds

### Finance and reporting

- [x] Combined guest folios
- [x] Invoices, partial/overdue states, printable invoice preview
- [x] Payments and refund workflow entry points
- [x] Occupancy, ADR, RevPAR, revenue, source, inventory, and outlet reports
- [x] CSV export and print actions

### People, events, and administration

- [x] Staff directory, shifts, and attendance
- [x] Event and banquet pipeline
- [x] Hotel profile, outlets, tax, currency, and notification settings
- [x] Role permission editor and audit log

## Mock data and real-time behavior

The seed contains approximately 40 rooms, 60 inventory items, 25 guests, 30 reservations, 50 stock movements, 15 low-stock alerts, 10 suppliers, 20 menu items, plus orders, folios, campaigns, shifts, events, and audit records.

The event bus in `src/mock/eventBus.ts` emits `stock.level.changed`, `low_stock.triggered`, `order.created`, `order.status.changed`, `checkin.created`, and `reservation.updated`. A client-side simulation consumes stock every 12 seconds so badges, KPI values, alerts, and the ledger visibly update without a refresh.

## Notes

- Remote Unsplash images are used for menu item photography. The UI remains usable when images are unavailable.
- All financial values use Nigerian Naira (`NGN`, `₦`) across dashboards, POS, inventory, billing, reports, events, CRM, and audit activity.
- The mock session is stored under `hayata-hms-session` in local storage.
- Printer settings and queued tickets are stored under `hayata-hms-printer`.
- Edited RBAC permissions are stored under `hayata-hms-rbac`; clearing that key restores the default role matrix.
- In-room QR codes resolve to `/room/:roomNumber/menu` and identify only the room. The printed code does not change at checkout; it activates again when the next guest checks into that room.
- Guest QR orders are mirrored to browser storage so kitchen displays in other tabs of the same browser receive them. A deployed backend would be required for orders from a guest’s own phone on a different device.
- No real payment, email, barcode scanner, or backend service is contacted.
