import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
};

type TurnstileMock = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
};

type WindowWithTurnstile = Window & { turnstile?: TurnstileMock };

const LENGTH_LIMITS = {
  name: 100,
  subject: 150,
  message: 2000,
};

const setSiteKey = (value: string) => {
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", value);
};

const setupTurnstile = (renderReturn = "widget-id") => {
  let options: TurnstileOptions | null = null;
  const turnstile: TurnstileMock = {
    render: vi.fn((_container: HTMLElement, nextOptions: TurnstileOptions) => {
      options = nextOptions;
      return renderReturn;
    }),
    remove: vi.fn(),
    reset: vi.fn(),
  };

  (window as WindowWithTurnstile).turnstile = turnstile;

  return {
    turnstile,
    getOptions: () => options,
  };
};

const fillField = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value },
  });
};

const triggerToken = async (options: TurnstileOptions, token: string) => {
  await act(async () => {
    options.callback(token);
  });
};

const triggerExpire = async (options: TurnstileOptions) => {
  await act(async () => {
    options["expired-callback"]?.();
  });
};

const triggerError = async (options: TurnstileOptions) => {
  await act(async () => {
    options["error-callback"]?.();
  });
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  delete (window as WindowWithTurnstile).turnstile;
});

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("App", () => {
  it("renders missing site key message and disables submit", () => {
    setSiteKey("");

    render(<App />);

    expect(
      screen.getByText(
        /Turnstile site key is missing\. Set VITE_TURNSTILE_SITE_KEY to enable submissions\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send message/i }),
    ).toBeDisabled();
  });

  it("validates required fields and token", async () => {
    setSiteKey("test-site-key");
    setupTurnstile();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText(/Email is required\./i)).toBeInTheDocument();
    expect(screen.getByText(/Subject is required\./i)).toBeInTheDocument();
    expect(screen.getByText(/Message is required\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/Please complete the verification challenge\./i),
    ).toBeInTheDocument();
  });

  it("validates invalid values and length limits", async () => {
    setSiteKey("test-site-key");
    const { getOptions } = setupTurnstile();

    render(<App />);

    const options = await waitFor(() => {
      const value = getOptions();
      if (!value) {
        throw new Error("Turnstile options not ready");
      }
      return value;
    });

    await triggerToken(options, "token-123");

    fillField("Name", "a".repeat(LENGTH_LIMITS.name + 1));
    fillField("Email *", "invalid-email");
    fillField("Subject *", "b".repeat(LENGTH_LIMITS.subject + 1));
    fillField("Message *", "c".repeat(LENGTH_LIMITS.message + 1));

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/Enter a valid email address\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Name must be 100 characters or fewer\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Subject must be 150 characters or fewer\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Message must be 2000 characters or fewer\./i),
    ).toBeInTheDocument();
  });

  it("submits successfully and resets the form", async () => {
    setSiteKey("test-site-key");
    const { turnstile, getOptions } = setupTurnstile();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    const options = await waitFor(() => {
      const value = getOptions();
      if (!value) {
        throw new Error("Turnstile options not ready");
      }
      return value;
    });

    fillField("Name", "Jane Doe");
    fillField("Email *", "jane@example.com");
    fillField("Subject *", "Hello");
    fillField("Message *", "Test message");

    await triggerToken(options, "token-123");

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/Your message has been sent\./i),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(turnstile.reset).toHaveBeenCalledWith("widget-id");
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Email *")).toHaveValue("");
    expect(screen.getByLabelText("Subject *")).toHaveValue("");
    expect(screen.getByLabelText("Message *")).toHaveValue("");
  });

  it("handles server error responses and shows the error message", async () => {
    setSiteKey("test-site-key");
    const { turnstile, getOptions } = setupTurnstile();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Service unavailable." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    const options = await waitFor(() => {
      const value = getOptions();
      if (!value) {
        throw new Error("Turnstile options not ready");
      }
      return value;
    });

    fillField("Email *", "jane@example.com");
    fillField("Subject *", "Hello");
    fillField("Message *", "Test message");

    await triggerToken(options, "token-123");

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/Service unavailable\./i),
    ).toBeInTheDocument();
    expect(turnstile.reset).toHaveBeenCalledWith("widget-id");
  });

  it("uses a fallback server error message when none is provided", async () => {
    setSiteKey("test-site-key");
    const { getOptions } = setupTurnstile();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    const options = await waitFor(() => {
      const value = getOptions();
      if (!value) {
        throw new Error("Turnstile options not ready");
      }
      return value;
    });

    fillField("Email *", "jane@example.com");
    fillField("Subject *", "Hello");
    fillField("Message *", "Test message");

    await triggerToken(options, "token-123");

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/Unable to send your message right now\./i),
    ).toBeInTheDocument();
  });

  it("falls back to a default status message when the error is empty", async () => {
    setSiteKey("test-site-key");
    const { getOptions } = setupTurnstile();

    const fetchMock = vi.fn().mockRejectedValue(new Error(""));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    const options = await waitFor(() => {
      const value = getOptions();
      if (!value) {
        throw new Error("Turnstile options not ready");
      }
      return value;
    });

    fillField("Email *", "jane@example.com");
    fillField("Subject *", "Hello");
    fillField("Message *", "Test message");

    await triggerToken(options, "token-123");

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/Something went wrong\. Please try again\./i),
    ).toBeInTheDocument();
  });

  it("handles non-Error exceptions", async () => {
    setSiteKey("test-site-key");
    const { getOptions } = setupTurnstile();

    const fetchMock = vi.fn().mockRejectedValue("boom");
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    const options = await waitFor(() => {
      const value = getOptions();
      if (!value) {
        throw new Error("Turnstile options not ready");
      }
      return value;
    });

    fillField("Email *", "jane@example.com");
    fillField("Subject *", "Hello");
    fillField("Message *", "Test message");

    await triggerToken(options, "token-123");

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText(/Unexpected error\./i)).toBeInTheDocument();
  });

  it("prevents duplicate submissions while submitting", async () => {
    setSiteKey("test-site-key");
    const { getOptions } = setupTurnstile();

    let resolveFetch:
      | ((value: { ok: boolean; json: () => Promise<object> }) => void)
      | null = null;
    const fetchPromise = new Promise<{
      ok: boolean;
      json: () => Promise<object>;
    }>((resolve) => {
      resolveFetch = resolve;
    });

    const fetchMock = vi.fn().mockReturnValue(fetchPromise);
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<App />);

    const options = await waitFor(() => {
      const value = getOptions();
      if (!value) {
        throw new Error("Turnstile options not ready");
      }
      return value;
    });

    fillField("Email *", "jane@example.com");
    fillField("Subject *", "Hello");
    fillField("Message *", "Test message");

    await triggerToken(options, "token-123");

    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveFetch?.({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it("clears token errors when a token arrives", async () => {
    setSiteKey("test-site-key");
    const { getOptions } = setupTurnstile();

    render(<App />);

    const options = await waitFor(() => {
      const value = getOptions();
      if (!value) {
        throw new Error("Turnstile options not ready");
      }
      return value;
    });

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/Please complete the verification challenge\./i),
    ).toBeInTheDocument();

    await triggerToken(options, "token-123");

    await waitFor(() =>
      expect(
        screen.queryByText(/Please complete the verification challenge\./i),
      ).not.toBeInTheDocument(),
    );
  });

  it("updates token state on turnstile expire and error", async () => {
    setSiteKey("test-site-key");
    const { getOptions } = setupTurnstile();

    render(<App />);

    const options = await waitFor(() => {
      const value = getOptions();
      if (!value) {
        throw new Error("Turnstile options not ready");
      }
      return value;
    });

    await triggerToken(options, "token-123");
    await triggerExpire(options);

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(
      await screen.findByText(/Please complete the verification challenge\./i),
    ).toBeInTheDocument();

    await triggerError(options);

    expect(
      await screen.findByText(/Verification failed\. Try again\./i),
    ).toBeInTheDocument();
  });

  it("retries rendering turnstile when the script is not ready", async () => {
    setSiteKey("test-site-key");
    vi.useFakeTimers();

    const { unmount } = render(<App />);

    await act(async () => {});

    expect(vi.getTimerCount()).toBeGreaterThan(0);

    const { turnstile } = setupTurnstile();
    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(turnstile.render).toHaveBeenCalled();

    unmount();
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it("stops retrying after max attempts when turnstile is unavailable", () => {
    setSiteKey("test-site-key");
    const timeoutSpy = vi
      .spyOn(window, "setTimeout")
      .mockImplementation((handler: TimerHandler) => {
        if (typeof handler === "function") {
          handler();
        }
        return 0;
      });

    render(<App />);

    expect(timeoutSpy).toHaveBeenCalledTimes(50);
  });

  it("removes the turnstile widget on rerender and cleanup", async () => {
    setSiteKey("test-site-key");
    const { turnstile } = setupTurnstile();

    const { unmount } = render(<App />);

    await waitFor(() => expect(turnstile.render).toHaveBeenCalled());

    fillField("Name", "Jane Doe");

    await waitFor(() => expect(turnstile.remove).toHaveBeenCalled());

    unmount();

    expect(turnstile.remove).toHaveBeenCalled();
  });

  it("does not reset the widget when the render returns no id", async () => {
    setSiteKey("test-site-key");
    const { turnstile, getOptions } = setupTurnstile("");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    const options = await waitFor(() => {
      const value = getOptions();
      if (!value) {
        throw new Error("Turnstile options not ready");
      }
      return value;
    });

    fillField("Email *", "jane@example.com");
    fillField("Subject *", "Hello");
    fillField("Message *", "Test message");

    await triggerToken(options, "token-123");

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await screen.findByText(/Your message has been sent\./i);
    expect(turnstile.reset).not.toHaveBeenCalled();
  });
});
