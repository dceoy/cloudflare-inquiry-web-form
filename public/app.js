const WHITESPACE = /\s+/u;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const submitBtn = document.getElementById("submit-btn");
  const statusEl = document.getElementById("status");
  const fields = [...form.querySelectorAll("input, textarea")];

  // --- Field validation feedback (after interaction / attempted submit) ---
  // Visual state comes from CSS :user-invalid. Where it is unsupported,
  // a class-based fallback driven by blur / input / invalid events is used.
  const hasUserInvalid = CSS.supports("selector(:user-invalid)");
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
      touched.add(el);
      syncField(el);
    });
    // Typing may clear an error; it never creates one before blur.
    el.addEventListener("input", () => {
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

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
    const payload = {
      name: document.getElementById("name").value || "",
      email: document.getElementById("email").value,
      subject: document.getElementById("subject").value,
      message: document.getElementById("message").value,
      turnstileToken,
    };

    submitBtn.setAttribute("aria-disabled", "true");
    form.setAttribute("aria-busy", "true");
    setStatus("pending", "Sending your message…");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Success
        setStatus("success", "Thank you! Your message has been sent.");
        form.reset();
      } else {
        // Error response
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
      submitBtn.removeAttribute("aria-disabled");
      form.removeAttribute("aria-busy");

      // Reset Turnstile widget for next submission
      if (typeof globalThis.turnstile !== "undefined") {
        globalThis.turnstile.reset();
      }
    }
  });
});
