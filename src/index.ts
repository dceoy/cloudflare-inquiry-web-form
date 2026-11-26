interface OutboundEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

interface SendEmail {
  send(message: OutboundEmail): Promise<{ messageId: string }>;
}

export interface Env {
  EMAIL: SendEmail;
  EMAIL_FROM: string;
  EMAIL_TO: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_HOSTNAMES: string;
  TURNSTILE_ACTION: string;
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
const SITEVERIFY_TIMEOUT_MS = 10_000;
// Matches "local@domain.tld" while rejecting whitespace and CR/LF, since this
// value is also used as the notification email's Reply-To header.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECT_NEWLINE_RE = /[\r\n]/u;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateFields(body: unknown): ContactFields | null {
  if (!isRecord(body)) {
    return null;
  }
  const record = body;

  let name = "";
  if (record["name"] !== undefined) {
    if (typeof record["name"] !== "string") {
      return null;
    }
    name = record["name"].trim();
    if (name.length > 100) {
      return null;
    }
  }

  if (typeof record["email"] !== "string") {
    return null;
  }
  const email = record["email"].trim();
  if (email.length === 0 || email.length > 320 || !EMAIL_RE.test(email)) {
    return null;
  }

  if (typeof record["subject"] !== "string") {
    return null;
  }
  const subject = record["subject"].trim();
  if (
    subject.length < 1 ||
    subject.length > 150 ||
    SUBJECT_NEWLINE_RE.test(subject)
  ) {
    return null;
  }

  if (typeof record["message"] !== "string") {
    return null;
  }
  const message = record["message"].trim();
  if (message.length < 1 || message.length > 2000) {
    return null;
  }

  if (typeof record["turnstileToken"] !== "string") {
    return null;
  }
  const turnstileToken = record["turnstileToken"];
  if (turnstileToken.length < 1 || turnstileToken.length > 2048) {
    return null;
  }

  return { name, email, subject, message, turnstileToken };
}

