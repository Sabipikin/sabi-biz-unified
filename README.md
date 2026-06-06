# SabiBiz

SabiBiz is a unified SaaS web application for Nigerian SMEs that combines simple business record keeping with WhatsApp-based customer engagement. The app is designed for small merchants, market sellers, service businesses, and growing local teams that need one place to manage customers, invoices, sales, inventory, subscriptions, and customer follow-up without adopting a heavy enterprise accounting system.

The codebase merges the original BizTrack accounting workflow with SabiReply-style WhatsApp messaging. The implemented product surface currently supports customer management, invoicing, inventory tracking, sales/profit analytics, WhatsApp messaging, customer milestone messages, Paystack subscription payments, and a separate admin dashboard for platform operators.

## What It Helps Nigerian SMEs Do

SabiBiz focuses on day-to-day business operations that are common for Nigerian small businesses:

- Keep a digital customer list with phone numbers, email addresses, delivery locations, birthdays, anniversaries, and purchase history.
- Create invoices with line items, customer contact details, due dates, paid/sent/draft status, and delivery through WhatsApp or email composition flows.
- Track inventory with product quantity, unit price, cost price, reorder level, and supplier details.
- Record sales manually or in bulk, calculate profit/loss from selling price and cost price, and reduce inventory quantities automatically.
- Auto-record product-level sales from paid invoice items so sales reports stay connected to invoice activity.
- Send WhatsApp messages to customers and store outgoing/incoming message history.
- Generate and send birthday or anniversary messages using business-specific templates.
- Export sales and customer data to Excel for offline review, tax/accounting work, or sharing with staff.
- Accept subscription payments through Paystack in Nigerian naira.
- Give platform admins visibility into users, subscriptions, revenue, payments, and user status.

## Repository Structure

```text
Sabireply/
  backend/       Express API, PostgreSQL migrations, services, webhooks
  frontend/      Customer-facing PWA served as static HTML/CSS/JS
  admin/         Platform admin dashboard served as static HTML/CSS/JS
  mobile/        Placeholder for future mobile work
  tools/         Utility scripts
  docker-compose.yml
  package.json   npm workspace root
```

## Architecture

SabiBiz is organized as a JavaScript monorepo with npm workspaces:

- `backend`: Node.js 20, Express, PostgreSQL, Socket.IO, JWT auth, Paystack and WhatsApp integrations.
- `frontend`: Static progressive web app using vanilla JavaScript, local service worker, and a manifest.
- `admin`: Static admin dashboard using vanilla JavaScript.
- `database`: PostgreSQL with SQL migrations under `backend/migrations`.

The backend exposes REST APIs under `/api/*`. The customer frontend calls these APIs for business workflows, while the admin dashboard calls protected admin routes. The backend also starts Socket.IO, although the current frontend behavior primarily uses REST requests.

## Core Features

### Authentication and Accounts

- Email/password registration and login.
- Password hashing with `bcryptjs`.
- JWT authentication with configurable algorithm and expiry.
- New business users receive a 14-day trial subscription on registration.
- Separate admin-user login path backed by the `admin_users` table.
- Profile and password update endpoints.

OAuth placeholders exist for Google, Apple, and Neon SSO, but those endpoints currently return `501 Not Implemented`.

### Customer Management

Customers belong to a user account and can include:

- Name, phone, and email.
- City, region, and delivery address.
- Birthday and anniversary dates.
- Auto birthday/anniversary messaging preferences.
- Invoice counts, paid/pending invoice counts, total spent, and total profit.

The frontend includes customer list, detail, edit, delete, analytics, live validation, and Excel export flows.

### Invoices

Invoices support:

- Customer linkage through `customer_id`.
- Customer name and phone snapshots.
- Multiple invoice items.
- Product, unit, quantity, unit price, cost price, and total price per line item.
- Invoice amount, status, due date, and paid date.
- Send metadata such as `sent_count`, `last_sent_method`, `auto_mail`, and `auto_whatsapp`.
- WhatsApp and email compose helpers in the frontend.

When invoice items are paid or processed through the business service, the system can auto-record related sales entries.

### Inventory

Inventory records include:

- Product name.
- Quantity on hand.
- Unit selling price.
- Cost price.
- Reorder level.
- Supplier.

Sales created against inventory items automatically reduce inventory quantity. Deleting or editing sales adjusts inventory quantities back where appropriate.

### Sales and Profit Tracking

Sales can be recorded as single transactions or bulk product batches. Sales records support:

- Inventory item linkage.
- Product name, quantity, unit price, cost price, total amount, and profit.
- Customer linkage.
- Invoice linkage.
- Bonus/profit adjustment and adjustment reason.
- Sale date and time.
- `auto_recorded` flag for sales generated from invoices.

