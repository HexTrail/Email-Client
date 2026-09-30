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
 * @param {{from: string, to?: string[], cc?: string[], bcc?: string[], subject: string, text?: string, html?: string, inReplyTo?: string, references?: string[], attachments?: Array<{filename: string, contentType?: string, content: Buffer}>}} opts
 */
async function sendMail(opts) {
  const normalizeAddresses = (addresses) => (Array.isArray(addresses) ? addresses : addresses ? [addresses] : [])
    .filter((address) => typeof address === 'string')
    .map((address) => address.trim())
    .filter(Boolean);
  const to = normalizeAddresses(opts.to);
  const cc = normalizeAddresses(opts.cc);
  const bcc = normalizeAddresses(opts.bcc);

  if (!to.length && !cc.length && !bcc.length) {
    throw new Error('At least one recipient is required');
  }

  return transporter.sendMail({
    from: opts.from,
    to: to.length ? to.join(", ") : undefined,
    cc: cc.length ? cc.join(", ") : undefined,
    bcc: bcc.length ? bcc.join(", ") : undefined,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
    attachments: opts.attachments,
  });
}

export {sendMail}