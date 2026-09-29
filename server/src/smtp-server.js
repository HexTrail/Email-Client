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
//   3. DATA           — parse the raw email and persist it to MongoDB
//
// src/index.js starts this listener after MongoDB connects.

import 'dotenv/config';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import Conversation from './Models/Conversation.js';
import Message from './Models/Message.js';
import sanitizeEmailHtml from './sanitizeEmailHtml.js';
import { smtpTlsOptions } from './smtpSecurity.js';


const DOMAIN = (process.env.DOMAIN || 'phonemail.test').trim().toLowerCase();

function isOurDomain(address, domain = DOMAIN) {
  return typeof address === 'string' && address.toLowerCase().endsWith(`@${domain}`);
}

function phoneFromAddress(address) {
  return address.slice(0, address.lastIndexOf('@'));
}

async function persistMessage({ from, to, subject, text, html, attachments = [], date }) {
  const sender = from.toLowerCase();
  const recipients = to.map((address) => address.toLowerCase());
  const participants = [...new Set([sender, ...recipients].map(phoneFromAddress))].sort();
  const messageDate = date || new Date();
  let conversation;

  if (participants.length === 2) {
    const participantsKey = participants.join('_');
    conversation = await Conversation.findOneAndUpdate(
      { participantsKey },
      { $setOnInsert: { participants, participantsKey, isGroup: false } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );
  } else {
    conversation = await Conversation.create({
      participants,
      isGroup: recipients.length > 1,
    });
  }

  const message = await Message.create({
    conversation: conversation._id,
    from: sender,
    to: recipients,
    subject,
    text,
    html,
    attachments: attachments.map(({ filename, contentType, size, content }) => ({
      filename,
      contentType,
      size,
      content,
    })),
    date: messageDate,
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessageAt: messageDate,
        lastMessagePreview: (text || '').slice(0, 200),
        lastMessageFrom: phoneFromAddress(sender),
      },
    }
  );

  return message;
}

export function createSmtpServer({
  domain = DOMAIN,
  deliverMessage = persistMessage,
} = {}) {
  const acceptedDomain = domain.trim().toLowerCase();

  return new SMTPServer({
  secure: false,
  ...smtpTlsOptions,
  authOptional: true,

  // Called once per recipient in "RCPT TO:<...>". Reject anything not
  // on our own domain so this server can't be used to relay spam to
  // the outside world — it should only ever deliver phonemail.test
  // mailboxes to each other.
  onRcptTo(address, session, callback) {
    if (!isOurDomain(address.address, acceptedDomain)) {
      const error = new Error(`Only @${acceptedDomain} recipients are accepted`);
      error.responseCode = 550;
      return callback(error);
    }
    callback();
  },

  onMailFrom(address, session, callback) {
    if (!session.secure) {
      const error = new Error('STARTTLS is required before sending mail');
      error.responseCode = 530;
      return callback(error);
    }
    if (!isOurDomain(address.address, acceptedDomain)) {
      const error = new Error(`Only @${acceptedDomain} sender addresses are accepted`);
      error.responseCode = 550;
      return callback(error);
    }
    callback();
  },

  // Called with a stream of the raw RFC 5322 email once DATA finishes.
  onData(stream, session, callback) {
    simpleParser(stream)
      .then(async (parsed) => {
        const envelopeFrom = session.envelope.mailFrom.address;
        const headerSenders = parsed.from?.value || [];
        const from = headerSenders[0]?.address || envelopeFrom;
        const to = (session.envelope.rcptTo || []).map((recipient) => recipient.address);
        if (
          !to.length ||
          !isOurDomain(from, acceptedDomain) ||
          headerSenders.length > 1 ||
          from.toLowerCase() !== envelopeFrom.toLowerCase()
        ) {
          throw new Error('Message has an invalid sender or no recipients');
        }

        await deliverMessage({
          from,
          to,
          subject: parsed.subject || '',
          text: parsed.text || '',
          html: sanitizeEmailHtml(parsed.html || ''),
          attachments: parsed.attachments || [],
          date: parsed.date,
        });
        console.log(`[smtp] delivered "${parsed.subject || '(no subject)'}" to ${to.join(', ')}`);
        callback();
      })
      .catch((error) => {
        console.error('[smtp] failed to process message:', error);
        error.responseCode = error.responseCode || 451;
        callback(error);
      });
  },
});

}

const server = createSmtpServer();
export default server;
