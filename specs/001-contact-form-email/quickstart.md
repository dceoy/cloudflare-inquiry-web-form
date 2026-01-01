# Quickstart: Contact Form to Email (Local Dev)

## Prereqs

- Node.js + pnpm
- Wrangler CLI authenticated

## Run Frontend

```bash
pnpm dev
```

## Run Pages Functions (local)

```bash
pnpm dev:pages
```

## Run Email Worker (local)

```bash
pnpm dev:workers
```

## Notes

- Provide required secrets via `.dev.vars` for Pages and Worker.
- Use the local Pages dev URL for the form submission.
