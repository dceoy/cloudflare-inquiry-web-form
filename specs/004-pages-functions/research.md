# Research: Replace Workers With Pages Functions

## Questions

1. Can Cloudflare Pages Functions send email via Email Routing `send_email` without a Worker?
2. If not, what is the simplest way to keep Email Routing while preserving the existing `/api/contact` contract?

## Findings

- Pages Functions support standard environment bindings (secrets, vars) and Service Bindings, but `send_email` bindings are documented for Workers. Pages Functions do not expose the `send_email` binding directly.
- Keeping Email Routing therefore requires a Worker for the `send_email` binding, with Pages Functions calling it via Service Binding.

## Decision (Default)

- Keep a dedicated Email Worker with `send_email` and call it from Pages Functions via Service Binding.
- Preserve the existing `/api/contact` endpoint, JSON payload shape, and `{ ok: true } / { ok: false, error }` response structure.

## Open Items

- None. The decision aligns with the constitution’s Worker-based email delivery guidance.
