// backend/utils/emailService.js
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send verification email
exports.sendVerificationEmail = async (email, verificationToken) => {
  try {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Blood Bridge - Verify Your Email',
      html: `
        <h1>Blood Bridge Email Verification</h1>
        <p>Thank you for signing up with Blood Bridge. Please verify your email by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not sign up for Blood Bridge, please ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Blood Bridge - Password Reset Request',
      html: `
        <h1>Blood Bridge Password Reset</h1>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

// Send notification email for blood request
exports.sendBloodRequestEmail = async (user, request) => {
  try {
    const requestUrl = `${process.env.CLIENT_URL}/requests/${request._id}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: `Blood Bridge - Urgent Blood Request (${request.bloodType})`,
      html: `
        <h1>Urgent Blood Request</h1>
        <p>Hello ${user.name},</p>
        <p>A patient urgently needs ${request.units} units of ${request.bloodType} blood at ${request.hospital}.</p>
        <p><strong>Urgency:</strong> ${request.urgency}</p>
        <p><strong>Required by:</strong> ${new Date(request.requiredBy).toLocaleDateString()}</p>
        <p><strong>Contact:</strong> ${request.contactName} (${request.contactPhone})</p>
        <a href="${requestUrl}">View Request Details</a>
        <p>Thank you for being a lifesaver!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

// Send generic notification email
exports.sendNotificationEmail = async (user, notification) => {
  try {
    const notificationUrl = `${process.env.CLIENT_URL}/notifications`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: `Blood Bridge - ${notification.title}`,
      html: `
        <h1>${notification.title}</h1>
        <p>Hello ${user.name},</p>
        <p>${notification.message}</p>
        <a href="${notificationUrl}">View Notifications</a>
        <p>Thank you for using Blood Bridge!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};