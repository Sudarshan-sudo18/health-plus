const RESEND_API_URL = "https://api.resend.com/emails";

export class EmailDeliveryError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "EmailDeliveryError";
    this.status = 503;
    this.cause = cause;
  }
}

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Arogyam <no-reply@healthplus.local>";

  if (apiKey) {
    try {
      await sendWithResend({ apiKey, from, to, subject, html, text });
      return { provider: "resend" };
    } catch (error) {
      console.error("Email delivery failed through Resend:", error.message);
      throw new EmailDeliveryError("We could not send the email. Please try again shortly.", error);
    }
  }

  if (process.env.NODE_ENV === "production") {
    const error = new Error("Email provider is not configured.");
    console.error("Email delivery configuration error:", error.message);
    throw new EmailDeliveryError("Email delivery is not configured. Please contact support.", error);
  }

  console.info("Email delivery is using local development mode. Set EMAIL_DEBUG=true to view verification details.");
  return { provider: "console" };
}

async function sendWithResend({ apiKey, from, to, subject, html, text }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response;
  try {
    response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Resend request timed out after 10 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const payload = await safeJson(response);
    throw new Error(payload.message || "Email could not be sent.");
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
