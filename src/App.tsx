import type { ChangeEvent } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Theme } from "./theme";
import { getInitialTheme, themeStorageKey } from "./theme";
import "./App.css";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  honeypot: string;
};

type FormErrors = Partial<
  Record<keyof FormState | "turnstileToken" | "form", string>
>;

type TurnstileHandle = {
  reset: () => void;
};

type TurnstileWidgetProps = {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
};

const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(
  ({ siteKey, onToken, onExpire, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);

    const renderWidget = useCallback(() => {
      if (!containerRef.current || !window.turnstile) {
        return false;
      }

      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        "error-callback": onError,
        "expired-callback": onExpire,
        "timeout-callback": onExpire,
      });

      return true;
      /* c8 ignore next */
    }, [siteKey, onError, onExpire, onToken]);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          if (window.turnstile && widgetIdRef.current) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
      }),
      [],
    );

    useEffect(() => {
      let cancelled = false;
      let attempts = 0;
      const maxAttempts = 50;

      const ensureWidget = () => {
        if (cancelled || attempts >= maxAttempts) {
          return;
        }

        attempts += 1;

        if (renderWidget()) {
          return;
        }

        window.setTimeout(ensureWidget, 200);
      };

      ensureWidget();

      return () => {
        cancelled = true;
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
        }
      };
      /* c8 ignore next */
    }, [renderWidget]);

    return <div className="turnstile" ref={containerRef} />;
  },
);

TurnstileWidget.displayName = "TurnstileWidget";

const emailPattern = /^[^\s@]{1,64}@[^\s@]{1,255}$/;
const maxFieldLengths = {
  name: 100,
  subject: 150,
  message: 2000,
};

const initialFormState: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
  honeypot: "",
};

const getTrimmedValues = (values: FormState) => ({
  name: values.name.trim(),
  email: values.email.trim(),
  subject: values.subject.trim(),
  message: values.message.trim(),
  honeypot: values.honeypot,
});

const validateForm = (values: FormState, token: string) => {
  const nextErrors: FormErrors = {};
  const trimmed = getTrimmedValues(values);

  if (!trimmed.email) {
    nextErrors.email = "Email is required.";
  } else if (!emailPattern.test(trimmed.email)) {
    nextErrors.email = "Enter a valid email address.";
  }

  if (!trimmed.subject) {
    nextErrors.subject = "Subject is required.";
  }

  if (!trimmed.message) {
    nextErrors.message = "Message is required.";
  }

  if (trimmed.name.length > maxFieldLengths.name) {
    nextErrors.name = "Name must be 100 characters or fewer.";
  }

  if (trimmed.subject.length > maxFieldLengths.subject) {
    nextErrors.subject = "Subject must be 150 characters or fewer.";
  }

  if (trimmed.message.length > maxFieldLengths.message) {
    nextErrors.message = "Message must be 2000 characters or fewer.";
  }

  if (!token) {
    nextErrors.turnstileToken = "Please complete the verification challenge.";
  }

  return nextErrors;
};

