import express from 'express';
import twilio from 'twilio';
const { MessagingResponse } = twilio.twiml;
// import { accountExists, createAccountForPhoneNumber } from '../services/accountService.js';

const router = express.Router();

// =========================================================
// 2) SMS FLOW  ("...or send an SMS" to create an account)
// =========================================================

// ---- Replace these with real calls into your Mongoose models ----
async function accountExists(phoneNumber) {
    // e.g. return !!(await User.findOne({ phoneNumber }));
    return pretendDb.has(phoneNumber);
}
async function createAccountForPhoneNumber(phoneNumber) {
    // e.g. return User.create({ phoneNumber, email: `${phoneNumber}@phonemail.com` });
    pretendDb.add(phoneNumber);
    return `${phoneNumber}@phonemail.com`;
}

const pretendDb = new Set(); // stand-in until wired to your real DB

router.post('/incoming', async (req, res) => {
  const body = (req.body.Body || '').trim().toUpperCase();
  const senderNumber = req.body.From;
  const twiml = new MessagingResponse();

  if (body === 'CREATE') {
    if (await accountExists(senderNumber)) {
      twiml.message('You already have a PhoneMail account.');
    } else {
      const email = await createAccountForPhoneNumber(senderNumber);
      twiml.message(`Your PhoneMail account ${email} has been created!`);
    }
  } else {
    twiml.message('Text CREATE to sign up for a free PhoneMail account.');
  }

  res.type('text/xml').send(twiml.toString());
});

export default router;