async function readBodyWithinLimit(request: Request): Promise<string | null> {
  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

async function verifyTurnstile(
  token: string,
  secret: string,
  expectedAction: string,
  allowedHostnames: Set<string>,
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
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
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

  if (!isRecord(data)) {
    return "rejected";
  }
  const result = data;
  const hostname =
    typeof result["hostname"] === "string"
      ? result["hostname"].toLowerCase()
      : "";
  return result["success"] === true &&
    result["action"] === expectedAction &&
    allowedHostnames.has(hostname)
    ? "success"
    : "rejected";
}

interface ResponseRecord {
  readonly submitted: string;
  readonly reference: string;
  readonly name: string;
  readonly email: string;
  readonly subject: string;
  readonly message: string;
}

const submittedFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tokyo",
  calendar: "gregory",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatSubmittedAt(date: Date): string {
  const parts = submittedFormatter.formatToParts(date);
  const required = (type: Intl.DateTimeFormatPartTypes): string => {
    const value = parts.find((part) => part.type === type)?.value;
    if (value === undefined) {
      throw new Error(`Missing date part: ${type}`);
    }
    return value;
  };
  return `${required("year")}-${required("month")}-${required("day")} ${required("hour")}:${required("minute")} JST`;
}

function buildResponseSection(record: ResponseRecord): string {
  return [
    `Submitted: ${record.submitted}`,
    `Name\n${record.name}`,
    `Email\n${record.email}`,
    `Subject\n${record.subject}`,
    `Message\n${record.message}`,
  ].join("\n\n");
}

const SEND_ERROR_CODES = new Set([
  "E_VALIDATION_ERROR",
  "E_FIELD_MISSING",
  "E_TOO_MANY_RECIPIENTS",
  "E_TOO_MANY_ATTACHMENTS",
  "E_SENDER_NOT_VERIFIED",
  "E_SENDER_DOMAIN_NOT_AVAILABLE",
  "E_SENDER_DOMAIN_NOT_CONFIGURED",
  "E_EMAIL_SENDING_NOT_READY",
  "E_RECIPIENT_NOT_ALLOWED",
  "E_RECIPIENT_PLAN_RESTRICTED",
  "E_RECIPIENT_SUPPRESSED",
  "E_ACCOUNT_SUSPENDED",
  "E_CONTENT_TOO_LARGE",
  "E_DELIVERY_FAILED",
  "E_RATE_LIMIT_EXCEEDED",
  "E_DAILY_LIMIT_EXCEEDED",
  "E_INTERNAL_SERVER_ERROR",
  "E_HEADER_NOT_ALLOWED",
  "E_HEADER_USE_API_FIELD",
  "E_HEADER_VALUE_INVALID",
  "E_HEADER_VALUE_TOO_LONG",
  "E_HEADER_NAME_INVALID",
  "E_HEADERS_TOO_LARGE",
  "E_HEADERS_TOO_MANY",
]);

type SendResult = { ok: true } | { ok: false; code: string };

async function sendEmail(
  binding: SendEmail,
  message: OutboundEmail,
): Promise<SendResult> {
  try {
    await binding.send(message);
    return { ok: true };
  } catch (error) {
    if (
      isRecord(error) &&
      typeof error["code"] === "string" &&
      SEND_ERROR_CODES.has(error["code"])
    ) {
      return { ok: false, code: error["code"] };
    }
    return {
      ok: false,
      code:
        error instanceof TypeError && !(isRecord(error) && "code" in error)
          ? "TYPE_ERROR"
          : "UNKNOWN_SEND_ERROR",
    };
  }
}

function sendNotification(
  env: Env,
  record: ResponseRecord,
): Promise<SendResult> {
  return sendEmail(env.EMAIL, {
    from: env.EMAIL_FROM,
    to: env.EMAIL_TO,
    replyTo: record.email,
    subject: `New inquiry response: ${record.subject}`,
    text: [
      "You have received a new response to the inquiry form (inquiry.dceoy.com).",
      buildResponseSection(record),
      `---\nReply to this email to reply to the sender.\nReference: ${record.reference}`,
    ].join("\n\n"),
  });
}

function sendSenderCopy(env: Env, record: ResponseRecord): Promise<SendResult> {
  return sendEmail(env.EMAIL, {
    from: env.EMAIL_FROM,
    to: record.email,
    subject: `Your inquiry response: ${record.subject}`,
    text: [
      "Your inquiry has been received. This is a copy of your response.",
      buildResponseSection(record),
      `---\nYou received this email because this address was entered in the form.\nIf you did not send this inquiry, you can ignore this email.\nReference: ${record.reference}`,
    ].join("\n\n"),
  });
}

interface ContactDeps {
  verifyFetch?: typeof fetch;
  now?: () => Date;
  randomUUID?: () => string;
}

export async function handleContactRequest(
  request: Request,
  env: Env,
  deps: ContactDeps = {},
): Promise<Response> {
  const allowedHostnames = new Set(
    (env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
  if (
    !env.TURNSTILE_SECRET_KEY ||
    !env.TURNSTILE_ACTION ||
    allowedHostnames.size === 0 ||
    typeof env.EMAIL?.send !== "function" ||
    !env.EMAIL_FROM ||
    !env.EMAIL_TO
  ) {
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

  let requestBody: string | null;
  try {
    requestBody = await readBodyWithinLimit(request);
  } catch {
    return jsonResponse(400, { error: "Invalid request" });
  }
  if (requestBody === null) {
    return jsonResponse(400, { error: "Invalid request" });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(requestBody);
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
    env.TURNSTILE_ACTION,
    allowedHostnames,
    remoteIp,
    deps.verifyFetch ?? fetch,
  );
  if (verdict === "upstream-error") {
    return jsonResponse(502, { error: "Verification service unavailable" });
  }
  if (verdict === "rejected") {
    return jsonResponse(400, { error: "Verification failed" });
  }

  const record: ResponseRecord = {
    submitted: formatSubmittedAt((deps.now ?? (() => new Date()))()),
    reference: (deps.randomUUID ?? (() => crypto.randomUUID()))(),
    name: fields.name || "(not provided)",
    email: fields.email,
    subject: fields.subject,
    message: fields.message,
  };
  const sent = await sendNotification(env, record);
  if (!sent.ok) {
    return jsonResponse(502, { error: "Failed to send message" });
  }

  // The notification is authoritative: a failed copy never fails the request.
  const copy = await sendSenderCopy(env, record);
  if (!copy.ok) {
    // biome-ignore lint/suspicious/noConsole: server-side log of a best-effort failure
    console.error(`Failed to send the sender copy email (code: ${copy.code})`);
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
    return await handleContactRequest(request, env);
  },
};
