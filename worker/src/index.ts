import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

interface Env {
  SEND_EMAIL: {
    send: (message: EmailMessage) => Promise<void>;
  };
  WORKER_SHARED_SECRET: string;
  SENDER_ADDRESS: string;
  SENDER_NAME?: string;
  DESTINATION_ADDRESS: string;
}

type Payload = {
  name?: string;
  email: string;
  subject: string;
  message: string;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

const isNonEmpty = (value: string | undefined, max: number) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/internal/send") {
      return new Response("Not found", { status: 404 });
    }

    const authHeader = request.headers.get("x-worker-auth");
    if (!authHeader || authHeader !== env.WORKER_SHARED_SECRET) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    let payload: Payload;
    try {
      payload = (await request.json()) as Payload;
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);
    }

    if (
      !isNonEmpty(payload.email, 320) ||
      !isNonEmpty(payload.subject, 150) ||
      !isNonEmpty(payload.message, 2000)
    ) {
      return jsonResponse({ ok: false, error: "Invalid payload" }, 400);
    }

    if (!env.SENDER_ADDRESS || !env.DESTINATION_ADDRESS) {
      return jsonResponse({ ok: false, error: "Missing email configuration" }, 500);
    }

    const senderName = env.SENDER_NAME?.trim() || "Contact Form";
    const subjectLine = `New inquiry: ${payload.subject.trim()}`;
    const textBody = [
      `Name: ${payload.name?.trim() || "(not provided)"}`,
      `Email: ${payload.email.trim()}`,
      "",
      payload.message.trim(),
    ].join("\n");

    const mimeMessage = createMimeMessage();
    mimeMessage.setSender({ name: senderName, addr: env.SENDER_ADDRESS });
    mimeMessage.setRecipient(env.DESTINATION_ADDRESS);
    mimeMessage.setSubject(subjectLine);
    mimeMessage.addMessage({ contentType: "text/plain", data: textBody });

    const emailMessage = new EmailMessage(
      env.SENDER_ADDRESS,
      env.DESTINATION_ADDRESS,
      mimeMessage.asRaw()
    );

    try {
      await env.SEND_EMAIL.send(emailMessage);
    } catch {
      return jsonResponse({ ok: false, error: "Email send failed" }, 500);
    }

    return jsonResponse({ ok: true });
  },
};
