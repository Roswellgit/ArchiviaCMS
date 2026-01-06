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

// --- ADD THIS NEW FUNCTION ---
exports.sendWelcomeEmail = async (to, firstName, password) => {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/login';
  
  const mailOptions = {
    from: '"ArchiviaCMS Admin" <no-reply@archiviacms.com>', // Update sender if needed
    to: to,
    subject: 'Welcome to ArchiviaCMS - Your Account Credentials',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4F46E5; text-align: center;">Welcome to ArchiviaCMS!</h2>
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>Your account has been successfully created. You can now access the system using the credentials below:</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4F46E5;">
          <p style="margin: 5px 0; color: #374151;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 5px 0; color: #374151;"><strong>Password:</strong> <span style="font-family: monospace; background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #d1d5db;">${password}</span></p>
        </div>

        <p style="color: #dc2626; font-size: 14px;"><em>Important: For security reasons, please log in and change your password immediately.</em></p>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${loginUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Dashboard</a>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Welcome email sent to ${to}`);
  } catch (error) {
    console.error('[Email Service] Error sending welcome email:', error);
    // We log but don't throw, so the user creation doesn't fail just because email failed
  }
};