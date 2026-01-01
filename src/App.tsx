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
    }, [renderWidget]);

    return <div className="turnstile" ref={containerRef} />;
  },
);

TurnstileWidget.displayName = "TurnstileWidget";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialFormState: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
  honeypot: "",
};

function App() {
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

  const validate = useCallback((values: FormState, token: string) => {
    const nextErrors: FormErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.subject.trim()) {
      nextErrors.subject = "Subject is required.";
    }

    if (!values.message.trim()) {
      nextErrors.message = "Message is required.";
    }

    if (values.name.trim().length > 100) {
      nextErrors.name = "Name must be 100 characters or fewer.";
    }

    if (values.subject.trim().length > 150) {
      nextErrors.subject = "Subject must be 150 characters or fewer.";
    }

    if (values.message.trim().length > 2000) {
      nextErrors.message = "Message must be 2000 characters or fewer.";
    }

    if (!token) {
      nextErrors.turnstileToken = "Please complete the verification challenge.";
    }

    return nextErrors;
  }, []);

  const statusMessage = useMemo(() => {
    if (status === "success") {
      return "Your message has been sent. We'll be in touch soon.";
    }
    if (status === "error") {
      return submitError || "Something went wrong. Please try again.";
    }
    return "";
  }, [status, submitError]);

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

    const validationErrors = validate(formState, turnstileToken);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setStatus("submitting");
    setSubmitError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name.trim() || undefined,
          email: formState.email.trim(),
          subject: formState.subject.trim(),
          message: formState.message.trim(),
          turnstileToken,
          honeypot: formState.honeypot,
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
      setTurnstileToken("");
      turnstileRef.current?.reset();
      setErrors({});
    } catch (error) {
      setStatus("error");
      setSubmitError(
        error instanceof Error ? error.message : "Unexpected error.",
      );
      setTurnstileToken("");
      turnstileRef.current?.reset();
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

  return (
    <div className="page">
      <main className="panel">
        <header className="header">
          <p className="eyebrow">Contact / Inquiry</p>
          <h1>Send us a note</h1>
          <p className="subhead">
            Share the details and we will reply within one business day.
          </p>
        </header>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={100}
              value={formState.name}
              onChange={handleChange("name")}
              className={errors.name ? "error" : ""}
              placeholder="Jane Doe"
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
              placeholder="jane@example.com"
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
              maxLength={150}
              value={formState.subject}
              onChange={handleChange("subject")}
              className={errors.subject ? "error" : ""}
              placeholder="How can we help?"
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
              maxLength={2000}
              value={formState.message}
              onChange={handleChange("message")}
              className={errors.message ? "error" : ""}
              placeholder="Tell us about your inquiry..."
              required
            />
            <div className="field-meta">
              <span>{formState.message.length}/2000</span>
            </div>
            {errors.message && (
              <p className="field-error" role="alert">
                {errors.message}
              </p>
            )}
          </div>

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
            <p className={`status ${status}`} role="status" aria-live="polite">
              {statusMessage}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}

export default App;
