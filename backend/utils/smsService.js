// backend/utils/smsService.js
const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send verification SMS
exports.sendVerificationSMS = async (phoneNumber, verificationCode) => {
  try {
    await client.messages.create({
      body: `Your Blood Bridge verification code is: ${verificationCode}. This code will expire in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    return false;
  }
};

// Send blood request SMS notification
exports.sendBloodRequestSMS = async (phoneNumber, request) => {
  try {
    await client.messages.create({
      body: `URGENT: Blood Bridge Alert - ${request.units} units of ${request.bloodType} blood needed at ${request.hospital}. Contact: ${request.contactPhone}. Reply YES to confirm.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    return false;
  }
};

// Send generic notification SMS
exports.sendNotificationSMS = async (phoneNumber, message) => {
  try {
    await client.messages.create({
      body: `Blood Bridge: ${message}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    return false;
  }
};