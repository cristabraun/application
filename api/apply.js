const REQUIRED_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "main_goal",
  "previous_attempts",
  "what_worked",
  "what_hasnt_worked",
  "weekly_time",
  "training_routine",
  "importance_level",
  "investment_readiness",
];

const FIELD_LABELS = {
  program: "Program",
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  main_goal: "1. What's your main goal right now?",
  previous_attempts: "2. What have you tried in the past to lose weight or get in shape?",
  what_worked: "3. What's actually worked for you before, even a little?",
  what_hasnt_worked: "4. What hasn't worked, and why do you think that is?",
  weekly_time: "5. How much time can you realistically dedicate to this each week?",
  training_routine: "Current training routine",
  importance_level: "6. On a scale of 1-10, how important is it to you to make a change right now?",
  investment_readiness: "7. Are you in a position to invest in yourself financially right now?",
};

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatApplicationHtml(application) {
  const rows = Object.entries(FIELD_LABELS)
    .map(([key, label]) => {
      const value = escapeHtml(application[key] || "Not provided").replaceAll("\n", "<br />");
      return `<tr><th align="left" valign="top" style="padding:10px;border-bottom:1px solid #eee;">${label}</th><td valign="top" style="padding:10px;border-bottom:1px solid #eee;">${value}</td></tr>`;
    })
    .join("");

  return `
    <h1>New Feminine Fat Loss coaching call application</h1>
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:15px;">
      ${rows}
    </table>
  `;
}

function formatApplicantConfirmationHtml(application) {
  const firstName = escapeHtml(application.first_name || "there");

  return `
    <div style="margin:0;padding:0;background:#fffaf7;color:#241c1f;font-family:Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;padding:34px 22px;">
        <p style="margin:0 0 12px;color:#334533;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
          Feminine Fat Loss
        </p>
        <h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:34px;line-height:1.05;color:#241c1f;">
          Application received
        </h1>
        <div style="background:#ffffff;border:1px solid #eadbd5;border-radius:10px;padding:24px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            Thank you for submitting your Feminine Fat Loss coaching call application. I received your
            answers and will review them carefully.
          </p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            If you were sent to the scheduling page after applying, please choose two times that
            work for you. I will follow up with next steps from there.
          </p>
          <p style="margin:0;font-size:16px;line-height:1.6;">
            Talk soon,<br />
            Crista
          </p>
        </div>
      </div>
    </div>
  `;
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  let application;

  try {
    application = await readBody(request);
  } catch (error) {
    sendJson(response, 400, { error: "Invalid application data" });
    return;
  }

  const missingFields = REQUIRED_FIELDS.filter((field) => !String(application[field] || "").trim());

  if (missingFields.length > 0) {
    sendJson(response, 400, { error: "Missing required fields", fields: missingFields });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.APPLICATION_TO_EMAIL || "crista.ann.braun@gmail.com";
  const fromEmail =
    process.env.APPLICATION_FROM_EMAIL || "Feminine Fat Loss <onboarding@resend.dev>";

  if (!apiKey) {
    sendJson(response, 500, { error: "Email service is not configured" });
    return;
  }

  const applicantName = `${application.first_name} ${application.last_name}`.trim();
  const ownerEmailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: application.email,
      subject: `New coaching application from ${applicantName}`,
      html: formatApplicationHtml(application),
    }),
  });

  if (!ownerEmailResponse.ok) {
    sendJson(response, 502, { error: "Email could not be sent" });
    return;
  }

  const applicantEmailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [application.email],
      reply_to: toEmail,
      subject: "Your Feminine Fat Loss application was received",
      html: formatApplicantConfirmationHtml(application),
    }),
  });

  if (!applicantEmailResponse.ok) {
    sendJson(response, 502, { error: "Confirmation email could not be sent" });
    return;
  }

  sendJson(response, 200, { ok: true });
};