Sales analytics calculate total sales, total profit, total loss, average margin, top product, and highest sale time. Sales data can be exported to Excel by date range.

### WhatsApp Messaging

The WhatsApp module supports:

- Meta WhatsApp webhook verification.
- Incoming webhook processing and message storage.
- Outgoing text messages through the WhatsApp Cloud API when `WHATSAPP_TOKEN` and `PHONE_NUMBER_ID` are configured.
- Manual message sending from the frontend.
- Optional `useAI` flag stored with outgoing messages.

The current service stores AI-related flags/configuration but does not yet call OpenAI to generate replies.

### Customer Milestone Messages

SabiBiz can help SMEs maintain customer relationships through birthday and anniversary messages.

Implemented behavior includes:

- Business-level birthday and anniversary templates.
- Template variables such as customer name, business name, date, weekday, event, city, phone, and years.
- Upcoming birthday and anniversary tracking.
- Pending/sent/failed milestone message records.
- Manual message generation and sending through WhatsApp.
- Scheduled message records in the database.

The backend contains helper methods for pending milestone processing, but the server cron jobs currently contain placeholders and do not yet run an automated daily milestone sender.

### Subscriptions and Payments

Subscription support includes:

- Trial subscription creation during registration.
- Manual subscription creation.
- Paystack transaction initialization.
- Paystack webhook signature verification.
- Activation of pending subscriptions after `charge.success`.
- User subscription plan/status update after successful payment.
- Subscription payment invoice creation.

Configured Paystack pricing:

```text
starter: NGN 2,990
growth:  NGN 4,990
pro:     NGN 9,990
```

### Analytics

Customer-facing analytics currently include:

- Recent stored analytics metrics.
- Invoice counts, invoice status totals, pending and overdue amounts.
- Top paid product by invoice items.
- Total items sold.
- Customer totals, spend, profit, and milestone summaries.
- Sales totals, profit/loss, average margin, top product, and strongest sales hour.

Admin analytics include:

- Total users.
- Active subscriptions.
- Total invoices.
- Total revenue.
- Revenue by subscription plan.
- Subscription status summary.

### Admin Dashboard

The admin app provides a separate operational interface for platform administrators:

- Dashboard overview.
- User list and suspension action.
- Subscription list and detail route.
- Payment/invoice history.
- Revenue and subscription analytics.
- Settings placeholder.

Admin routes are protected by the normal auth middleware plus `adminMiddleware`.

## API Overview

Base URL in development: `http://localhost:3000`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `PUT /api/auth/password`
- `POST /api/auth/google` - placeholder
- `POST /api/auth/apple` - placeholder
- `POST /api/auth/neon` - placeholder

### Business

- `GET /api/business/customers`
- `POST /api/business/customers`
- `GET /api/business/customers/analytics`
- `GET /api/business/customers/export`
- `GET /api/business/customers/:id`
- `PUT /api/business/customers/:id`
- `DELETE /api/business/customers/:id`
- `GET /api/business/invoices`
- `POST /api/business/invoices`
- `GET /api/business/invoices/analytics`
- `GET /api/business/invoices/:id`
- `PUT /api/business/invoices/:id`
- `POST /api/business/invoices/:id/send`
- `GET /api/business/inventory`
- `POST /api/business/inventory`
- `GET /api/business/sales`
- `POST /api/business/sales`
- `POST /api/business/sales/bulk`
- `PUT /api/business/sales/:id`
- `DELETE /api/business/sales/:id`
- `GET /api/business/sales/analytics`
- `GET /api/business/sales/export`
- `GET /api/business/milestones`
- `GET /api/business/milestones/templates`
- `PUT /api/business/milestones/templates`
- `GET /api/business/milestones/generate`
- `POST /api/business/milestones/send`

### WhatsApp

- `GET /api/whatsapp/webhook`
- `POST /api/whatsapp/webhook`
- `POST /api/whatsapp/send`

### Subscriptions and Payments

- `GET /api/subscriptions`
- `POST /api/subscriptions/subscribe`
- `GET /api/payments/paystack/public-key`
- `POST /api/payments/paystack/initialize`
- `POST /api/webhooks/paystack`

### Analytics

- `GET /api/analytics`

### Admin

- `GET /api/admin/analytics/dashboard`
- `GET /api/admin/analytics/revenue`
- `GET /api/admin/analytics/subscriptions`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `POST /api/admin/users/:id/suspend`
- `GET /api/admin/subscriptions`
- `GET /api/admin/subscriptions/:id`
- `GET /api/admin/payments`

## Database Model

The PostgreSQL schema is migration-based. Major tables include:

