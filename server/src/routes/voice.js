import express from 'express';
import twilio from 'twilio';
const { VoiceResponse } = twilio.twiml;

/**
 * PhoneMail IVR + SMS account-creation server
 * ---------------------------------------------
 * Implements:
 *   1. Toll-free call -> IVR -> "Press 1" -> account created for the caller's number
 *   2. SMS "CREATE" keyword -> account created for the sender's number
 *
 * Wire these two URLs into your Twilio phone number's config:
 *   Voice webhook (A CALL COMES IN):     POST https://<your-domain>/voice/incoming
 *   Messaging webhook (A MESSAGE COMES IN): POST https://<your-domain>/sms/incoming
 *
 * npm install express twilio body-parser
 */


const router = express.Router();

// --- Twilio REST client (used to actively send SMS, e.g. confirmations) ---
const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER; // your Twilio toll-free/trial number

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
// =========================================================
// 1) VOICE / IVR FLOW  (Call and press "1" to create account)
// =========================================================

// Entry point: Twilio hits this the moment the call connects
router.post('/incoming', (req, res) => {
    const twiml = new VoiceResponse();
    const gather = twiml.gather({
        numDigits: 1,
        action: '/voice/menu',   // where the pressed digit gets posted
        method: 'POST',
        timeout: 6,
    });
    gather.say('Welcome to PhoneMail. Press 1 to create your account.');
    // If the caller doesn't press anything, Twilio falls through here:
    twiml.redirect('/voice/incoming');
    res.type('text/xml').send(twiml.toString());
});

// Handles the digit the caller pressed
router.post('/menu', async (req, res) => {
    const digit = req.body.Digits;
    const callerNumber = req.body.From; // E.164 format, e.g. +919876543210
    const twiml = new VoiceResponse();

    if (digit === '1') {
        if (await accountExists(callerNumber)) {
            twiml.say('An account already exists for this number. Goodbye.');
        } else {
            const email = await createAccountForPhoneNumber(callerNumber);
            twiml.say(`Your PhoneMail account has been created. Your address is ${email}. A confirmation has been sent by S M S.`);
            if (!client || !TWILIO_FROM_NUMBER) {
                throw new Error('Twilio messaging is not configured');
            }
            await client.messages.create({
                to: callerNumber,
                from: TWILIO_FROM_NUMBER,
                body: `Welcome to PhoneMail! Your account ${email} is ready.`,
            });
        }
        twiml.hangup();
    } else {
        twiml.say('Sorry, that is not a valid option.');
        twiml.redirect('/voice/incoming'); // loop back to the menu
    }

    res.type('text/xml').send(twiml.toString());
});

export default router;