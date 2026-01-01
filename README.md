# Contact / Inquiry Form (Cloudflare Pages + Workers)

Single-page contact form built with Vite + React. Submissions are validated in a Cloudflare Pages Functions API (Hono), verified with Turnstile, and delivered via a dedicated Email Worker using Email Routing `send_email`.

## Architecture

- **Frontend**: Vite + React (static on Cloudflare Pages)
- **API**: Cloudflare Pages Functions with Hono at `/api/contact`
- **Email**: Dedicated Cloudflare Worker with `send_email` binding
- **Security**: Turnstile verification + shared secret between Pages and Worker

## Local Development

### 1) Install dependencies

```bash
pnpm install
```

### 2) Set environment values

- Copy `.env.example` to `.env` for the Vite dev server.
- Copy `.dev.vars.example` to `.dev.vars` for Pages Functions.
- Copy `worker/.dev.vars.example` to `worker/.dev.vars` for the email Worker.

### 3) Run services

```bash
pnpm dev
```

```bash
pnpm dev:workers
```

```bash
pnpm build
pnpm dev:pages
```

Notes:

- `pnpm dev` serves the React app.
- `pnpm dev:workers` runs the email Worker locally.
- `pnpm dev:pages` serves Pages Functions (and static build output) on port `8788` and connects to the worker via `--service`.
- `VITE_API_BASE_URL` should point to `http://localhost:8788` when using the Vite dev server.
- For Vite dev server + Pages API, set `CORS_ALLOWED_ORIGINS` to `http://localhost:5173` in `.dev.vars`.

## Testing

```bash
pnpm test
```

```bash
pnpm test:coverage
```

Notes:

- Run `pnpm test -- --watch` for watch mode.
- Coverage reports are generated in `coverage/` (open `coverage/index.html`).

## Configuration & Secrets

### Frontend (Vite)

- `VITE_TURNSTILE_SITE_KEY`: Turnstile site key (public)
- `VITE_API_BASE_URL`: Optional override for API base URL (default is same-origin)

### Pages Functions (API)

Set via Cloudflare Pages env vars/secrets or `.dev.vars`:

- `TURNSTILE_SECRET_KEY`: Turnstile secret key
- `WORKER_SHARED_SECRET`: Shared secret used to authenticate the Worker call
- `CORS_ALLOWED_ORIGINS`: Optional comma-separated list of allowed origins (useful for local dev)

### Email Worker

Set via Worker env vars or `worker/.dev.vars`:

- `WORKER_SHARED_SECRET`: Must match the Pages value
- `SENDER_ADDRESS`: Sender address on your Email Routing domain
- `SENDER_NAME`: Optional display name
- `DESTINATION_ADDRESS`: Recipient address (should match `send_email.destination_address`)

## Deployment

### 1) Turnstile

- Create a Turnstile widget for your domain.
- Set `VITE_TURNSTILE_SITE_KEY` (frontend) and `TURNSTILE_SECRET_KEY` (Pages Functions).
- Server-side validation uses the Siteverify API.

Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

### 2) Email Routing

- Enable Email Routing for your domain.
- Set the sender address to a mailbox on the Email Routing domain.
- Configure `send_email` binding in `worker/wrangler.jsonc` with a fixed `destination_address`.

Docs: https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/

### 3) Pages deployment

Cloudflare Pages should deploy the `dist/` output automatically. In the Pages build settings:

- Build command: `pnpm run build`
- Build output directory: `dist`
- Deploy command: leave blank (do not use `wrangler deploy` in a Pages project)

If you are deploying from CI outside Pages, use:

```bash
pnpm run deploy:pages
```

### 4) Worker deployment

```bash
pnpm run deploy:workers
```

### 5) Pages project bindings

In the Pages project settings:

- Add a Service Binding: `EMAIL_WORKER` → `contact-form-email-worker`
- Add env vars/secrets:
  - `TURNSTILE_SECRET_KEY`
  - `WORKER_SHARED_SECRET`
  - `VITE_TURNSTILE_SITE_KEY`

Docs:

- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/

### Deployment Checklist

- [ ] Replace placeholder addresses in `worker/wrangler.jsonc`
- [ ] Set `VITE_TURNSTILE_SITE_KEY` in Pages environment variables
- [ ] Set `TURNSTILE_SECRET_KEY` in Pages secrets
- [ ] Set `WORKER_SHARED_SECRET` in Pages + Worker secrets
- [ ] Create Service Binding `EMAIL_WORKER` → `contact-form-email-worker`

## Implementation Notes

- Pages Functions uses Hono’s Cloudflare Pages adapter (`handle(app)`) in `functions/api/[[route]].ts`.
- Service bindings are used to call the email worker from Pages Functions.
- Turnstile tokens are verified server-side and are short-lived, single-use tokens.
- The frontend typography uses the Ubuntu font loaded in `src/index.css`.
- UI styling is centralized in `src/App.css` and aligns with a minimal, typography-first layout inspired by dceoy.com.

References:

- https://hono.dev/docs/getting-started/cloudflare-pages
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
