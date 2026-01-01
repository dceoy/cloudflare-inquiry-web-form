# Research Notes: Contact Form to Email (Pages + Worker)

## Sources Reviewed

- Cloudflare Pages Functions bindings and service bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Cloudflare Pages local development: https://developers.cloudflare.com/pages/functions/local-development/
- Cloudflare Pages Wrangler configuration: https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- Cloudflare Turnstile server-side validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Cloudflare Email Routing send_email bindings: https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/
- Hono Cloudflare Pages adapter usage: https://hono.dev/docs/getting-started/cloudflare-pages

## Key Findings

- Pages Functions support Service Bindings to Workers and bindings are accessed via `context.env.<BINDING>`. Local dev uses `wrangler pages dev` with service bindings configured in Wrangler config or via CLI flags.
- Wrangler supports JSON/JSONC configuration formats for Pages and recommends downloading config via `wrangler pages download config`.
- Turnstile tokens must be verified server-side via the Siteverify API; tokens are single-use and expire quickly.
- Email Routing allows a `send_email` binding with a fixed `destination_address`, and the sender address must be on the domain with Email Routing enabled.
- Hono’s Cloudflare Pages adapter uses `handle(app)` from `hono/cloudflare-pages` and exports `onRequest` from `functions/api/[[route]].ts` for API routing.

## Decisions Informed by Research

- Use `functions/api/[[route]].ts` with Hono `handle` for routing under `/api`.
- Configure a Pages Service Binding to a separate Worker for email delivery, and call it via `context.env.EMAIL_SERVICE.fetch(...)`.
- Implement Turnstile verification using the Siteverify API in the Pages Function.
- Use `wrangler.jsonc` for Pages and Worker configs, aligned with current Wrangler support.
