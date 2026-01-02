import { Hono } from "hono";
import type { Context } from "hono";
import { handle } from "hono/cloudflare-pages";
import { z } from "zod";

type Bindings = {
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_TO: string;
  EMAIL_REPLY_TO?: string;
  CORS_ALLOWED_ORIGINS?: string;
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

const fetchWithTimeout = async (
  input: RequestInfo,
  init: RequestInit,
  timeoutMs: number,
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const handleContact = async (c: Context) => {
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

  if (
    !c.env.TURNSTILE_SECRET_KEY ||
    !c.env.RESEND_API_KEY ||
    !c.env.EMAIL_FROM ||
    !c.env.EMAIL_TO
  ) {
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

  const textBody = [
    `Name: ${name?.trim() || "(not provided)"}`,
    `Email: ${email.trim()}`,
    "",
    message.trim(),
  ].join("\n");

  const resendRequest = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${c.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: c.env.EMAIL_FROM,
      to: c.env.EMAIL_TO,
      subject: `New inquiry: ${subject.trim()}`,
      text: textBody,
      reply_to: c.env.EMAIL_REPLY_TO ?? email.trim(),
    }),
  };

  const maxAttempts = 2;
  let resendResponse: Response | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      resendResponse = await fetchWithTimeout(
        "https://api.resend.com/emails",
        resendRequest,
        5000,
      );

      if (resendResponse.ok) {
        return c.json({ ok: true });
      }

      if (resendResponse.status < 500) {
        console.error("Resend rejected request:", resendResponse.status);
        return jsonError(c, 502, "Unable to deliver message right now.");
      }
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error("Resend request failed:", error);
        return jsonError(c, 502, "Unable to deliver message right now.");
      }
    }
  }

  console.error("Resend failed:", resendResponse?.status);
  return jsonError(c, 502, "Unable to deliver message right now.");
};

app.post("/contact", handleContact);
app.post("/api/contact", handleContact);

app.options("/contact", (c) => {
  applyCors(c);
  return c.body(null, 204);
});

app.options("/api/contact", (c) => {
  applyCors(c);
  return c.body(null, 204);
});

export const onRequest = handle(app);
