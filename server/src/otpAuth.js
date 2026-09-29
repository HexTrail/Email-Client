// Wraps Twilio Verify operations for phone sign-in and recovery codes.
// Wraps Twilio Verify operations for phone sign-in and recovery codes.
import twilio from 'twilio';

function getVerifyService() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw new Error('Twilio Verify credentials are not configured');
  }

  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    .verify.v2.services(TWILIO_VERIFY_SERVICE_SID);
}

async function createVerification(phoneNumber) {
  return getVerifyService().verifications.create({
    channel: 'sms',
    to: phoneNumber,
  });
}

async function verifyOtp(phone, otp) {
  return getVerifyService().verificationChecks.create({
    to: phone,
    code: otp,
  });
}

export { createVerification, verifyOtp };