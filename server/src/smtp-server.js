// smtp-server.js
//
// A real SMTP server: it speaks the SMTP protocol on a TCP socket,
// same as Postfix/Sendmail/Exchange do. This is the piece that makes
// "user@phonemail.test" an address mail can actually be delivered to,
// rather than just a string in a database.
//
// It does three jobs on every incoming connection:
//   1. HELO/MAIL FROM — who's sending
//   2. RCPT TO        — who it's for (we reject anyone outside our
//                        own domain, so this can't be abused as an
//                        open relay for spam)
//   3. DATA           — the raw email; we parse it and hand it to
//                        storage.js
//
// Run: node smtp-server.js   (listens on SMTP_PORT, default 2525)

import 'dotenv'
import { SMTPServer } from 'smtp-server';
import {simpleParser} from 'mailparser'


const DOMAIN = process.env.DOMAIN;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10);

function isOurDomain(address) {
  return String(address).toLowerCase().endsWith("@" + DOMAIN.toLowerCase());
}

const server = new SMTPServer({
  // No TLS cert needed for local dev — plaintext is fine on localhost.
  port: SMTP_PORT,
  secure: false,
  authOptional: true, // accept mail without SMTP AUTH (fine for local/dev)
  disabledCommands: ["STARTTLS"],

  // Called once per recipient in "RCPT TO:<...>". Reject anything not
  // on our own domain so this server can't be used to relay spam to
  // the outside world — it should only ever deliver phonemail.test
  // mailboxes to each other.
  onRcptTo(address, session, callback) {
    if (!isOurDomain(address.address)) {
      return callback(
        new Error(
          `550 relaying to ${address.address} denied — this server only delivers @${DOMAIN}`
        )
      );
    }
    // Implicitly create the mailbox the first time it's addressed.
    storage.ensureMailbox(address.address);
    callback();
  },

  onMailFrom(address, session, callback) {
    // Accept any sender. For a closed local system this is fine;
    // if you ever expose this publicly, add real auth here.
    callback();
  },

  // Called with a stream of the raw RFC 5322 email once DATA finishes.
  onData(stream, session, callback) {
    simpleParser(stream)
      .then((parsed) => {
        const toList = (session.envelope.rcptTo || []).map((r) => r.address);
        storage.addMessage({
          from: parsed.from ? parsed.from.text : session.envelope.mailFrom.address,
          to: toList,
          subject: parsed.subject,
          text: parsed.text,
          html: parsed.html || "",
        });
        console.log(
          `[smtp] delivered "${parsed.subject || "(no subject)"}" to ${toList.join(", ")}`
        );
        callback();
      })
      .catch((err) => {
        console.error("[smtp] failed to parse incoming mail:", err);
        callback(new Error("450 could not process message"));
      });
  },
});

export default server
