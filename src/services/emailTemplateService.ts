export type PaymentEmailTemplate = "payment-received" | "subscription-activated" | "payment-declined";

export type PaymentEmailVariables = {
  name: string;
  planName: string;
  plan: string;
  amount: string;
  currency: string;
  feature1: string;
  feature2: string;
  feature3: string;
  feature4?: string;
  benefit1?: string;
  benefit2?: string;
  benefit3?: string;
  benefit4?: string;
  startDate?: string;
  renewDate?: string;
  dashboardLink: string;
  pricingLink: string;
  settingsLink: string;
  paymentLink: string;
  helpCenterLink: string;
  unsubscribeLink: string;
  rejectionReason?: string;
};

type TemplateDefinition = {
  subject: string;
  text: string;
  htmlBody: string;
};

const brand = {
  logo: "Operon",
  primary: "#111827",
  accent: "#10b981",
  muted: "#6b7280",
  border: "#e5e7eb",
  background: "#f9fafb",
};

const templates: Record<PaymentEmailTemplate, TemplateDefinition> = {
  "payment-received": {
    subject: "Payment Info Received — Your Operon Subscription",
    text: `Hi {{name}},

We've received your payment information for {{planName}} ({{amount}} {{currency}}).

Your subscription will be activated once our team verifies your details. This usually takes 1-2 hours.

In the meantime, you have limited access to:
- {{feature1}}
- {{feature2}}
- {{feature3}}

We'll send you a confirmation email as soon as your subscription is active.

Questions? Reply to this email or visit our help center: {{helpCenterLink}}

Best,
Operon Team

Unsubscribe: {{unsubscribeLink}}`,
    htmlBody: `
      <p>Hi {{name}},</p>
      <p>We've received your payment information for <strong>{{planName}}</strong> ({{amount}} {{currency}}).</p>
      <p>Your subscription will be activated once our team verifies your details. This usually takes 1-2 hours.</p>
      <p>In the meantime, you have limited access to:</p>
      <ul>
        <li>{{feature1}}</li>
        <li>{{feature2}}</li>
        <li>{{feature3}}</li>
      </ul>
      <p>We'll send you a confirmation email as soon as your subscription is active.</p>
      <p>Questions? Reply to this email or visit our help center: <a href="{{helpCenterLink}}">{{helpCenterLink}}</a></p>
    `,
  },
  "subscription-activated": {
    subject: "Your Operon {{plan}} Subscription is Live!",
    text: `Hi {{name}},

Great news! Your subscription to {{planName}} is now active.

Instant access to:
- {{feature1}} — {{benefit1}}
- {{feature2}} — {{benefit2}}
- {{feature3}} — {{benefit3}}
- {{feature4}} — {{benefit4}}

Your billing cycle:
- Start date: {{startDate}}
- Renews: {{renewDate}}
- Amount: {{amount}} {{currency}}

Manage your subscription: {{dashboardLink}}
Upgrade/Downgrade: {{pricingLink}}
Cancel anytime: {{settingsLink}}

Need help? Check our docs or email support@operon.com

Happy analyzing,
Operon Team`,
    htmlBody: `
      <p>Hi {{name}},</p>
      <p>Great news! Your subscription to <strong>{{planName}}</strong> is now active.</p>
      <p><strong>Instant access to:</strong></p>
      <ul>
        <li><strong>{{feature1}}</strong> — {{benefit1}}</li>
        <li><strong>{{feature2}}</strong> — {{benefit2}}</li>
        <li><strong>{{feature3}}</strong> — {{benefit3}}</li>
        <li><strong>{{feature4}}</strong> — {{benefit4}}</li>
      </ul>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:18px 0;border:1px solid ${brand.border};border-radius:8px;overflow:hidden">
        <tr><td style="padding:10px 12px;color:${brand.muted}">Start date</td><td style="padding:10px 12px;text-align:right;font-weight:600">{{startDate}}</td></tr>
        <tr><td style="padding:10px 12px;color:${brand.muted};border-top:1px solid ${brand.border}">Renews</td><td style="padding:10px 12px;text-align:right;font-weight:600;border-top:1px solid ${brand.border}">{{renewDate}}</td></tr>
        <tr><td style="padding:10px 12px;color:${brand.muted};border-top:1px solid ${brand.border}">Amount</td><td style="padding:10px 12px;text-align:right;font-weight:600;border-top:1px solid ${brand.border}">{{amount}} {{currency}}</td></tr>
      </table>
      <p><a href="{{dashboardLink}}">Manage your subscription</a> · <a href="{{pricingLink}}">Upgrade/Downgrade</a> · <a href="{{settingsLink}}">Cancel anytime</a></p>
      <p>Need help? Check our docs or email support@operon.com</p>
    `,
  },
  "payment-declined": {
    subject: "Your Operon Payment — Action Required",
    text: `Hi {{name}},

Unfortunately, we couldn't verify your payment for {{planName}}.

Reason: {{rejectionReason}}

What to do next:
1. Check your card details are correct
2. Try again with a different card
3. Contact your bank if issues persist
4. Email us: support@operon.com

Your payment details have not been charged.

Try again: {{paymentLink}}

Best,
Operon Team`,
    htmlBody: `
      <p>Hi {{name}},</p>
      <p>Unfortunately, we couldn't verify your payment for <strong>{{planName}}</strong>.</p>
      <p><strong>Reason:</strong> {{rejectionReason}}</p>
      <p><strong>What to do next:</strong></p>
      <ol>
        <li>Check your card details are correct</li>
        <li>Try again with a different card</li>
        <li>Contact your bank if issues persist</li>
        <li>Email us: support@operon.com</li>
      </ol>
      <p>Your payment details have not been charged.</p>
      <p><a href="{{paymentLink}}">Try again</a></p>
    `,
  },
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function interpolate(template: string, variables: PaymentEmailVariables, html: boolean) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: keyof PaymentEmailVariables) => {
    const value = variables[key] ?? "";
    return html ? escapeHtml(String(value)) : String(value);
  });
}

function shell(content: string) {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Operon</title>
  </head>
  <body style="margin:0;padding:0;background:${brand.background};font-family:Inter,Arial,sans-serif;color:${brand.primary}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.background};padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${brand.border};border-radius:12px;overflow:hidden">
            <tr>
              <td style="padding:24px 24px 12px">
                <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:${brand.primary}">${brand.logo}</div>
                <div style="margin-top:8px;height:3px;width:44px;background:${brand.accent};border-radius:999px"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 24px;font-size:15px;line-height:1.65">
                ${content}
                <p style="margin-top:28px">Best,<br>Operon Team</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:${brand.background};font-size:12px;line-height:1.5;color:${brand.muted}">
                Operon helps you analyze ad performance and subscription workflows.
                <br><a href="{{unsubscribeLink}}" style="color:${brand.muted}">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderPaymentEmail(templateName: PaymentEmailTemplate, variables: PaymentEmailVariables) {
  const template = templates[templateName];
  const subject = interpolate(template.subject, variables, false);
  const body = interpolate(template.htmlBody, variables, true);
  const html = interpolate(shell(body), variables, true);
  const text = interpolate(template.text, variables, false);
  return { subject, html, text };
}
