// mailer.js
//
// Wraps nodemailer to hand outgoing mail to OUR OWN smtp-server.js
// over SMTP (localhost:SMTP_PORT). This is deliberate, not a
// shortcut: it means "sending" goes through the exact same code
// path a real mail client would use, so if you later point this at
// a different SMTP host (a real provider, or another instance of
// this same server on another machine) nothing else changes.

import 'dotenv/config';
import nodemailer from 'nodemailer';

const SMTP_PORT = Number(process.env.SMTP_PORT || 2525);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "127.0.0.1",
  port: SMTP_PORT,
  secure: false,
  ignoreTLS: true, // no cert configured — fine for local dev
  tls: { rejectUnauthorized: false },
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