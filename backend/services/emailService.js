const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Health Plus <no-reply@healthplus.local>";

  if (apiKey) {
    await sendWithResend({ apiKey, from, to, subject, html, text });
    return { provider: "resend" };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Email provider is not configured.");
  }

  console.info("[Health Plus email]", { to, subject, text });
  return { provider: "console" };
}

async function sendWithResend({ apiKey, from, to, subject, html, text }) {
  const response = await fetch(RESEND_API_URL, {
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
    })
  });

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
