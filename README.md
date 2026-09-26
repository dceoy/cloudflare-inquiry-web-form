# Cloudflare Inquiry Web Form

A minimal inquiry form on Cloudflare Workers with Turnstile verification and notification email through the Resend REST API.

## Architecture

One Worker (`src/index.ts`) handles `POST /api/contact`, validates input, verifies Turnstile, then calls Resend over HTTPS. Static files in `public/` are served by Workers Static Assets. Notifications go to the fixed `EMAIL_TO` address; the visitor's address is used only for `reply_to`.

## Production setup

1. In [Resend Domains](https://resend.com/domains), add `dceoy.com` as a sending domain and verify the DNS records Resend provides. Keep the existing Google Workspace MX for `dceoy.com` intact; Resend's return-path records use a separate subdomain. Check existing SPF/DMARC records before adding any TXT record at the same name.
2. In [Resend API Keys](https://resend.com/api-keys), create a key restricted to **Sending access** and the verified domain.
3. Set `EMAIL_FROM` and `EMAIL_TO` in `wrangler.jsonc`: `EMAIL_FROM` must be on your verified sending domain (for example `inquiry@dceoy.com`); `EMAIL_TO` is your Google Workspace mailbox. This address remains fixed in Worker configuration and is never taken from form input. Ensure `inquiry@dceoy.com` is a Workspace alias if it should receive direct replies.
4. Create a Turnstile widget for `inquiry.dceoy.com`; replace the test sitekey in `public/index.html` with its production sitekey.
5. Set both production Worker secrets (through **Workers & Pages → cloudflare-inquiry-web-form → Settings → Variables and Secrets**, or Wrangler):

```bash
pnpm exec wrangler secret put RESEND_API_KEY
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
```

Never commit these secrets. Configure them on the production Worker before deploying the branch. Resend domain verification, the API key and the production Turnstile widget must be ready before live submissions can succeed.

## Local development

Copy `.dev.vars.example` to `.dev.vars` and set a Resend API key for testing. The example includes Cloudflare's public Turnstile testing secret. **Local submissions call the live Resend API and send real email**; use a test recipient and sending domain if needed.

```bash
pnpm install
pnpm dev
```

## Deploy

```bash
pnpm deploy
```

The Custom Domain in `wrangler.jsonc` publishes the Worker at `https://inquiry.dceoy.com/`. Cloudflare manages DNS and TLS for the Worker route; avoid a conflicting A, AAAA or CNAME record. Submit one test inquiry and check delivery to the configured Workspace mailbox and the message's Reply-To address.

## Security notes

- Turnstile validation occurs before calling Resend.
- Only the configured `EMAIL_TO` address receives mail; the Resend key is a Worker secret and should be restricted to sending from this domain.
- Resend acceptance indicates API submission, not final delivery. Use Resend's delivery logs for troubleshooting.
- The only Worker endpoint is same-origin `/api/contact`; no CORS configuration is needed.
