# cloudflare-inquiry-web-form

A minimal inquiry form on Cloudflare Workers with Turnstile verification and notification email through the Resend REST API.

## Architecture

One Worker (`src/index.ts`) handles `POST /api/contact`, validates input, verifies Turnstile, then calls Resend over HTTPS. Static files in `public/` are served by Workers Static Assets. Notifications go to the fixed `EMAIL_TO` address; the visitor's address is used only for `reply_to`.

## Production setup

1. In [Resend Domains](https://resend.com/domains), add `dceoy.com` as a sending domain and verify the DNS records Resend provides. Keep the existing Google Workspace MX for `dceoy.com` intact; Resend's return-path records use a separate subdomain. Check existing SPF/DMARC records before adding any TXT record at the same name.
2. In [Resend API Keys](https://resend.com/api-keys), create a key restricted to **Sending access** and the verified domain.
3. Configure both email addresses as production Worker secrets: `EMAIL_FROM` must be an address on the verified sending domain (for example `inquiry@dceoy.com`), and `EMAIL_TO` must be the Google Workspace notification mailbox. Neither address is stored in Git. Ensure the `EMAIL_FROM` address is a Workspace alias if it should receive direct replies.
4. The existing Turnstile widget sitekey is configured in `public/index.html` for `inquiry.dceoy.com`. The form sends the `contact` action, and the Worker accepts Siteverify responses only for that action and the hostname allowlist in `wrangler.jsonc`.
5. Set the production Worker secrets (through **Workers & Pages → cloudflare-inquiry-web-form → Settings → Variables and Secrets**, or Wrangler):

```bash
pnpm exec wrangler secret put RESEND_API_KEY
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
pnpm exec wrangler secret put EMAIL_FROM
pnpm exec wrangler secret put EMAIL_TO
```

Never commit these secrets. Configure them on the production Worker before deploying the branch. Resend domain verification, the API key and the production Turnstile widget must be ready before live submissions can succeed.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, then replace the Resend API key and both example email addresses with non-production test values. `EMAIL_FROM` must use a sending domain accepted by the test Resend key, and `EMAIL_TO` should be a test recipient. The page switches to Cloudflare's public Turnstile test sitekey on `localhost` and `127.0.0.1`; the example includes its matching test secret and local hostname allowlist. **Local submissions call the live Resend API and can send real email**, so do not use production credentials or a production recipient.

```bash
cp .dev.vars.example .dev.vars
pnpm install
pnpm dev
```

## Deploy

```bash
pnpm deploy
```

The Custom Domain in `wrangler.jsonc` publishes the Worker at `https://inquiry.dceoy.com/`. Cloudflare manages DNS and TLS for the Worker route; avoid a conflicting A, AAAA or CNAME record. Submit one test inquiry and check delivery to the configured Workspace mailbox and the message's Reply-To address.

Cloudflare Workers Builds use Wrangler Previews for pull requests. Preview deployments have branch-specific hostnames, so `TURNSTILE_HOSTNAMES` is intentionally empty in Preview and requests fail closed. To test submissions from a Preview, configure a Preview-specific Turnstile sitekey, secret, and exact hostname allowlist, plus non-production email secrets. Do not reuse production credentials.

## Security notes

- `EMAIL_FROM` and `EMAIL_TO` are stored as Worker secrets rather than committed to Git.
- Turnstile validation occurs before calling Resend and requires `success: true`, the `contact` action, and an exact hostname match in `TURNSTILE_HOSTNAMES`.
- Only the configured `EMAIL_TO` address receives mail; the Resend key is restricted to sending from the configured verified domain.
- Resend acceptance indicates API submission, not final delivery. Use Resend's delivery logs for troubleshooting.
- The only Worker endpoint is same-origin `/api/contact`; no CORS configuration is needed.