- `users`: SME accounts, profile details, subscription fields, WhatsApp/AI flags.
- `admin_users`: platform admin accounts.
- `subscriptions`: user plans, billing state, Paystack metadata.
- `customers`: customer profiles and milestone fields.
- `invoices`: invoice header records.
- `invoice_items`: product-level invoice lines.
- `inventory`: stock records.
- `sales`: product-level sales and profit records.
- `whatsapp_messages`: incoming/outgoing message storage.
- `milestone_messages`: birthday/anniversary message queue and history.
- `ai_configs`: per-user AI configuration placeholders.
- `analytics`: generic metrics table.
- `audit_logs`: audit trail placeholder.
- `migrations`: migration history.

## Local Development

### Prerequisites

- Node.js 20.x
- npm
- PostgreSQL 16 or Docker
- Paystack account for live payment testing
- Meta WhatsApp Business API credentials for live WhatsApp sending

### Install Dependencies

```bash
npm install
```

Or install all workspaces explicitly:

```bash
npm run install:all
```

### Configure Environment

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

For local Docker PostgreSQL, use:

```text
DATABASE_URL=postgresql://postgres:password@localhost:5432/sabibiz
DB_SSL=false
JWT_SECRET=<strong-local-secret>
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

Do not commit real production secrets. Replace all example payment, WhatsApp, admin, and database credentials before deployment.

### Start PostgreSQL

```bash
docker-compose up -d
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379` for future/optional caching

### Run Migrations

```bash
npm run migrate
```

The backend also attempts to apply pending migrations on server startup after the database connection is available.

### Start Development Servers

```bash
npm run dev:backend
npm run dev:frontend
npm run dev:admin
```

Development URLs:

- Backend API: `http://localhost:3000`
- Frontend PWA: `http://localhost:5173`
- Admin dashboard: `http://localhost:5174`

The root `npm run dev` script attempts to start all three workspaces in parallel.

## Testing

Backend package scripts include:

```bash
npm test --workspace=backend
```

Frontend validation tests can be run with:

```bash
npm test --workspace=frontend
```

Current visible frontend tests cover email and customer data validation logic. Backend test files are not present in the inspected tree, although the backend is configured for Jest.

## Deployment Notes

The repository contains deployment configuration for Render and Netlify-style static hosting:

- `render.yaml`
- `Procfile`
- `backend/render.js`
- `frontend/netlify.toml`
- `admin/netlify.toml`
- `_redirects` files for static app routing

Expected production setup:

- Backend API hosted as a Node service.
- PostgreSQL hosted on Neon, Render, Railway, or another managed provider.
- Frontend and admin apps hosted as static sites.
- Environment variables configured in the hosting dashboards.
- Paystack webhook URL pointed at `/api/webhooks/paystack`.
- WhatsApp webhook URL pointed at `/api/whatsapp/webhook`.

## Important Environment Variables

Backend:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `DB_SSL`
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `JWT_EXPIRES_IN`
- `FRONTEND_URL`
- `ADMIN_URL`
- `CORS_ORIGINS`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_NAME`
- `VERIFY_TOKEN`
- `WHATSAPP_TOKEN`
- `PHONE_NUMBER_ID`
- `PAYSTACK_SECRET`
- `PAYSTACK_PUBLIC_KEY`
- `OPENAI_API_KEY`
- `LOG_LEVEL`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`

Frontend/admin build scripts generate runtime env files from configured values.

## Security and Reliability

Implemented safeguards include:

- Password hashing with bcrypt.
- JWT auth middleware.
- Admin authorization middleware.
- Helmet security headers.
- CORS allow-listing.
- API rate limiting.
- Stricter auth route rate limiting.
- Raw-body Paystack webhook signature verification.
- Centralized error handling.
- Winston/Morgan logging.
- Graceful shutdown hooks.
- Database connection retry on startup.

## Current Implementation Status

Implemented and usable:

- Email/password auth.
- Customer frontend shell and PWA behavior.
- Admin dashboard shell.
- Customers, invoices, inventory, sales, exports, analytics, subscriptions, Paystack initialization, Paystack webhook handling, WhatsApp send/storage, and milestone messaging flows.

Partially implemented or placeholder:

- Google, Apple, and Neon SSO.
- OpenAI-powered WhatsApp replies.
- Automated scheduled sending for milestone messages.
- Redis-backed caching.
- Audit log writing.
- Email delivery service beyond frontend mailto composition.
- Mobile app implementation.
- Comprehensive backend test coverage.

## Product Positioning

SabiBiz is best understood as an operations companion for Nigerian SMEs: it gives business owners a practical way to know who their customers are, what has been sold, what stock remains, which invoices are pending, how much profit they are making, and how to keep customer relationships warm through WhatsApp.

