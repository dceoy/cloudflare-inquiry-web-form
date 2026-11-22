const WHITESPACE = /\s+/u;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const sendBtn = document.getElementById("send-btn");
  const backBtn = document.getElementById("back-btn");
  const anotherBtn = document.getElementById("another-btn");
  const confirmScreen = document.getElementById("screen-confirm");
  const statusEl = document.getElementById("status");
  const fields = [...form.querySelectorAll("[data-error]")];

  // --- Field validation feedback (after interaction / attempted submit) ---
  // Visual state comes from CSS :user-invalid. Where it is unsupported,
  // a class-based fallback mirrors native semantics: a field is flagged only
  // after the user edited it and left it, or after a submit attempt.
  const hasUserInvalid = CSS.supports("selector(:user-invalid)");
  const edited = new WeakSet();
  const touched = new WeakSet();

  const isUserInvalid = (el) =>
    hasUserInvalid
      ? el.matches(":user-invalid")
      : touched.has(el) && !el.validity.valid;

  // List the error text in aria-describedby only while it is shown.
  const linkError = (el, shown) => {
    const errorId = el.dataset.error;
    if (!errorId) {
      return;
    }
    const ids = (el.getAttribute("aria-describedby") || "")
      .split(WHITESPACE)
      .filter((id) => id && id !== errorId);
    if (shown) {
      ids.push(errorId);
    }
    if (ids.length > 0) {
      el.setAttribute("aria-describedby", ids.join(" "));
    } else {
      el.removeAttribute("aria-describedby");
    }
  };

  const syncField = (el) => {
    const invalid = isUserInvalid(el);
    if (!hasUserInvalid) {
      el.classList.toggle("user-invalid-fallback", invalid);
    }
    el.setAttribute("aria-invalid", invalid ? "true" : "false");
    linkError(el, invalid);
  };

  for (const el of fields) {
    el.setAttribute("aria-invalid", "false");
    el.addEventListener("blur", () => {
      // A bare tab-through without input is not an interaction.
      if (edited.has(el)) {
        touched.add(el);
      }
      syncField(el);
    });
    // Typing may clear an error; it never creates one before blur.
    el.addEventListener("input", () => {
      edited.add(el);
      if (el.getAttribute("aria-invalid") === "true" || touched.has(el)) {
        syncField(el);
      }
    });
    // A failed submit fires "invalid" on each failing field (including
    // untouched ones); focus then moves to the first, announcing its error.
    el.addEventListener("invalid", () => {
      touched.add(el);
      syncField(el);
    });
  }

  form.addEventListener("reset", () => {
    for (const el of fields) {
      edited.delete(el);
      touched.delete(el);
    }
    // :user-invalid is cleared after the reset event completes.
    setTimeout(() => {
      for (const el of fields) {
        syncField(el);
      }
    });
  });

  // --- Submission status (existing live region) ---
  const STATUS = {
    pending: { icon: "", label: "Sending", cls: "status-pending" },
    success: { icon: "✓", label: "Success", cls: "status-success" },
    error: { icon: "⚠", label: "Error", cls: "status-error" },
  };

  const setStatus = (kind, message) => {
    if (!kind) {
      statusEl.replaceChildren();
      statusEl.className = "";
      return;
    }
    const { icon, label, cls } = STATUS[kind];
    const iconEl = document.createElement("span");
    iconEl.className = "status-icon";
    iconEl.setAttribute("aria-hidden", "true");
    iconEl.textContent = icon;
    const textEl = document.createElement("span");
    const labelEl = document.createElement("strong");
    labelEl.textContent = `${label}: `;
    textEl.append(labelEl, message);
    statusEl.replaceChildren(iconEl, textEl);
    statusEl.className = `status ${cls}`;
  };

  let submitting = false;

  // --- Screens (in-page state only: one visible at a time) ---
  const SCREENS = {
    input: {
      el: document.getElementById("screen-input"),
      heading: "form-title",
    },
    confirm: { el: confirmScreen, heading: "confirm-title" },
    done: { el: document.getElementById("screen-done"), heading: "done-title" },
  };

  // Show one screen and move focus to its heading so keyboard and
  // screen-reader users land at the top of the new content.
  const showScreen = (name) => {
    for (const [key, screen] of Object.entries(SCREENS)) {
      screen.el.hidden = key !== name;
    }
    document.getElementById(SCREENS[name].heading).focus();
  };

  const fillSummary = (id, values) => {
    for (const el of document.querySelectorAll(`#${id} [data-value]`)) {
      const value = values[el.dataset.value];
      // Name is optional; show a placeholder instead of an empty entry.
      el.textContent = value || "(not provided)";
    }
  };

  const readValues = () => ({
    name: document.getElementById("name").value || "",
    email: document.getElementById("email").value,
    subject: document.getElementById("subject").value,
    message: document.getElementById("message").value,
  });

  // Step 1 -> 2: the browser only fires "submit" when native validation
  // passes; otherwise it fires "invalid" on each failing field (handled
  // above) and focuses the first one. Nothing is sent here.
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    fillSummary("confirm-summary", readValues());
    setStatus();
    showScreen("confirm");
    // Start the guarded challenge fresh so its token is current at send time.
    if (typeof globalThis.turnstile !== "undefined") {
      globalThis.turnstile.reset();
    }
  });

  // Step 2 -> 1: values are untouched in the form, ready for editing.
  backBtn.addEventListener("click", () => {
    if (submitting) {
      return;
    }
    setStatus();
    showScreen("input");
  });

  // Step 3 -> 1: fresh, empty form.
  anotherBtn.addEventListener("click", () => {
    form.reset();
    setStatus();
    showScreen("input");
  });

  // Step 2 -> 3: the one and only POST.
  sendBtn.addEventListener("click", async () => {
    // Prevent duplicate submissions (aria-disabled keeps keyboard focus).
    if (submitting) {
      return;
    }
    submitting = true;

    // Read the Turnstile token
    const turnstileInput = document.querySelector(
      '[name="cf-turnstile-response"]',
    );
    const turnstileToken = turnstileInput ? turnstileInput.value : "";

    // Build the payload
    const values = readValues();
    const payload = { ...values, turnstileToken };

    sendBtn.setAttribute("aria-disabled", "true");
    backBtn.setAttribute("aria-disabled", "true");
    confirmScreen.setAttribute("aria-busy", "true");
    setStatus("pending", "Please wait…");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Success: summarize what was actually sent, then clear the form.
        fillSummary("done-summary", values);
        form.reset();
        setStatus("success", "Thank you! Your message has been sent.");
        showScreen("done");
      } else {
        // Error response: stay on the confirm screen so the user can retry.
        setStatus(
          "error",
          "Something went wrong. Please try again later. Your message is still here.",
        );
      }
    } catch {
      // Network or fetch error
      setStatus(
        "error",
        "Something went wrong. Please try again later. Your message is still here.",
      );
    } finally {
      submitting = false;
      sendBtn.removeAttribute("aria-disabled");
      backBtn.removeAttribute("aria-disabled");
      confirmScreen.removeAttribute("aria-busy");

      // Reset Turnstile widget for next submission
      if (typeof globalThis.turnstile !== "undefined") {
        globalThis.turnstile.reset();
      }
    }
  });
});
