import assert from "node:assert/strict";
import { type TestContext, test } from "node:test";
import { type Env, handleContactRequest } from "./index.ts";

const BASE_ENV = {
  EMAIL_FROM: "inquiry@dceoy.com",
  EMAIL_TO: "owner@dceoy.com",
  TURNSTILE_SECRET_KEY: "test-secret",
  TURNSTILE_HOSTNAMES: "inquiry.dceoy.com",
  TURNSTILE_ACTION: "contact",
};
const BODY = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Question about pricing",
  message: "Hello, I have a question.",
  turnstileToken: "token-123",
};
const VALID = {
  success: true,
  action: "contact",
  hostname: "inquiry.dceoy.com",
};
const REFERENCE = "12345678-1234-4123-8123-123456789abc";
function request(body: unknown): Request {
  return new Request("https://inquiry.dceoy.com/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function emailBinding(outcomes: unknown[] = [null]) {
  const calls: Parameters<Env["EMAIL"]["send"]>[0][] = [];
  return {
    calls,
    binding: {
      async send(message: Parameters<Env["EMAIL"]["send"]>[0]) {
        const outcome = outcomes[Math.min(calls.length, outcomes.length - 1)];
        calls.push(message);
        if (outcome !== null) {
          throw outcome;
        }
        return { messageId: "test-id" };
      },
    },
  };
}
function siteverify(result: unknown = VALID) {
  const calls: unknown[] = [];
  return {
    calls,
    fn: async () => {
      calls.push(true);
      if (result === "network-error") {
        throw new Error("network");
      }
      return new Response(JSON.stringify(result));
    },
  };
}
function deps(verifyFetch: typeof fetch, date = "2026-11-23T11:52:00Z") {
  return {
    verifyFetch,
    now: () => new Date(date),
    randomUUID: () => REFERENCE,
  };
}

test("success sends two exact messages using one timestamp and reference", async () => {
  const email = emailBinding();
  const verify = siteverify();
  let times = 0;
  let ids = 0;
  const res = await handleContactRequest(
    request(BODY),
    { ...BASE_ENV, EMAIL: email.binding },
    {
      verifyFetch: verify.fn,
      now: () => {
        times++;
        return new Date("2026-11-23T11:52:00Z");
      },
      randomUUID: () => {
        ids++;
        return REFERENCE;
      },
    },
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(times, 1);
  assert.equal(ids, 1);
  assert.deepEqual(email.calls, [
    {
      from: "inquiry@dceoy.com",
      to: "owner@dceoy.com",
      replyTo: "ada@example.com",
      subject: "New inquiry response: Question about pricing",
      text: "You have received a new response to the inquiry form (inquiry.dceoy.com).\n\nSubmitted: 2026-11-23 20:52 JST\n\nName\nAda Lovelace\n\nEmail\nada@example.com\n\nSubject\nQuestion about pricing\n\nMessage\nHello, I have a question.\n\n---\nReply to this email to reply to the sender.\nReference: 12345678-1234-4123-8123-123456789abc",
    },
    {
      from: "inquiry@dceoy.com",
      to: "ada@example.com",
      subject: "Your inquiry response: Question about pricing",
      text: "Your inquiry has been received. This is a copy of your response.\n\nSubmitted: 2026-11-23 20:52 JST\n\nName\nAda Lovelace\n\nEmail\nada@example.com\n\nSubject\nQuestion about pricing\n\nMessage\nHello, I have a question.\n\n---\nYou received this email because this address was entered in the form.\nIf you did not send this inquiry, you can ignore this email.\nReference: 12345678-1234-4123-8123-123456789abc",
    },
  ]);
  assert.doesNotMatch(
    email.calls[1]?.text ?? "",
    /token-123|owner@dceoy\.com|test-secret/,
  );
});

test("JST rollover and multiline message with missing name", async () => {
  const email = emailBinding();
  const verify = siteverify();
  const res = await handleContactRequest(
    request({ ...BODY, name: "", message: "First line\nSecond line" }),
    { ...BASE_ENV, EMAIL: email.binding },
    deps(verify.fn, "2026-11-23T15:05:00Z"),
  );
  assert.equal(res.status, 200);
  assert.equal(
    email.calls[1]?.text,
    "Your inquiry has been received. This is a copy of your response.\n\nSubmitted: 2026-11-24 00:05 JST\n\nName\n(not provided)\n\nEmail\nada@example.com\n\nSubject\nQuestion about pricing\n\nMessage\nFirst line\nSecond line\n\n---\nYou received this email because this address was entered in the form.\nIf you did not send this inquiry, you can ignore this email.\nReference: 12345678-1234-4123-8123-123456789abc",
  );
});

test("invalid payload and oversized body stop before verification", async () => {
  for (const req of [
    request({ ...BODY, email: "invalid" }),
    new Request("https://inquiry.dceoy.com/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(BODY) + " ".repeat(16384),
    }),
  ]) {
    const email = emailBinding();
    const verify = siteverify();
    assert.equal(
      (
        await handleContactRequest(
          req,
          { ...BASE_ENV, EMAIL: email.binding },
          deps(verify.fn),
        )
      ).status,
      400,
    );
    assert.equal(verify.calls.length, 0);
    assert.equal(email.calls.length, 0);
  }
});
for (const [label, result, status] of [
  ["rejected", { success: false }, 400],
  ["wrong action", { ...VALID, action: "login" }, 400],
  ["wrong hostname", { ...VALID, hostname: "attacker.example" }, 400],
  ["network error", "network-error", 502],
] as const) {
  test(`Turnstile ${label} prevents sending`, async () => {
    const email = emailBinding();
    const verify = siteverify(result);
    assert.equal(
      (
        await handleContactRequest(
          request(BODY),
          { ...BASE_ENV, EMAIL: email.binding },
          deps(verify.fn),
        )
      ).status,
      status,
    );
    assert.equal(email.calls.length, 0);
  });
}
for (const hostname of ["localhost", "127.0.0.1", "dummy-key.example.com"]) {
  test(`local hostname ${hostname} is accepted`, async () => {
    const email = emailBinding();
    const verify = siteverify({ success: true, action: "test", hostname });
    assert.equal(
      (
        await handleContactRequest(
          request(BODY),
          {
            ...BASE_ENV,
            EMAIL: email.binding,
            TURNSTILE_HOSTNAMES: "localhost,127.0.0.1,dummy-key.example.com",
            TURNSTILE_ACTION: "test",
          },
          deps(verify.fn),
        )
      ).status,
      200,
    );
    assert.equal(email.calls.length, 2);
  });
}
test("local configuration rejects production action", async () => {
  const email = emailBinding();
  const verify = siteverify({ ...VALID, hostname: "localhost" });
  assert.equal(
    (
      await handleContactRequest(
        request(BODY),
        {
          ...BASE_ENV,
          EMAIL: email.binding,
          TURNSTILE_HOSTNAMES: "localhost",
          TURNSTILE_ACTION: "test",
        },
        deps(verify.fn),
      )
    ).status,
    400,
  );
  assert.equal(email.calls.length, 0);
});
for (const missing of ["hostnames", "binding"] as const) {
  test(`missing ${missing} fails closed`, async () => {
    const email = emailBinding();
    const verify = siteverify();
    const env: Env = {
      ...BASE_ENV,
      EMAIL: email.binding,
      ...(missing === "hostnames"
        ? { TURNSTILE_HOSTNAMES: " , " }
        : { EMAIL: undefined as unknown as Env["EMAIL"] }),
    };
    assert.equal(
      (await handleContactRequest(request(BODY), env, deps(verify.fn))).status,
      500,
    );
    assert.equal(verify.calls.length, 0);
    assert.equal(email.calls.length, 0);
  });
}
test("notification failure returns generic 502 and sends no copy", async () => {
  const email = emailBinding([{ code: "E_SENDER_DOMAIN_NOT_AVAILABLE" }, null]);
  const verify = siteverify();
  const res = await handleContactRequest(
    request(BODY),
    { ...BASE_ENV, EMAIL: email.binding },
    deps(verify.fn),
  );
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: "Failed to send message" });
  assert.equal(email.calls.length, 1);
});
for (const [error, code] of [
  [{ code: "E_RECIPIENT_PLAN_RESTRICTED" }, "E_RECIPIENT_PLAN_RESTRICTED"],
  [{ code: "E_INTERNAL_SERVER_ERROR" }, "E_INTERNAL_SERVER_ERROR"],
  [new TypeError("private"), "TYPE_ERROR"],
  [{ code: "ada@example.com", message: "private" }, "UNKNOWN_SEND_ERROR"],
] as const) {
  test(`copy failure ${code} logs only the safe code`, async (t: TestContext) => {
    const logged = t.mock.method(console, "error", () => undefined);
    const email = emailBinding([null, error]);
    const verify = siteverify();
    const res = await handleContactRequest(
      request(BODY),
      { ...BASE_ENV, EMAIL: email.binding },
      deps(verify.fn),
    );
    assert.equal(res.status, 200);
    assert.equal(email.calls.length, 2);
    assert.equal(logged.mock.callCount(), 1);
    assert.deepEqual(logged.mock.calls[0]?.arguments, [
      `Failed to send the sender copy email (code: ${code})`,
    ]);
  });
}
