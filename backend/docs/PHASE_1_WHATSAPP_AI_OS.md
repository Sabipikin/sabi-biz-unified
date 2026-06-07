# Phase 1 WhatsApp AI OS Foundation

This phase prepares SabiBiz for multi-tenant WhatsApp onboarding without using global WhatsApp credentials.

## Added Areas

- WhatsApp account records at `/api/whatsapp/accounts`
- Shared inbox workflow at `/api/conversations`
- AI assistant settings at `/api/ai/settings`
- Customer intelligence widgets at `/api/analytics/customer-intelligence`
- Provider-agnostic AI interfaces under `src/services/ai`

## WhatsApp Credentials

Do not add new dependencies on `WHATSAPP_TOKEN` or `PHONE_NUMBER_ID`.

Outgoing delivery now looks for the current tenant's connected `whatsapp_accounts` record. If no connected account exists, the outgoing message is stored and the app remains usable while Meta Embedded Signup is pending.

## Embedded Signup Readiness

`whatsapp_accounts` stores `waba_id`, `phone_number_id`, `display_phone_number`, account status, connection history, and access token. The Settings UI exposes the account status and keeps the actual "Connect WhatsApp" action disabled until business verification is ready.

## Inbox Handoff

Conversations now support AI active, human assigned, and human escalated states. The UI includes Take Over, Resume AI, Close, tags, and internal notes.
