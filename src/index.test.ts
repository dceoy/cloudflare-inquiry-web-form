import assert from "node:assert/strict";
import { test } from "node:test";
import { type Env, type EmailMessage, handleContactRequest } from "./index.ts";

const BASE_ENV = {
  EMAIL_FROM: "inquiries@example.com",
  EMAIL_TO: "team@example.com",
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

function makeEmailSender(fail: boolean) {
  const calls: EmailMessage[] = [];
  return {
    calls,
    async send(message: EmailMessage): Promise<void> {
      calls.push(message);
      if (fail) {
        throw new Error("send failed");
      }
    },
  };
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
  const email = makeEmailSender(false);
  const siteverify = makeSiteverifyFetch({ success: true });
  const env: Env = { ...BASE_ENV, EMAIL: email };

  const res = await handleContactRequest(
    makeRequest({ ...VALID_BODY, email: "not-an-email" }),
    env,
    siteverify.fn,
  );

  assert.equal(res.status, 400);
  assert.equal(siteverify.calls.length, 0);
  assert.equal(email.calls.length, 0);
});

test("an oversized body without Content-Length is rejected before parsing", async () => {
  const email = makeEmailSender(false);
  const siteverify = makeSiteverifyFetch({ success: true });
  const env: Env = { ...BASE_ENV, EMAIL: email };
  const request = makeRawRequest(
    JSON.stringify(VALID_BODY) + " ".repeat(16 * 1024),
  );

  assert.equal(request.headers.has("content-length"), false);
  const res = await handleContactRequest(request, env, siteverify.fn);

  assert.equal(res.status, 400);
  assert.equal(siteverify.calls.length, 0);
  assert.equal(email.calls.length, 0);
});

test("a rejected Turnstile challenge blocks the email send", async () => {
  const email = makeEmailSender(false);
  const siteverify = makeSiteverifyFetch({ success: false });
  const env: Env = { ...BASE_ENV, EMAIL: email };

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    env,
    siteverify.fn,
  );

  assert.equal(res.status, 400);
  assert.equal(email.calls.length, 0);
});

test("an email send failure after Turnstile success returns a generic 502", async () => {
  const email = makeEmailSender(true);
  const siteverify = makeSiteverifyFetch({ success: true });
  const env: Env = { ...BASE_ENV, EMAIL: email };

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    env,
    siteverify.fn,
  );

  assert.equal(res.status, 502);
  const responseBody = (await res.json()) as { error: unknown };
  assert.equal(typeof responseBody.error, "string");
});

test("a complete success sends exactly one notification email and returns 200", async () => {
  const email = makeEmailSender(false);
  const siteverify = makeSiteverifyFetch({ success: true });
  const env: Env = { ...BASE_ENV, EMAIL: email };

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    env,
    siteverify.fn,
  );

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(email.calls.length, 1);

  const sent = email.calls[0];
  assert.equal(sent.from, BASE_ENV.EMAIL_FROM);
  assert.equal(sent.to, BASE_ENV.EMAIL_TO);
  assert.equal(sent.replyTo, VALID_BODY.email);
  assert.equal(sent.subject, `New inquiry: ${VALID_BODY.subject}`);
  assert.match(sent.text, /Name: Ada Lovelace/);
  assert.match(sent.text, /Email: ada@example\.com/);
  assert.match(sent.text, /Hello, I have a question\./);
});
