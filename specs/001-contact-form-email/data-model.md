# Data Model: Contact Form to Email

## Entities

### InquirySubmission

- `name` (string, optional, max 100)
- `email` (string, required, max 320)
- `subject` (string, required, max 150)
- `message` (string, required, max 2000)
- `turnstileToken` (string, required)
- `honeypot` (string, optional, should be empty)

### TurnstileVerification

- `secret` (string, required)
- `response` (string, required token)
- `remoteip` (string, optional)
- `success` (boolean)
- `error-codes` (string[])

### EmailDeliveryRequest (internal)

- `name` (string, optional)
- `email` (string, required)
- `subject` (string, required)
- `message` (string, required)
