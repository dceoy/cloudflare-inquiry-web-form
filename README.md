# cloudflare-inquiry-web-form

A minimal inquiry form on Cloudflare Workers with Turnstile verification and Cloudflare Email Sending.

## Architecture

One Worker (`src/index.ts`) handles `POST /api/contact`, validates input, verifies Turnstile, then sends through the Cloudflare Email Sending `send_email` binding. No external email provider or API key is needed. Static files in `public/` are served by Workers Static Assets. The notification goes to `EMAIL_TO` with the submitter as Reply-To; a best-effort copy goes to the submitter.

See the [C4 architecture diagrams and rendering instructions](docs/architecture/).

## Production setup

1. Onboard `dceoy.com` to [Cloudflare Email Sending](https://developers.cloudflare.com/email-service/) and add the SPF, DKIM, and bounce DNS records Cloudflare provides. Keep the Google Workspace MX records intact; do not change apex MX or inbound routing.
2. Verify `EMAIL_TO` as a destination address in the Cloudflare account so notifications can be sent on the Workers Free plan. Sends to verified destinations are free and do not count toward quota. On Free, sender copies can only be delivered to verified destination addresses. Sending copies to arbitrary visitors requires the Workers Paid plan; no code change is needed.
3. Configure `EMAIL_FROM` on the onboarded domain (for example `inquiry@dceoy.com`) and `EMAIL_TO` as the Workspace notification mailbox. Ensure `EMAIL_FROM` is a Workspace alias if it should receive direct replies.
4. The Turnstile widget sitekey in `public/index.html` is configured for `inquiry.dceoy.com`. Production expects the `contact` action and the hostname allowlist in `wrangler.jsonc`.
5. Set the production Worker secrets through the dashboard or Wrangler:

```bash
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
pnpm exec wrangler secret put EMAIL_FROM
pnpm exec wrangler secret put EMAIL_TO
```

Never commit these secrets. Configure them before deployment.

## Local development

Copy `.dev.vars.example` to `.dev.vars` and use non-production values. Plain `wrangler dev` simulates the local email binding and does not deliver real mail. Do not use production credentials. Unit tests provide the deterministic check. The page uses Cloudflare's public Turnstile test sitekey on `localhost` and `127.0.0.1`; the local environment expects the `test` action and allows `localhost`, `127.0.0.1`, and `dummy-key.example.com`.

```bash
cp .dev.vars.example .dev.vars
pnpm install
pnpm dev
```

## Deploy

```bash
pnpm deploy
```

The Custom Domain in `wrangler.jsonc` publishes the Worker at `https://inquiry.dceoy.com/`. Cloudflare manages DNS and TLS for the Worker route; avoid a conflicting A, AAAA or CNAME record. Submit one test inquiry and verify owner delivery, Reply-To, the JST timestamp and reference. On Free, an unverified sender address cannot receive the copy; expect the `E_RECIPIENT_PLAN_RESTRICTED` log line.

Cloudflare Workers Builds use Wrangler Previews for pull requests. Preview deployments have branch-specific hostnames, so `TURNSTILE_HOSTNAMES` is intentionally empty in Preview and requests fail closed. To test submissions from a Preview, configure a Preview-specific Turnstile sitekey, secret, and exact hostname allowlist, plus non-production email settings. Do not reuse production credentials.

After cutover, delete the retired email API key secret from the Worker and revoke it with the former provider.

## Security notes

- `EMAIL_FROM` and `EMAIL_TO` are stored as Worker secrets rather than committed to Git.
- Turnstile validation occurs before sending and requires `success: true`, the configured `TURNSTILE_ACTION`, and an exact hostname match in `TURNSTILE_HOSTNAMES`.
- Only `EMAIL_TO` and the validated submitter receive mail. The binding has no destination restriction because the copy recipient is the validated submitter.
- Sending acceptance does not guarantee final delivery; use Cloudflare's email logs to troubleshoot.
- The only Worker endpoint is same-origin `/api/contact`; no CORS configuration is needed.
