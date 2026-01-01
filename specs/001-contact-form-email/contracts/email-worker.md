# Contract: POST /internal/send (Email Worker)

## Request

- Method: POST
- Path: `/internal/send`
- Content-Type: `application/json`
- Auth: `X-Worker-Auth: <shared-secret>`

```json
{
  "name": "Optional name",
  "email": "user@example.com",
  "subject": "Subject line",
  "message": "Message body"
}
```

## Success Response

- Status: 200
- Body:

```json
{ "ok": true }
```

## Error Responses

- Status: 401 for invalid auth
- Status: 400 for invalid payload
- Status: 500 for email send failure
