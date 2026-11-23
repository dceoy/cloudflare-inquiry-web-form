import assert from "node:assert/strict";
import { type TestContext, test } from "node:test";
import { type Env, handleContactRequest } from "./index.ts";

const BASE_ENV = {
  EMAIL_FROM: "inquiry@dceoy.com",
  EMAIL_TO: "owner@dceoy.com",
  RESEND_API_KEY: "re_test_key",
  TURNSTILE_SECRET_KEY: "test-secret",
  TURNSTILE_HOSTNAMES: "inquiry.dceoy.com",
  TURNSTILE_ACTION: "contact",
};

const VALID_SITEVERIFY_RESULT = {
  success: true,
  action: "contact",
  hostname: "inquiry.dceoy.com",
};

const LOCAL_ENV = {
  ...BASE_ENV,
  TURNSTILE_HOSTNAMES: "localhost,127.0.0.1,dummy-key.example.com",
  TURNSTILE_ACTION: "test",
};

const VALID_BODY = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Question about pricing",
  message: "Hello, I have a question.",
  turnstileToken: "token-123",
};

function makeRequest(body: unknown): Request {
  return new Request("https://inquiry.dceoy.com/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(body: string): Request {
  return new Request("https://inquiry.dceoy.com/api/contact", {
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
    const requestUrl =
      typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    calls.push({ url: requestUrl, init: init ?? {} });
    if (status === "network-error") {
      throw new Error("send failed");
    }
    return new Response(JSON.stringify({ id: "email-id" }), { status });
  };
  return { calls, fn };
}

// Resend mock whose Nth call returns the Nth outcome (the last one repeats).
function makeSequencedResendFetch(outcomes: Array<number | "network-error">) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = async (
    url: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const requestUrl =
      typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    const outcome = outcomes[Math.min(calls.length, outcomes.length - 1)];
    calls.push({ url: requestUrl, init: init ?? {} });
    if (outcome === "network-error" || outcome === undefined) {
      throw new Error("send failed");
    }
    return new Response(JSON.stringify({ id: "email-id" }), {
      status: outcome,
    });
  };
  return { calls, fn };
}

function parsePayload(
  call: { init: RequestInit } | undefined,
): Record<string, unknown> {
  const body: unknown = call?.init.body;
  return JSON.parse(typeof body === "string" ? body : "{}");
}

function makeSiteverifyFetch(
  outcome:
    | { success: boolean; action?: string; hostname?: string }
    | "network-error",
) {
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
  const siteverify = makeSiteverifyFetch(VALID_SITEVERIFY_RESULT);
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
  const siteverify = makeSiteverifyFetch(VALID_SITEVERIFY_RESULT);
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

test("a successful Siteverify response with the wrong action is rejected", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch({
    success: true,
    action: "login",
    hostname: "inquiry.dceoy.com",
  });

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    { ...BASE_ENV },
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 400);
  assert.equal(email.calls.length, 0);
});

test("a successful Siteverify response from an unapproved hostname is rejected", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch({
    success: true,
    action: "contact",
    hostname: "attacker.example",
  });

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    { ...BASE_ENV },
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 400);
  assert.equal(email.calls.length, 0);
});

test("missing Turnstile hostname configuration fails closed", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch(VALID_SITEVERIFY_RESULT);

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    { ...BASE_ENV, TURNSTILE_HOSTNAMES: "  , " },
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 500);
  assert.equal(siteverify.calls.length, 0);
  assert.equal(email.calls.length, 0);
});

for (const hostname of ["localhost", "127.0.0.1", "dummy-key.example.com"]) {
  test(`a local Turnstile test response for ${hostname} is accepted`, async () => {
    const email = makeResendFetch(200);
    const siteverify = makeSiteverifyFetch({
      success: true,
      action: "test",
      hostname,
    });

    const res = await handleContactRequest(
      makeRequest(VALID_BODY),
      LOCAL_ENV,
      siteverify.fn,
      email.fn,
    );

    assert.equal(res.status, 200);
    // Notification plus the sender copy.
    assert.equal(email.calls.length, 2);
  });
}

test("local Turnstile test configuration rejects the production action", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch({
    success: true,
    action: "contact",
    hostname: "localhost",
  });

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    LOCAL_ENV,
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 400);
  assert.equal(email.calls.length, 0);
});

test("an email send failure after Turnstile success returns a generic 502", async () => {
  const email = makeResendFetch(422);
  const siteverify = makeSiteverifyFetch(VALID_SITEVERIFY_RESULT);
  const env: Env = { ...BASE_ENV };

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    env,
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 502);
  // The notification failed, so no sender copy is attempted.
  assert.equal(email.calls.length, 1);
  const responseBody: unknown = await res.json();
  assert.ok(
    typeof responseBody === "object" &&
      responseBody !== null &&
      "error" in responseBody,
  );
  assert.equal(typeof responseBody.error, "string");
});

