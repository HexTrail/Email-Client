import express from 'express';
import twilio from 'twilio';
import Users from '../Models/Users.js';
const { VoiceResponse } = twilio.twiml;

/**
 * PhoneMail IVR account-creation server
 * ---------------------------------------------
 * Implements:
 *   Toll-free call -> IVR -> "Press 1" -> account created for the caller's number
 *
 * Wire these two URLs into your Twilio phone number's config:
 *   Voice webhook (a call comes in): POST https://<your-domain>/voice/incoming
 *
 * Twilio can send an optional SMS confirmation after account creation.
 */

const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

export function createVoiceRouter({ UsersModel = Users, sendConfirmation } = {}) {
    const router = express.Router();
    const sendSms = sendConfirmation || (async (phoneNumber, email) => {
        if (!client || !TWILIO_FROM_NUMBER) {
            console.warn('[voice] Twilio SMS is not configured; skipping confirmation');
            return;
        }

        await client.messages.create({
            to: phoneNumber,
            from: TWILIO_FROM_NUMBER,
            body: `Welcome to PhoneMail! Your account ${email} is ready.`,
        });
    });

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
        return res.type('text/xml').send(twiml.toString());
    });

    router.post('/menu', async (req, res) => {
        const digit = req.body.Digits;
        const callerNumber = String(req.body.From || '').trim();
        const twiml = new VoiceResponse();

        if (digit === '1') {
            if (!callerNumber) {
                twiml.say('We could not identify your phone number. Please call again later.');
            } else {
                try {
                    const existingUser = await UsersModel.findOne({ phone: callerNumber });
                    if (existingUser) {
                        twiml.say('An account already exists for this number. Goodbye.');
                    } else {
                        await UsersModel.create({ phone: callerNumber });
                        const domain = process.env.DOMAIN || 'phonemail.test';
                        const email = `${callerNumber}@${domain}`;
                        twiml.say(`Your PhoneMail account has been created. Your address is ${email}.`);
                        try {
                            await sendSms(callerNumber, email);
                        } catch (error) {
                            console.error('[voice] failed to send account confirmation:', error);
                        }
                    }
                } catch (error) {
                    console.error('[voice] failed to create account:', error);
                    twiml.say('We could not create your account right now. Please try again later.');
                }
            }
            twiml.hangup();
        } else {
            twiml.say('Sorry, that is not a valid option.');
            twiml.redirect('/voice/incoming');
        }

        return res.type('text/xml').send(twiml.toString());
    });

    return router;
}

export default createVoiceRouter();