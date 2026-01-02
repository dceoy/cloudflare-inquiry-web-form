# Data Model: Replace Workers With Pages Functions

## Entities

### Inquiry Submission

- **Fields**: `name?`, `email`, `subject`, `message`, `turnstileToken`, `honeypot?`
- **Source**: JSON payload posted to `/api/contact`
- **Validation**: Zod schema in `functions/api/[[route]].ts`

### Email Provider Request

- **Fields**: `from`, `to`, `subject`, `text`/`html`, optional `reply_to`
- **Source**: Derived from Inquiry Submission and environment configuration
- **Validation**: Provider-specific constraints enforced before dispatch

## Environment Bindings

### Pages Functions

- `TURNSTILE_SECRET_KEY` (secret)
- `WORKER_SHARED_SECRET` (secret)
- `CORS_ALLOWED_ORIGINS` (string, optional)

### Email Worker

- `WORKER_SHARED_SECRET` (secret)
- `SENDER_ADDRESS` (string)
- `SENDER_NAME` (string, optional)
- `DESTINATION_ADDRESS` (string)