test("a complete success sends the notification and one sender copy and returns 200", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch(VALID_SITEVERIFY_RESULT);
  const env: Env = { ...BASE_ENV };

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    env,
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(email.calls.length, 2);

  const sent = email.calls[0];
  assert.ok(sent);
  assert.equal(sent.url, "https://api.resend.com/emails");
  assert.equal(sent.init.method, "POST");
  assert.equal(
    new Headers(sent.init.headers).get("authorization"),
    "Bearer re_test_key",
  );
  assert.ok(typeof sent.init.body === "string");
  const payload: unknown = JSON.parse(sent.init.body);
  assert.ok(
    typeof payload === "object" &&
      payload !== null &&
      "from" in payload &&
      "to" in payload &&
      "reply_to" in payload &&
      "subject" in payload &&
      "text" in payload,
  );
  assert.equal(payload.from, BASE_ENV.EMAIL_FROM);
  assert.deepEqual(payload.to, [BASE_ENV.EMAIL_TO]);
  assert.equal(payload.reply_to, VALID_BODY.email);
  assert.equal(payload.subject, `New inquiry: ${VALID_BODY.subject}`);
  assert.ok(typeof payload.text === "string");
  assert.match(payload.text, /Name: Ada Lovelace/);
  assert.match(payload.text, /Email: ada@example\.com/);
  assert.match(payload.text, /Hello, I have a question\./);
});

test("missing Resend credentials fails closed", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch(VALID_SITEVERIFY_RESULT);
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
  const siteverify = makeSiteverifyFetch(VALID_SITEVERIFY_RESULT);
  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    { ...BASE_ENV },
    siteverify.fn,
    email.fn,
  );
  assert.equal(res.status, 502);
});

test("the sender copy goes only to the submitted address with the submitted content", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch(VALID_SITEVERIFY_RESULT);

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    { ...BASE_ENV },
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 200);
  assert.equal(email.calls.length, 2);
  const [notification, copy] = email.calls;
  assert.deepEqual(parsePayload(notification)["to"], [BASE_ENV.EMAIL_TO]);

  assert.ok(copy);
  assert.equal(copy.url, "https://api.resend.com/emails");
  assert.equal(
    new Headers(copy.init.headers).get("authorization"),
    "Bearer re_test_key",
  );
  const payload = parsePayload(copy);
  assert.equal(payload["from"], BASE_ENV.EMAIL_FROM);
  assert.deepEqual(payload["to"], [VALID_BODY.email]);
  assert.equal("reply_to" in payload, false);
  assert.equal(
    payload["subject"],
    `Copy of your inquiry: ${VALID_BODY.subject}`,
  );
  const text = payload["text"];
  assert.ok(typeof text === "string");
  assert.match(text, /Name: Ada Lovelace/);
  assert.match(text, /Email: ada@example\.com/);
  assert.match(text, /Subject: Question about pricing/);
  assert.match(text, /Hello, I have a question\./);
  // Never leaks the token, the owner address or the API key.
  assert.doesNotMatch(text, /token-123|owner@dceoy\.com|re_test_key/);
});

for (const [outcome, expectedStatus] of [
  [422, "422"],
  [500, "500"],
  ["network-error", "network"],
] as const) {
  test(`a failed sender copy (${outcome}) still returns success and logs its status`, async (t: TestContext) => {
    const logged = t.mock.method(console, "error", () => undefined);
    const email = makeSequencedResendFetch([200, outcome]);
    const siteverify = makeSiteverifyFetch(VALID_SITEVERIFY_RESULT);

    const res = await handleContactRequest(
      makeRequest(VALID_BODY),
      { ...BASE_ENV },
      siteverify.fn,
      email.fn,
    );

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(email.calls.length, 2);
    assert.equal(logged.mock.callCount(), 1);
    // The log names the status (or "network"), and carries no personal data.
    const logArgs = JSON.stringify(logged.mock.calls[0]?.arguments);
    assert.ok(logArgs.includes(`(status: ${expectedStatus})`));
    assert.doesNotMatch(logArgs, /ada@example\.com|Hello, I have|Ada/);
  });
}

test("a notification failure sends no copy and keeps the 502", async () => {
  const email = makeSequencedResendFetch([500, 200]);
  const siteverify = makeSiteverifyFetch(VALID_SITEVERIFY_RESULT);

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    { ...BASE_ENV },
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 502);
  assert.equal(email.calls.length, 1);
  assert.deepEqual(parsePayload(email.calls[0])["to"], [BASE_ENV.EMAIL_TO]);
});

test("no sender copy is sent when Turnstile verification fails", async () => {
  const email = makeResendFetch(200);
  const siteverify = makeSiteverifyFetch({ success: false });

  const res = await handleContactRequest(
    makeRequest(VALID_BODY),
    { ...BASE_ENV },
    siteverify.fn,
    email.fn,
  );

  assert.equal(res.status, 400);
  assert.equal(email.calls.length, 0);
});
