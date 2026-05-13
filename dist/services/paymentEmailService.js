"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPaymentApprovedEmail = sendPaymentApprovedEmail;
exports.sendPaymentRejectedEmail = sendPaymentRejectedEmail;
const env_1 = require("../utils/env");
let mailerTransport = null;
async function getTransport() {
    if (!env_1.env.SMTP_USER)
        return null;
    if (!mailerTransport) {
        const nodemailer = await Promise.resolve().then(() => __importStar(require("nodemailer")));
        mailerTransport = nodemailer.createTransport({
            host: env_1.env.SMTP_HOST,
            port: env_1.env.SMTP_PORT,
            secure: env_1.env.SMTP_PORT === 465,
            auth: env_1.env.SMTP_USER ? { user: env_1.env.SMTP_USER, pass: env_1.env.SMTP_PASS } : undefined,
        });
    }
    return mailerTransport;
}
function shell(title, body) {
    return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      <p style="font-size:14px;margin:0">${body}</p>
    </div>
  `;
}
async function sendPaymentApprovedEmail(input) {
    const transport = await getTransport();
    if (!transport)
        return { sent: false };
    const subject = `Your subscription to ${input.plan} is now active`;
    const text = `Your subscription to ${input.plan} is now active. You can now use your upgraded Operon workspace.`;
    await transport.sendMail({
        from: env_1.env.SMTP_FROM,
        to: input.to,
        subject,
        text,
        html: shell(subject, text),
    });
    return { sent: true };
}
async function sendPaymentRejectedEmail(input) {
    const transport = await getTransport();
    if (!transport)
        return { sent: false };
    const subject = "Your payment was declined";
    const reason = input.reason?.trim();
    const text = reason
        ? `Your payment was declined. Reason: ${reason}`
        : "Your payment was declined. Please contact support if you believe this was a mistake.";
    await transport.sendMail({
        from: env_1.env.SMTP_FROM,
        to: input.to,
        subject,
        text,
        html: shell(subject, text),
    });
    return { sent: true };
}
