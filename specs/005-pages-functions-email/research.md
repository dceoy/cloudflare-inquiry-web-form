# Research: Pages Functions Email Delivery (Resend)

**Date**: 2026-01-02

## Pages Functions constraints

- Runs on Cloudflare Workers runtime; use `fetch` for outbound HTTP calls.
- No Worker service bindings are required for direct external API calls.

## Resend HTTP API (summary)

- Endpoint: `https://api.resend.com/emails`
- Auth: `Authorization: Bearer <RESEND_API_KEY>`
- Payload (JSON): `from`, `to`, `subject`, `text` (optional `reply_to`)

## Implementation decision

Use Resend HTTP API from Pages Functions to send the email. Configure via env vars:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_TO`
- Optional: `EMAIL_REPLY_TO`
