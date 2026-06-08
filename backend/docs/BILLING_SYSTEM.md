# Subscription And Billing System

SabiBiz uses Paystack as the active payment provider and keeps the billing model provider-agnostic for future Stripe or Flutterwave adapters.

## Core Tables

- `subscription_plans`: plan catalog, prices, limits, and feature flags.
- `organization_subscriptions`: current and historical workspace subscriptions.
- `usage_metrics`: monthly usage counters for conversations, users, WhatsApp numbers, and AI assistants.
- `billing_invoices`: SaaS billing invoices, separate from customer business invoices.
- `billing_notifications`: in-app billing and usage notices.

The `invoices` table remains reserved for SME customer invoices.

## Billing APIs

- `GET /api/billing/plans`
- `GET /api/billing/current-plan`
- `GET /api/billing/usage`
- `GET /api/billing/invoices`
- `GET /api/billing/notifications`
- `POST /api/billing/upgrade`
- `POST /api/billing/downgrade`
- `POST /api/billing/cancel`
- `POST /api/billing/reactivate`

Known SaaS plans go through `/api/billing/*`. The legacy `/api/payments/paystack/initialize` endpoint delegates to the billing flow for known plans.

## Plans

- Trial: 14 days, 1 user, 1 WhatsApp number, 100 AI conversations.
- Starter: NGN 10,000/month, 1 user, 1 WhatsApp number, 1,000 conversations.
- Growth: NGN 25,000/month, 5 users, 3 WhatsApp numbers, 5,000 conversations.
- Business: NGN 60,000/month, 20 users, 10 WhatsApp numbers, 20,000 conversations.
- Enterprise: custom pricing and unlimited/custom limits.

## Feature And Usage Gates

Use:

- `checkSubscription`
- `checkPlanFeature(featureKey)`
- `checkUsageLimit(metricType)`

The default limit response is: `Upgrade your plan to continue.`

## Paystack

Paystack checkout is initialized through the `PaystackAdapter`. Successful `charge.success` webhooks activate `organization_subscriptions`, mark `billing_invoices` as paid, and update the user's subscription fields.
