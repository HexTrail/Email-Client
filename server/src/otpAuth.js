import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function createVerification(phoneNumber) {
  const verification = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({
      channel: "sms",
      to: phoneNumber,
    });

  console.log(verification.sid);
}

async function verifyOtp(phone, otp) {
  const result = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({
      to: phone,
      code: otp,
    });

  return result;
}

export { createVerification, verifyOtp };