# Quickstart: Pages Functions Email Delivery (Resend)

## 1) Install dependencies

```bash
pnpm install
```

## 2) Set environment values

- Copy `.env.example` to `.env` for Vite.
- Copy `.dev.vars.example` to `.dev.vars` for Pages Functions.

Required Pages env vars:

- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_TO`
- Optional: `EMAIL_REPLY_TO`
- Optional: `CORS_ALLOWED_ORIGINS`

## 3) Run locally

```bash
pnpm build
pnpm dev:pages
```

## 4) Deploy to Pages

```bash
pnpm deploy:pages
```

## 5) Test

POST to `/api/contact` with a valid payload and Turnstile token.
