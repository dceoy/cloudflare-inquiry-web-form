# Data Model: Pages Functions Email Delivery (Resend)

**Date**: 2026-01-02

## ContactSubmission

- `name?: string`
- `email: string`
- `subject: string`
- `message: string`
- `turnstileToken: string`
- `honeypot?: string`

## EmailConfig

- `RESEND_API_KEY: string`
- `EMAIL_FROM: string`
- `EMAIL_TO: string`
- `EMAIL_REPLY_TO?: string`
- `SENDER_NAME?: string` (optional; can be embedded in `EMAIL_FROM` if desired)
