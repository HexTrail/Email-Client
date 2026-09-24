// mailer.js
//
// Wraps nodemailer to hand outgoing mail to OUR OWN smtp-server.js
// over SMTP (localhost:SMTP_PORT). This is deliberate, not a
// shortcut: it means "sending" goes through the exact same code
// path a real mail client would use, so if you later point this at
// a different SMTP host (a real provider, or another instance of
// this same server on another machine) nothing else changes.

require("dotenv").config();
const nodemailer = require("nodemailer");

const SMTP_PORT = parseInt(process.env.SMTP_PORT || "2525", 10);

const transporter = nodemailer.createTransport({
  host: "localhost",
  port: SMTP_PORT,
  secure: false,
  ignoreTLS: true, // no cert configured — fine for local dev
  tls: { rejectUnauthorized: false },
});

/**
 * @param {{from: string, to: string[], cc?: string[], subject: string, text?: string, html?: string}} opts
 */
async function sendMail(opts) {
  return transporter.sendMail({
    from: opts.from,
    to: opts.to.join(", "),
    cc: (opts.cc || []).join(", "),
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}

module.exports = { sendMail };