import { env } from "../utils/env";

type MailTransport = {
  sendMail: (options: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<unknown>;
};

let mailerTransport: MailTransport | null = null;

async function getTransport() {
  if (!env.SMTP_USER) return null;
  if (!mailerTransport) {
    const nodemailer = await import("nodemailer");
    mailerTransport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    }) as MailTransport;
  }
  return mailerTransport;
}

function shell(title: string, body: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      <p style="font-size:14px;margin:0">${body}</p>
    </div>
  `;
}

export async function sendPaymentApprovedEmail(input: { to: string; plan: string }) {
  const transport = await getTransport();
  if (!transport) return { sent: false };

  const subject = `Your subscription to ${input.plan} is now active`;
  const text = `Your subscription to ${input.plan} is now active. You can now use your upgraded Operon workspace.`;
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject,
    text,
    html: shell(subject, text),
  });
  return { sent: true };
}

export async function sendPaymentRejectedEmail(input: { to: string; reason?: string | null }) {
  const transport = await getTransport();
  if (!transport) return { sent: false };

  const subject = "Your payment was declined";
  const reason = input.reason?.trim();
  const text = reason
    ? `Your payment was declined. Reason: ${reason}`
    : "Your payment was declined. Please contact support if you believe this was a mistake.";
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject,
    text,
    html: shell(subject, text),
  });
  return { sent: true };
}
