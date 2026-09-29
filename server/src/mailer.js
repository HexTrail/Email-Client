// mailer.js
//
// Sends application mail through this process's loopback-only SMTP listener.
// STARTTLS protects the internal hop; HTTP routes handle user authentication.

import 'dotenv/config';
import nodemailer from 'nodemailer';
import { smtpTlsCa } from './smtpSecurity.js';

const SMTP_PORT = Number(process.env.SMTP_PORT || 2525);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "127.0.0.1",
  port: SMTP_PORT,
  secure: false,
  requireTLS: true,
  tls: { ca: smtpTlsCa },
});

/**
 * @param {{from: string, to: string[], cc?: string[], subject: string, text?: string, html?: string, attachments?: Array<{filename: string, contentType?: string, content: Buffer}>}} opts
 */
async function sendMail(opts) {
  const recipients = (Array.isArray(opts.to) ? opts.to : [opts.to])
    .filter((address) => typeof address === 'string')
    .map((address) => address.trim())
    .filter(Boolean);
  const cc = (Array.isArray(opts.cc) ? opts.cc : opts.cc ? [opts.cc] : [])
    .filter((address) => typeof address === 'string')
    .map((address) => address.trim())
    .filter(Boolean);

  if (!recipients.length) {
    throw new Error('At least one recipient is required');
  }

  return transporter.sendMail({
    from: opts.from,
    to: recipients.join(", "),
    cc: cc.length ? cc.join(", ") : undefined,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments,
  });
}

export {sendMail}