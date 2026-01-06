const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525, 
  secure: false, 
  auth: {
    user: process.env.GMAIL_USER, 
    pass: process.env.GMAIL_APP_PASSWORD, 
  },
  logger: true,
  debug: true,
  tls: {
    rejectUnauthorized: false 
  }
});

exports.sendOTP = async (email, otp) => {
  const mailOptions = {
    from: 'archiviacap@gmail.com', 
    to: email,
    subject: 'Archivia Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333;">Verify Your Email</h2>
          <p>Thank you for registering with Archivia. Please use the following One-Time Password (OTP) to complete your registration:</p>
          <h1 style="background-color: #eee; padding: 10px; text-align: center; letter-spacing: 5px; border-radius: 4px;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ OTP Email sent successfully!");
  } catch (error) {
    console.error("❌ OTP Email send failed:", error);
  }
};

exports.sendPasswordReset = async (email, token) => {
  const resetUrl = `https://archivia-frontend.vercel.app/reset-password?token=${token}`;
  
  const mailOptions = {
    from: 'archiviacap@gmail.com', 
    to: email,
    subject: 'Archivia Password Reset',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Reset Email sent successfully!");
  } catch (error) {
    console.error("❌ Reset Email send failed:", error);
  }
};

// FIXED: Uses transporter directly and matches your styling
exports.sendUpdateOtp = async (email, otp) => {
  const mailOptions = {
    from: 'archiviacap@gmail.com',
    to: email,
    subject: 'Verify Account Update',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333;">Confirm Profile Changes</h2>
          <p>You requested to update your Archivia profile. Please use this OTP to verify the changes:</p>
          <h1 style="background-color: #eee; padding: 10px; text-align: center; letter-spacing: 5px; border-radius: 4px;">${otp}</h1>
          <p>This code expires in 10 minutes. If you did not request this change, please contact support immediately.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Update OTP sent successfully!");
  } catch (error) {
    console.error("❌ Update OTP send failed:", error);
  }
};