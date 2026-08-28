document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const submitBtn = document.getElementById("submit-btn");
  const statusEl = document.getElementById("status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

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
      turnstileToken: turnstileToken,
    };

    // Disable submit button during request
    submitBtn.disabled = true;
    statusEl.textContent = "";

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
        statusEl.textContent = "Thank you! Your message has been sent.";
        statusEl.className = "status status-success";
        form.reset();
      } else {
        // Error response
        statusEl.textContent = "Something went wrong. Please try again later.";
        statusEl.className = "status status-error";
      }
    } catch {
      // Network or fetch error
      statusEl.textContent = "Something went wrong. Please try again later.";
      statusEl.className = "status status-error";
    } finally {
      // Re-enable submit button
      submitBtn.disabled = false;

      // Reset Turnstile widget for next submission
      if (typeof turnstile !== "undefined") {
        turnstile.reset();
      }
    }
  });
});
