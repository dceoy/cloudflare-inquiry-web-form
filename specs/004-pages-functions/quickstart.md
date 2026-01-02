# Quickstart: Replace Workers With Pages Functions

## Local Development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set required secrets/vars for Pages Functions (example names):

- `TURNSTILE_SECRET_KEY`
   - `WORKER_SHARED_SECRET`

3. Set required secrets/vars for the Email Worker:

   - `WORKER_SHARED_SECRET`
   - `SENDER_ADDRESS`
   - `SENDER_NAME` (optional)
   - `DESTINATION_ADDRESS`

4. Build the frontend:

   ```bash
   pnpm build
   ```

5. Run the email Worker locally:

   ```bash
   pnpm dev:workers
   ```

6. Run Pages Functions locally:

   ```bash
   pnpm dev:pages
   ```

7. In a separate terminal, run the frontend dev server if needed:

   ```bash
   pnpm dev
   ```

8. Submit a test request to `http://localhost:8788/api/contact`.

## Deployment (Pages)

1. Configure Pages + Worker environment variables for the same secrets/vars.
2. Deploy Pages:

   ```bash
   pnpm build
   pnpm deploy:pages
   ```

3. Deploy the email Worker:

   ```bash
   pnpm deploy:workers
   ```
