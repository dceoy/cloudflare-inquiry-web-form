# Contract: POST /api/contact

## Request

**Headers**
- `Content-Type: application/json`

**Body**
```json
{
  "name": "Optional display name",
  "email": "user@example.com",
  "subject": "Hello",
  "message": "Message body",
  "turnstileToken": "token",
  "honeypot": ""
}
```

## Response

**Success**
```json
{ "ok": true }
```

**Error**
```json
{ "ok": false, "error": "message" }
```

## Notes

- Returns 4xx for validation/Turnstile failures.
- Returns 5xx/502 for provider failures.
