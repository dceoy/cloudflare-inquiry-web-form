import { Hono } from "hono";
import type { Context } from "hono";
import { handle } from "hono/cloudflare-pages";
import { z } from "zod";

type Bindings = {
  TURNSTILE_SECRET_KEY: string;
  WORKER_SHARED_SECRET: string;
  CORS_ALLOWED_ORIGINS?: string;
  EMAIL_WORKER: {
    fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  };
};

const app = new Hono<{ Bindings: Bindings }>();

const contactSchema = z.object({
  name: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(150),
  message: z.string().trim().min(1).max(2000),
  turnstileToken: z.string().min(1),
  honeypot: z.string().optional(),
});

type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
};

const turnstileResponseSchema = z.object({
  success: z.boolean(),
  "error-codes": z.array(z.string()).optional(),
});

const jsonError = (c: Context, status: number, error: string) =>
  c.json({ ok: false, error }, status as 400 | 401 | 422 | 500 | 502);

const applyCors = (c: Context) => {
  const origin = c.req.header("origin");
  if (!origin) {
    return;
  }

  const allowed = (c.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (allowed.length === 0 || !allowed.includes(origin)) {
    return;
  }

  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type");
  c.header("Vary", "Origin");
};

const verifyTurnstile = async (
  secret: string,
  token: string,
  remoteIp?: string | null,
): Promise<TurnstileResponse> => {
  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  let response: Response;
  try {
    response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
  } catch {
    return { success: false, "error-codes": ["siteverify_unavailable"] };
  }

  if (!response.ok) {
    return { success: false, "error-codes": ["siteverify_unavailable"] };
  }

  const data = await response.json();
  const parsed = turnstileResponseSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, "error-codes": ["invalid_siteverify_response"] };
  }

  return parsed.data;
};

app.post("/contact", async (c) => {
  applyCors(c);
  c.header("Cache-Control", "no-store");
  const contentType = c.req.header("content-type");
  if (!contentType?.includes("application/json")) {
    return jsonError(c, 400, "Content-Type must be application/json.");
  }

  let payload: unknown;

  try {
    payload = await c.req.json();
  } catch {
    return jsonError(c, 400, "Invalid JSON payload.");
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(c, 422, "Please provide valid contact details.");
  }

  const { name, email, subject, message, turnstileToken, honeypot } =
    parsed.data;

  if (honeypot && honeypot.trim().length > 0) {
    return jsonError(c, 400, "Submission rejected.");
  }

  if (!c.env.TURNSTILE_SECRET_KEY || !c.env.WORKER_SHARED_SECRET) {
    return jsonError(c, 500, "Server configuration error.");
  }

  const remoteIp =
    c.req.header("CF-Connecting-IP") ?? c.req.header("cf-connecting-ip");
  const turnstileResult = await verifyTurnstile(
    c.env.TURNSTILE_SECRET_KEY,
    turnstileToken,
    remoteIp,
  );

  if (!turnstileResult.success) {
    return jsonError(c, 400, "Turnstile verification failed.");
  }

  let workerResponse: Response;
  try {
    workerResponse = await c.env.EMAIL_WORKER.fetch(
      "https://email-worker.internal/internal/send",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-worker-auth": c.env.WORKER_SHARED_SECRET,
        },
        body: JSON.stringify({
          name: name?.trim() || undefined,
          email,
          subject,
          message,
        }),
      },
    );
  } catch {
    return jsonError(c, 502, "Unable to deliver message right now.");
  }

  if (!workerResponse.ok) {
    console.error("Email worker failed:", workerResponse.status);
    return jsonError(c, 502, "Unable to deliver message right now.");
  }

  return c.json({ ok: true });
});

app.options("/contact", (c) => {
  applyCors(c);
  return c.body(null, 204);
});

export const onRequest = handle(app);
