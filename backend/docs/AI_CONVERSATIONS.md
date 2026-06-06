# AI WhatsApp Sales Assistant

## Overview

Incoming WhatsApp webhooks now trigger a tenant-scoped AI workflow:

1. Resolve the tenant from WhatsApp metadata.
2. Store the raw WhatsApp message.
3. Find or create a customer lead by phone number.
4. Create or resume a WhatsApp conversation.
5. Store the inbound conversation message.
6. Generate AI context from business, customer, invoices, sales, products, inventory, and recent messages.
7. Generate or fall back to a sales-assistant reply.
8. Store the outbound AI message.
9. Log the AI interaction in `ai_interactions`.
10. Send the reply through WhatsApp Cloud API when credentials are configured.

## Tenant Resolution

The webhook maps incoming messages to `users.id` in this order:

- `users.whatsapp_phone_number_id`
- `users.whatsapp_phone`
- `users.phone`

Configure `whatsapp_phone_number_id` for each tenant whenever possible because it is the most reliable Meta WhatsApp identifier.

## Database Tables

- `conversations`: one row per active customer chat.
- `conversation_messages`: normalized inbound, outbound, AI, and agent messages.
- `ai_interactions`: full AI audit log with prompt, context JSON, response, invoice draft, escalation, status, and errors.

The legacy `whatsapp_messages` table remains the transport-level message log.

## AI Configuration

The engine uses the user's `openai_api_key` first, then `OPENAI_API_KEY`. The model defaults to `gpt-4o-mini` and can be overridden with `OPENAI_MODEL` or `ai_configs.model`.

If no key is present, the deterministic fallback can still answer with known prices, inventory availability, recommendations, invoice draft summaries, and escalation messages.

## APIs

- `GET /api/conversations`: dashboard summary and recent conversations.
- `GET /api/conversations/:id`: conversation detail, messages, and recent AI interactions.
- `POST /api/conversations/:id/assign`: marks the chat for human takeover.
- `POST /api/conversations/:id/reply`: sends a human reply and logs it in the conversation.
