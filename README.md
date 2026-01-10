# Contact / Inquiry Form (Cloudflare Pages)

Single-page contact form built with Vite + React. Submissions are validated in a Cloudflare Pages Functions API (Hono), verified with Turnstile, and delivered via Resend's email API.

## Architecture

- **Frontend**: Vite + React (static on Cloudflare Pages)
- **API**: Cloudflare Pages Functions with Hono at `/api/contact` (also `/contact`)
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

For detailed step-by-step deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

### Quick Summary

1. **Turnstile Setup**
   - Create a Turnstile widget for your domain
   - Get site key (public) and secret key (private)
   - Docs: https://developers.cloudflare.com/turnstile/

2. **Resend Setup**
   - Create a Resend account and get API key
   - Verify your sender domain
   - Docs: https://resend.com/docs

3. **Cloudflare Pages**
   - Connect your Git repository
   - Build command: `pnpm run build`
   - Build output directory: `dist`
   - Add environment variables (see below)

4. **Required Environment Variables**

   In your Pages project settings, add:

   | Variable                  | Type     | Purpose                            |
   | ------------------------- | -------- | ---------------------------------- |
   | `VITE_TURNSTILE_SITE_KEY` | Variable | Turnstile public key (frontend)    |
   | `TURNSTILE_SECRET_KEY`    | Secret   | Turnstile private key (API)        |
   | `RESEND_API_KEY`          | Secret   | Resend API key (starts with `re_`) |
   | `EMAIL_FROM`              | Variable | Sender address (verified domain)   |
   | `EMAIL_TO`                | Variable | Destination for form submissions   |

### Deployment Checklist

- [ ] Turnstile widget created with site and secret keys
- [ ] Resend account created with verified domain and API key
- [ ] Pages project connected to Git repository
- [ ] Build settings configured (`pnpm run build` → `dist`)
- [ ] All required environment variables set in Pages dashboard
- [ ] Test form submission after deployment

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions, troubleshooting, and production best practices.**

## Implementation Notes

- Pages Functions uses Hono’s Cloudflare Pages adapter (`handle(app)`) in `functions/api/[[route]].ts`.
- Resend API is called directly from Pages Functions.
- Turnstile tokens are verified server-side and are short-lived, single-use tokens.
- The frontend typography uses the Ubuntu font loaded in `src/index.css`.
- UI styling is centralized in `src/App.css` and aligns with a minimal, typography-first layout inspired by dceoy.com.

References:

- https://hono.dev/docs/getting-started/cloudflare-pages
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
