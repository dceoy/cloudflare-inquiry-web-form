export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<unknown>;
}

export interface Env {
  EMAIL_FROM: string;
  EMAIL_TO: string;
  TURNSTILE_SECRET_KEY: string;
  EMAIL: EmailSender;
}

interface ContactFields {
  name: string;
  email: string;
  subject: string;
  message: string;
  turnstileToken: string;
}

const MAX_REQUEST_BYTES = 16 * 1024;
const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
// Matches "local@domain.tld" while rejecting whitespace and CR/LF, since this
// value is also used as the notification email's Reply-To header.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function validateFields(body: unknown): ContactFields | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;

  let name = "";
  if (record.name !== undefined) {
    if (typeof record.name !== "string") {
      return null;
    }
    name = record.name.trim();
    if (name.length > 100) {
      return null;
    }
  }

  if (typeof record.email !== "string") {
    return null;
  }
  const email = record.email.trim();
  if (email.length === 0 || email.length > 320 || !EMAIL_RE.test(email)) {
    return null;
  }

  if (typeof record.subject !== "string") {
    return null;
  }
  const subject = record.subject.trim();
  if (subject.length < 1 || subject.length > 150 || /[\r\n]/.test(subject)) {
    return null;
  }

  if (typeof record.message !== "string") {
    return null;
  }
  const message = record.message.trim();
  if (message.length < 1 || message.length > 2000) {
    return null;
  }

  if (typeof record.turnstileToken !== "string") {
    return null;
  }
  const turnstileToken = record.turnstileToken;
  if (turnstileToken.length < 1 || turnstileToken.length > 2048) {
    return null;
  }

  return { name, email, subject, message, turnstileToken };
}

async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp: string | null,
  verifyFetch: typeof fetch,
): Promise<"success" | "rejected" | "upstream-error"> {
  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp) {
    form.set("remoteip", remoteIp);
  }

  let response: Response;
  try {
    response = await verifyFetch(SITEVERIFY_URL, {
      method: "POST",
      body: form,
    });
  } catch {
    return "upstream-error";
  }
  if (!response.ok) {
    return "upstream-error";
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return "upstream-error";
  }

  const success =
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>).success === true;
  return success ? "success" : "rejected";
}

async function sendNotification(
  env: Env,
  fields: ContactFields,
): Promise<boolean> {
  const text = [
    `Name: ${fields.name || "(not provided)"}`,
    `Email: ${fields.email}`,
    "",
    fields.message,
  ].join("\n");
  try {
    await env.EMAIL.send({
      from: env.EMAIL_FROM,
      to: env.EMAIL_TO,
      subject: `New inquiry: ${fields.subject}`,
      text,
      replyTo: fields.email,
    });
    return true;
  } catch {
    return false;
  }
}

export async function handleContactRequest(
  request: Request,
  env: Env,
  verifyFetch: typeof fetch = fetch,
): Promise<Response> {
  if (!env.TURNSTILE_SECRET_KEY || !env.EMAIL_FROM || !env.EMAIL_TO) {
    return jsonResponse(500, { error: "Server misconfigured" });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (!Number.isFinite(declaredBytes) || declaredBytes > MAX_REQUEST_BYTES) {
      return jsonResponse(400, { error: "Invalid request" });
    }
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonResponse(415, { error: "Unsupported content type" });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(await request.text());
  } catch {
    return jsonResponse(400, { error: "Invalid request" });
  }

  const fields = validateFields(parsedBody);
  if (!fields) {
    return jsonResponse(400, { error: "Invalid request" });
  }

  const remoteIp = request.headers.get("cf-connecting-ip");
  const verdict = await verifyTurnstile(
    fields.turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    remoteIp,
    verifyFetch,
  );
  if (verdict === "upstream-error") {
    return jsonResponse(502, { error: "Verification service unavailable" });
  }
  if (verdict === "rejected") {
    return jsonResponse(400, { error: "Verification failed" });
  }

  const sent = await sendNotification(env, fields);
  if (!sent) {
    return jsonResponse(502, { error: "Failed to send message" });
  }

  return jsonResponse(200, { ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/api/contact") {
      return jsonResponse(404, { error: "Not found" });
    }
    if (request.method !== "POST") {
      return jsonResponse(
        405,
        { error: "Method not allowed" },
        { Allow: "POST" },
      );
    }
    return handleContactRequest(request, env);
  },
};
