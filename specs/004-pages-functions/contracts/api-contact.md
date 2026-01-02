# Contract: POST /api/contact

## Summary

Accepts inquiry submissions, validates input, verifies Turnstile, and sends an email via the Email Worker (Email Routing).

## Request

- Method: `POST`
- Path: `/api/contact`
- Headers: `Content-Type: application/json`

### Body

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Project inquiry",
  "message": "Hello...",
  "turnstileToken": "<token>",
  "honeypot": ""
}
```

## Success Response

- Status: `200`

```json
{ "ok": true }
```

## Client Error Responses

- Status: `400` for invalid content-type, malformed JSON, honeypot triggered, or Turnstile failures.
- Status: `422` for validation errors.

```json
{ "ok": false, "error": "Human-readable message" }
```

## Server Error Responses

- Status: `500` for misconfiguration or unexpected failures.
- Status: `502` for provider delivery failures.

```json
{ "ok": false, "error": "Unable to deliver message right now." }
```
