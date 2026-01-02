import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { onRequest } from "../api/[[route]].ts";

type Env = {
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_TO: string;
  EMAIL_REPLY_TO?: string;
  CORS_ALLOWED_ORIGINS?: string;
};

const baseEnv: Env = {
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  RESEND_API_KEY: "resend-key",
  EMAIL_FROM: "sender@example.com",
  EMAIL_TO: "destination@example.com",
  EMAIL_REPLY_TO: "reply@example.com",
  CORS_ALLOWED_ORIGINS: "http://localhost:5173",
};

const createRequest = (body: unknown) =>
  new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:5173",
      "cf-connecting-ip": "203.0.113.10",
    },
    body: JSON.stringify(body),
  });

const createContext = (request: Request, envOverrides: Partial<Env> = {}) =>
  ({
    request,
    env: { ...baseEnv, ...envOverrides },
    params: {},
    data: {},
    waitUntil: () => undefined,
    next: () => Promise.resolve(new Response("Not found", { status: 404 })),
  }) as unknown as Parameters<typeof onRequest>[0];

const validPayload = {
  name: "Tester",
  email: "tester@example.com",
  subject: "Hello",
  message: "Testing message",
  turnstileToken: "turnstile-token",
  honeypot: "",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const createMockFetch = (responses: Array<() => Promise<Response>>) => {
  let index = 0;
  return vi.fn(async (input: RequestInfo) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("turnstile")) {
      return responses[0]();
    }
    if (url.includes("api.resend.com")) {
      index += 1;
      return responses[index]();
    }
    return jsonResponse(500, { ok: false });
  });
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/contact", () => {
  it("sends email via Resend on valid submission", async () => {
    const fetchMock = createMockFetch([
      () => Promise.resolve(jsonResponse(200, { success: true })),
      () => Promise.resolve(jsonResponse(200, { id: "email-id" })),
    ]);

    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(
      createContext(createRequest(validPayload)),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer resend-key",
        }),
      }),
    );
  });

  it("rejects invalid payloads", async () => {
    vi.stubGlobal(
      "fetch",
      createMockFetch([
        () => Promise.resolve(jsonResponse(200, { success: true })),
      ]),
    );

    const response = await onRequest(
      createContext(createRequest({ ...validPayload, email: "not-an-email" })),
    );
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json).toEqual({
      ok: false,
      error: "Please provide valid contact details.",
    });
  });

  it("returns 400 when Turnstile verification fails", async () => {
    const fetchMock = createMockFetch([
      () => Promise.resolve(jsonResponse(200, { success: false })),
    ]);

    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(
      createContext(createRequest(validPayload)),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({
      ok: false,
      error: "Turnstile verification failed.",
    });
  });

  it("retries on Resend 5xx responses", async () => {
    const fetchMock = createMockFetch([
      () => Promise.resolve(jsonResponse(200, { success: true })),
      () => Promise.resolve(jsonResponse(500, { message: "error" })),
      () => Promise.resolve(jsonResponse(200, { id: "email-id" })),
    ]);

    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(
      createContext(createRequest(validPayload)),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });

    const resendCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("api.resend.com"),
    );
    expect(resendCalls).toHaveLength(2);
  });
});
