# Cloudflare Inquiry Web Form

A minimal, Cloudflare-native inquiry form with no database, no framework, and no third-party dependencies.

## Architecture

One Cloudflare Worker (`src/index.ts`) handles `POST /api/contact` for form submissions, validating input, verifying Turnstile tokens, and sending notification emails via Cloudflare Email Service. Everything else (HTML, CSS, JS, favicon, etc.) is served by Cloudflare Workers Static Assets directly from `public/` with no Worker involvement. The Worker uses a `send_email` binding named `EMAIL` to deliver inquiries to a verified recipient address.

## Prerequisites

Before deploying to a real Cloudflare account:

- Onboard and verify a sender domain or address in Cloudflare Email Service (under "Send Email" settings) — the Worker will use this to deliver notifications.
- Verify the destination email address that will receive inquiry notifications (also in Email Service settings).
- Create a Cloudflare Turnstile sitekey for bot protection (free tier available).

## Configuration

1. Copy `.dev.vars.example` to `.dev.vars` for local development — it pre-fills `TURNSTILE_SECRET_KEY` with Cloudflare's public testing secret (`1x0000000000000000000000000000000AA`).
2. Before deploying for production, update `wrangler.jsonc`:
   - Replace the placeholder `EMAIL_FROM` variable and `send_email.destination_address` with your verified sender and recipient addresses (currently `inquiries@example.com` and `team@example.com`). The binding owns the fixed notification recipient.
   - Replace the Turnstile testing sitekey `1x00000000000000000000AA` in `public/index.html` with your real production sitekey.

## Local development

```bash
pnpm install
pnpm dev
```

This runs `wrangler dev`, which simulates the Email Service binding locally (emails are logged and not delivered) but still sends real requests to Cloudflare's Turnstile Siteverify endpoint. To opt into real email delivery during local development (for testing your verified addresses), set `remote: true` on the `EMAIL` binding in `wrangler.jsonc` or pass `--remote` to `wrangler dev`, but note this **sends real email** — use with care.

## Production secret

Set the real Turnstile secret key on your deployed Worker:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

Paste the production secret value when prompted. Do not commit secrets to version control.

## Deploy

```bash
pnpm deploy
```

This runs `wrangler deploy`. After deployment, configure a custom domain/DNS in the Cloudflare dashboard pointing to your Worker.

## Security notes

- The `send_email` binding enforces sender and recipient address restrictions at the binding level (not just in application code), preventing abuse if the Worker is compromised.
- The only API surface exposed by the Worker is same-origin `/api/contact` — no CORS is configured or needed, as the frontend and backend are served from the same origin.