function App() {
  const initialTheme = useMemo(() => getInitialTheme(), []);
  const [theme, setTheme] = useState<Theme>(initialTheme.theme);
  const [hasUserPreference, setHasUserPreference] = useState(
    initialTheme.source === "stored",
  );
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState("");
  const turnstileRef = useRef<TurnstileHandle | null>(null);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
  const isSubmitting = status === "submitting";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!hasUserPreference || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch {
      // Ignore storage errors and keep in-memory theme.
    }
  }, [hasUserPreference, theme]);

  const statusMessage = useMemo(() => {
    if (status === "success") {
      return "Your message has been sent. We'll be in touch soon.";
    }
    if (status === "error") {
      return submitError || "Something went wrong. Please try again.";
    }
    return "";
  }, [status, submitError]);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken("");
    turnstileRef.current?.reset();
  }, []);

  const handleChange =
    (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const validationErrors = validateForm(formState, turnstileToken);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setStatus("submitting");
    setSubmitError("");

    try {
      const trimmedValues = getTrimmedValues(formState);
      const response = await fetch(`${apiBaseUrl}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedValues.name || undefined,
          email: trimmedValues.email,
          subject: trimmedValues.subject,
          message: trimmedValues.message,
          turnstileToken,
          honeypot: trimmedValues.honeypot,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error || "Unable to send your message right now.",
        );
      }

      setStatus("success");
      setFormState(initialFormState);
      resetTurnstile();
      setErrors({});
    } catch (error) {
      setStatus("error");
      setSubmitError(
        error instanceof Error ? error.message : "Unexpected error.",
      );
      resetTurnstile();
    }
  };

  const handleTurnstileToken = (token: string) => {
    setTurnstileToken(token);
    setErrors((prev) => ({ ...prev, turnstileToken: undefined }));
  };

  const handleTurnstileExpire = () => {
    setTurnstileToken("");
  };

  const handleTurnstileError = () => {
    setTurnstileToken("");
    setErrors((prev) => ({
      ...prev,
      turnstileToken: "Verification failed. Try again.",
    }));
  };

  const handleThemeToggle = () => {
    setHasUserPreference(true);
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const themeToggleLabel =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <div className="page">
      <main className="panel">
        <header className="header">
          <div className="header-row">
            <p className="eyebrow">Contact / Inquiry</p>
            <button
              type="button"
              className="theme-toggle"
              aria-pressed={theme === "dark"}
              aria-label={themeToggleLabel}
              onClick={handleThemeToggle}
            >
              <span className="theme-toggle-icon" aria-hidden="true">
                {theme === "dark" ? (
                  <svg viewBox="0 0 24 24" role="presentation">
                    <path
                      d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z"
                      fill="currentColor"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" role="presentation">
                    <path
                      d="M12 3.5a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V4.5a1 1 0 0 1 1-1Zm0 13a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM5.4 6.8a1 1 0 0 1 1.4 0l1.1 1.1a1 1 0 1 1-1.4 1.4L5.4 8.2a1 1 0 0 1 0-1.4Zm11.7 0a1 1 0 0 1 1.4 0 1 1 0 0 1 0 1.4l-1.1 1.1a1 1 0 0 1-1.4-1.4l1.1-1.1ZM3.5 12a1 1 0 0 1 1-1H6a1 1 0 1 1 0 2H4.5a1 1 0 0 1-1-1Zm13 0a1 1 0 0 1 1-1H19.5a1 1 0 1 1 0 2H17.5a1 1 0 0 1-1-1Zm-9.7 4.7a1 1 0 0 1 1.4 0 1 1 0 0 1 0 1.4l-1.1 1.1a1 1 0 1 1-1.4-1.4l1.1-1.1Zm10.3 0 1.1 1.1a1 1 0 1 1-1.4 1.4l-1.1-1.1a1 1 0 1 1 1.4-1.4ZM12 18.5a1 1 0 0 1 1 1V21a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </span>
            </button>
          </div>
          <h1>Send a message</h1>
          <p className="subhead">Required fields are marked with *</p>
        </header>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <fieldset className="fieldset">
            <legend>Message details</legend>

            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={maxFieldLengths.name}
                value={formState.name}
                onChange={handleChange("name")}
                className={errors.name ? "error" : ""}
                placeholder="Satoshi Nakamoto"
              />
              {errors.name && (
                <p className="field-error" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={320}
                value={formState.email}
                onChange={handleChange("email")}
                className={errors.email ? "error" : ""}
                placeholder="satoshi.nakamoto@example.com"
                required
              />
              {errors.email && (
                <p className="field-error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="subject">Subject *</label>
              <input
                id="subject"
                name="subject"
                type="text"
                maxLength={maxFieldLengths.subject}
                value={formState.subject}
                onChange={handleChange("subject")}
                className={errors.subject ? "error" : ""}
                placeholder="How can I help?"
                required
              />
              {errors.subject && (
                <p className="field-error" role="alert">
                  {errors.subject}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="message">Message *</label>
              <textarea
                id="message"
                name="message"
                rows={6}
                maxLength={maxFieldLengths.message}
                value={formState.message}
                onChange={handleChange("message")}
                className={errors.message ? "error" : ""}
                placeholder="Tell me about your inquiry..."
                required
              />
              <div className="field-meta">
                <span>
                  {formState.message.length}/{maxFieldLengths.message}
                </span>
              </div>
              {errors.message && (
                <p className="field-error" role="alert">
                  {errors.message}
                </p>
              )}
            </div>
          </fieldset>

          <div className="honeypot" aria-hidden="true">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={formState.honeypot}
              onChange={handleChange("honeypot")}
            />
          </div>

          <div className="form-footer">
            {siteKey ? (
              <div className="turnstile-wrapper">
                <TurnstileWidget
                  ref={turnstileRef}
                  siteKey={siteKey}
                  onToken={handleTurnstileToken}
                  onExpire={handleTurnstileExpire}
                  onError={handleTurnstileError}
                />
                {errors.turnstileToken && (
                  <p className="field-error" role="alert">
                    {errors.turnstileToken}
                  </p>
                )}
              </div>
            ) : (
              <p className="field-error" role="alert">
                Turnstile site key is missing. Set VITE_TURNSTILE_SITE_KEY to
                enable submissions.
              </p>
            )}

            <button
              type="submit"
              className="submit"
              disabled={isSubmitting || !siteKey}
            >
              {isSubmitting ? "Sending..." : "Send message"}
            </button>

            {statusMessage && (
              <p
                className={`status ${status}`}
                role="status"
                aria-live="polite"
              >
                {statusMessage}
              </p>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

export default App;
