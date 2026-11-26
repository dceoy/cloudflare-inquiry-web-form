# Inquiry form architecture

[`workspace.dsl`](workspace.dsl) is the source of truth for the v0.2.0 C4 diagrams. Generate diagrams from the model rather than editing or committing exported images.

- **System Context:** A visitor submits an inquiry. Turnstile verifies the challenge, and Cloudflare Email Sending delivers the notification to the site owner's Google Workspace mailbox. The owner replies directly to the visitor. The visitor's copy is best effort.
- **Container:** The browser page collects and confirms the inquiry, then posts the fields and Turnstile token to the contact Worker. The Worker verifies the token and sends mail through its `EMAIL` binding.
- **Component:** Inside the Worker, the request handler calls the field validator, Turnstile verifier and email sender in order. A failed validation or verification prevents sending.
- **Deployment:** On the `inquiry.dceoy.com` custom domain, Workers Static Assets serves `public/`; only `/api/*` runs the Worker first. The page instance represents the deployed files, not a browser running at the edge.

## Validate and render

From the repository root, run the Structurizr CLI via Docker:

```sh
docker run --rm -v "$PWD:/usr/local/structurizr" structurizr/cli validate -workspace docs/architecture/workspace.dsl
docker run --rm -v "$PWD:/usr/local/structurizr" structurizr/cli export -workspace docs/architecture/workspace.dsl -format mermaid -output docs/architecture/export
```

Open the generated `.mmd` files in a Mermaid viewer. Leave `docs/architecture/export/` out of commits.
