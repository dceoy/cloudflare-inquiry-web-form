# Contract: POST /api/contact

## Request

- Method: POST
- Path: `/api/contact`
- Content-Type: `application/json`

```json
{
  "name": "Optional name",
  "email": "user@example.com",
  "subject": "Subject line",
  "message": "Message body",
  "turnstileToken": "token",
  "honeypot": ""
}
```

## Success Response

- Status: 200
- Body:

```json
{ "ok": true }
```

## Client Error Responses

- Status: 400 / 401 / 422
- Body:

```json
{ "ok": false, "error": "Human-readable error" }
```

## Server Error Response

- Status: 500
- Body:

```json
{ "ok": false, "error": "Unexpected error" }
```
