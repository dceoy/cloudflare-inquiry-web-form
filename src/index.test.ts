import assert from "node:assert/strict";
import { test } from "node:test";
import { type Env, handleContactRequest } from "./index.ts";

const BASE_ENV = {
  EMAIL_FROM: "inquiry@dceoy.com",
  EMAIL_TO: "owner@dceoy.com",
  RESEND_API_KEY: "re_test_key",
  TURNSTILE_SECRET_KEY: "test-secret",
};

const VALID_BODY = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Question about pricing",
  message: "Hello, I have a question.",
  turnstileToken: "token-123",
};

function makeRequest(body: unknown): Request {
  return new Request("https://example.com/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(body: string): Request {
  return new Request("https://example.com/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

function makeResendFetch(status: number | "network-error") {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = async (
    url: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    calls.push({ url: String(url), init: init ?? {} });
    if (status === "network-error") {
      throw new Error("send failed");
    }
    return new Response(JSON.stringify({ id: "email-id" }), { status });
  };
  return { calls, fn: fn as typeof fetch };
}

function makeSiteverifyFetch(outcome: { success: boolean } | "network-error") {
  const calls: unknown[] = [];
  const fn = async (): Promise<Response> => {
    calls.push(true);
    if (outcome === "network-error") {
      throw new Error("network down");
    }
    return new Response(JSON.stringify(outcome), { status: 200 });
  };
  return { fn, calls };
}

test("invalid payload is rejected before Turnstile or email are contacted", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch({ success: true });
  const env: Env = { ...BASE_ENV };

  const res = await handleContactRequest(
    makeRequest({ ...VALID_BODY, email: "not-an-email" }),
    env,
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 400);
  assert.equal(siteverify.calls.length, 0);
  assert.equal(email.calls.length, 0);
});

test("an oversized body without Content-Length is rejected before parsing", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch({ success: true });
  const env: Env = { ...BASE_ENV };
  const request = makeRawRequest(
    JSON.stringify(VALID_BODY) + " ".repeat(16 * 1024),
  );

  assert.equal(request.headers.has("content-length"), false);
  const res = await handleContactRequest(request, env, siteverify.fn, email.fn);

  assert.equal(res.status, 400);
  assert.equal(siteverify.calls.length, 0);
  assert.equal(email.calls.length, 0);
});

test("a rejected Turnstile challenge blocks the email send", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch({ success: false });
  const env: Env = { ...BASE_ENV };

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    env,
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 400);
  assert.equal(email.calls.length, 0);
});

test("an email send failure after Turnstile success returns a generic 502", async () => {
  const email = makeResendFetch(422);
  const siteverify = makeSiteverifyFetch({ success: true });
  const env: Env = { ...BASE_ENV };

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    env,
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 502);
  const responseBody = (await res.json()) as { error: unknown };
  assert.equal(typeof responseBody.error, "string");
});

test("a complete success sends exactly one notification email and returns 200", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch({ success: true });
  const env: Env = { ...BASE_ENV };

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    env,
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(email.calls.length, 1);

  const sent = email.calls[0];
  assert.equal(sent.url, "https://api.resend.com/emails");
  assert.equal(sent.init.method, "POST");
  assert.equal(
    (sent.init.headers as Record<string, string>).authorization,
    "Bearer re_test_key",
  );
  const payload = JSON.parse(sent.init.body as string);
  assert.equal(payload.from, BASE_ENV.EMAIL_FROM);
  assert.deepEqual(payload.to, [BASE_ENV.EMAIL_TO]);
  assert.equal(payload.reply_to, VALID_BODY.email);
  assert.equal(payload.subject, `New inquiry: ${VALID_BODY.subject}`);
  assert.match(payload.text, /Name: Ada Lovelace/);
  assert.match(payload.text, /Email: ada@example\.com/);
  assert.match(payload.text, /Hello, I have a question\./);
});

test("missing Resend credentials fails closed", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch({ success: true });
  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    { ...BASE_ENV, RESEND_API_KEY: "" },
    siteverify.fn,
    email.fn,
  );
  assert.equal(res.status, 500);
  assert.equal(siteverify.calls.length, 0);
  assert.equal(email.calls.length, 0);
});

test("a Resend network failure returns a generic 502", async () => {
  const email = makeResendFetch("network-error");
  const siteverify = makeSiteverifyFetch({ success: true });
  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    { ...BASE_ENV },
    siteverify.fn,
    email.fn,
  );
  assert.equal(res.status, 502);
});
