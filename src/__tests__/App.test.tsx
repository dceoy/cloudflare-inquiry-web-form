import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { getStoredTheme } from "../theme";

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

const setMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const setupLocalStorage = (initial: Record<string, string> = {}) => {
  let store = { ...initial };
  const localStorageMock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };

  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });

  return localStorageMock;
};

const waitForTurnstileOptions = async (
  getOptions: () => TurnstileOptions | null,
): Promise<TurnstileOptions> => {
  return waitFor(() => {
    const options = getOptions();
    if (!options) {
      throw new Error("Turnstile options not ready");
    }
    return options;
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

    const options = await waitForTurnstileOptions(getOptions);

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

    const options = await waitForTurnstileOptions(getOptions);

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

    const options = await waitForTurnstileOptions(getOptions);

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

    const options = await waitForTurnstileOptions(getOptions);

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

    const options = await waitForTurnstileOptions(getOptions);

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

    const options = await waitForTurnstileOptions(getOptions);

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

    const options = await waitForTurnstileOptions(getOptions);

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

    const options = await waitForTurnstileOptions(getOptions);

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

    const options = await waitForTurnstileOptions(getOptions);

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
        return 0 as unknown as ReturnType<typeof setTimeout>;
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

    const options = await waitForTurnstileOptions(getOptions);

    fillField("Email *", "jane@example.com");
    fillField("Subject *", "Hello");
    fillField("Message *", "Test message");

    await triggerToken(options, "token-123");

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await screen.findByText(/Your message has been sent\./i);
    expect(turnstile.reset).not.toHaveBeenCalled();
  });

  it("uses a stored theme preference on first load", () => {
    setSiteKey("");
    setupLocalStorage({ theme: "dark" });

    render(<App />);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(
      screen.getByRole("button", { name: /switch to light mode/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to system theme when no stored preference exists", () => {
    setSiteKey("");
    setupLocalStorage();
    setMatchMedia(true);

    render(<App />);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(
      screen.getByRole("button", { name: /switch to light mode/i }),
    ).toBeInTheDocument();
  });

  it("defaults to light theme when matchMedia is unavailable", () => {
    setSiteKey("");
    setupLocalStorage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).matchMedia = undefined;

    render(<App />);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(
      screen.getByRole("button", { name: /switch to dark mode/i }),
    ).toBeInTheDocument();
  });

  it("toggles theme and persists selection with storage errors ignored", () => {
    setSiteKey("");
    const localStorageMock = setupLocalStorage();
    setMatchMedia(false);

    const setItemSpy = vi
      .spyOn(localStorageMock, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });

    render(<App />);

    const toggle = screen.getByRole("button", {
      name: /switch to dark mode/i,
    });
    fireEvent.click(toggle);
    fireEvent.click(
      screen.getByRole("button", { name: /switch to light mode/i }),
    );

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(setItemSpy).toHaveBeenCalled();
  });

  it("returns null stored theme when window is unavailable", () => {
    const originalWindow = window;
    vi.stubGlobal("window", undefined as unknown as Window);

    expect(getStoredTheme()).toBeNull();

    vi.stubGlobal("window", originalWindow);
  });
});
