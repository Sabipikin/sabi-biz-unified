# Customer Product Suite

This backend layer fills the customer-facing product modules that sit beyond the original auth, billing, dashboard, WhatsApp, and mobile foundations.

## Route Base

All routes are tenant-scoped to the authenticated workspace:

```text
/api/product
```

Read endpoints enforce the related plan feature. Mutating endpoints also enforce writable workspace status.

## Modules

- CRM: `/leads`, `/opportunities`, `/activities`
- Communication and marketing: `/templates`, `/segments`, `/campaigns`, `/broadcasts`
- AI platform: `/assistants`, `/knowledge`
- Workflow automation: `/workflows`
- Integrations: `/integrations`, `/webhooks`, `/api-keys`
- Analytics and reporting: `/analytics/summary`, `/reports`
- Team collaboration: `/team`
- Branding: `/branding`
- Enterprise support and security foundation: `/tickets`

Each collection supports:

```text
GET    /api/product/:resource
POST   /api/product/:resource
GET    /api/product/:resource/:id
PUT    /api/product/:resource/:id
DELETE /api/product/:resource/:id
```

Special endpoints:

```text
POST   /api/product/leads/:id/convert
GET    /api/product/branding
PUT    /api/product/branding
GET    /api/product/api-keys
POST   /api/product/api-keys
DELETE /api/product/api-keys/:id
GET    /api/product/analytics/summary
```

## Migration

`backend/migrations/013_customer_product_suite.sql` creates the product-suite tables and extends `customers` with CRM fields.

## Mobile Coverage

The mobile app now consumes:

- Campaigns, message templates, and broadcasts in `Marketing`
- Product analytics summary in `Analytics`
- AI assistants and knowledge resources in `AI`

Additional creator/editor screens can build on the same endpoints without new backend primitives.
