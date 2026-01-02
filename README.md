# Contact / Inquiry Form (Cloudflare Pages)

Single-page contact form built with Vite + React. Submissions are validated in a Cloudflare Pages Functions API (Hono), verified with Turnstile, and delivered via Resend's email API.

## Architecture

- **Frontend**: Vite + React (static on Cloudflare Pages)
- **API**: Cloudflare Pages Functions with Hono at `/api/contact`
- **Email**: Resend HTTP API
- **Security**: Turnstile verification + server-side validation

## Local Development

### 1) Install dependencies

```bash
pnpm install
```

### 2) Set environment values

- Copy `.env.example` to `.env` for the Vite dev server.
- Copy `.dev.vars.example` to `.dev.vars` for Pages Functions.

### 3) Run services

```bash
pnpm dev
```

```bash
pnpm build
pnpm dev:pages
```

Notes:

- `pnpm dev` serves the React app.
- `pnpm dev:pages` serves Pages Functions (and static build output) on port `8788`.
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
- `RESEND_API_KEY`: Resend API key
- `EMAIL_FROM`: Sender address (verified in Resend)
- `EMAIL_TO`: Destination address
- `EMAIL_REPLY_TO`: Optional reply-to address (defaults to submitter email)
- `CORS_ALLOWED_ORIGINS`: Optional comma-separated list of allowed origins (useful for local dev)

## Deployment

### 1) Turnstile

- Create a Turnstile widget for your domain.
- Set `VITE_TURNSTILE_SITE_KEY` (frontend) and `TURNSTILE_SECRET_KEY` (Pages Functions).
- Server-side validation uses the Siteverify API.

Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

### 2) Resend

- Create a Resend API key.
- Verify the sender domain and set `EMAIL_FROM`.
- Set `EMAIL_TO` for the destination mailbox.

### 3) Pages deployment

Cloudflare Pages should deploy the `dist/` output automatically. In the Pages build settings:

- Build command: `pnpm run build`
- Build output directory: `dist`
- Deploy command: leave blank (do not use `wrangler deploy` in a Pages project)

If you are deploying from CI outside Pages, use:

```bash
pnpm run deploy:pages
```

### 4) Pages project bindings

In the Pages project settings, add env vars/secrets:

- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_TO`
- `VITE_TURNSTILE_SITE_KEY`

Docs:

- https://developers.cloudflare.com/pages/functions/wrangler-configuration/

### Deployment Checklist

- [ ] Set `VITE_TURNSTILE_SITE_KEY` in Pages environment variables
- [ ] Set `TURNSTILE_SECRET_KEY` in Pages secrets
- [ ] Set `RESEND_API_KEY` in Pages secrets
- [ ] Set `EMAIL_FROM` and `EMAIL_TO` in Pages environment variables

## Implementation Notes

- Pages Functions uses Hono’s Cloudflare Pages adapter (`handle(app)`) in `functions/api/[[route]].ts`.
- Resend API is called directly from Pages Functions.
- Turnstile tokens are verified server-side and are short-lived, single-use tokens.
- The frontend typography uses the Ubuntu font loaded in `src/index.css`.
- UI styling is centralized in `src/App.css` and aligns with a minimal, typography-first layout inspired by dceoy.com.

References:

- https://hono.dev/docs/getting-started/cloudflare-pages
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
