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

exports.sendWelcomeEmail = async (to, firstName, password) => {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/login';
  
  const mailOptions = {
    from: '"Archivia Admin" <archiviacap@gmail.com>', 
    to: to,
    subject: 'Welcome to Archivia - Account Created',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #4F46E5; text-align: center;">Welcome to Archivia!</h2>
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>Your account has been successfully created by an administrator. You can now access the system using the credentials below:</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4F46E5;">
          <p style="margin: 5px 0; color: #374151;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 5px 0; color: #374151;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #d1d5db; font-weight: bold;">${password}</span></p>
        </div>

        <div style="background-color: #fee2e2; color: #991b1b; padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: center;">
            <strong>⚠️ SECURITY WARNING</strong><br/>
            Please log in and <span style="text-decoration: underline;">change your password immediately</span>.
        </div>

        <div style="text-align: center; margin-top: 10px;">
          <a href="${loginUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Archivia</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">If you have any issues logging in, please contact your System Administrator.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Welcome email sent to ${to}`);
  } catch (error) {
    console.error('[Email Service] Error sending welcome email:', error);
  }
};
exports.sendDocumentStatusUpdate = async (email, firstName, docTitle, status, reason = '') => {
  const subject = `Document Update: ${status.toUpperCase()} - ${docTitle}`;
  const color = status === 'approved' ? '#10B981' : '#EF4444';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: auto;">
      <h2 style="color: #333;">Document Status Update</h2>
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>Your document <strong>"${docTitle}"</strong> has been <b style="color:${color}; font-size: 1.1em;">${statusText}</b>.</p>
      
      ${reason ? `<div style="background-color: #fef2f2; border-left: 4px solid #EF4444; padding: 10px; margin: 15px 0;"><strong>Reason/Feedback:</strong><br/>${reason}</div>` : ''}
      
      <p>You can log in to Archivia to view the document details.</p>
      <hr style="border:0; border-top:1px solid #eee; margin-top:20px;">
      <p style="font-size: 12px; color: #888;">Archivia Notification System</p>
    </div>
  `;
  
  try {
    await transporter.sendMail({ from: 'archiviacap@gmail.com', to: email, subject, html });
    console.log(`[Email] Status update sent to ${email}`);
  } catch (err) {
    console.error(`[Email Error] Failed to send status update: ${err.message}`);
  }
};
exports.sendUploadConfirmation = async (email, firstName, docTitle) => {
  const subject = `Upload Confirmation: ${docTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: auto;">
      <h2 style="color: #4F46E5;">Upload Received</h2>
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>We have successfully received your document: <strong>"${docTitle}"</strong>.</p>
      <p>It is currently <strong style="color: #F59E0B;">PENDING APPROVAL</strong>.</p>
      <p>Our administrators will review it shortly. You will be notified via email once a decision is made.</p>
    </div>
  `;
  try {
    await transporter.sendMail({ from: 'archiviacap@gmail.com', to: email, subject, html });
  } catch (err) {
    console.error(`[Email Error] Failed to send upload confirmation: ${err.message}`);
  }
};
exports.sendNewDocumentAlert = async (adminEmails, uploaderName, docTitle) => {
  if (!adminEmails || adminEmails.length === 0) return;
  
  const subject = `Action Required: New Submission by ${uploaderName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: auto;">
      <h2 style="color: #333;">New Document Pending Approval</h2>
      <p>A new document requires your review.</p>
      <ul style="background-color: #f9fafb; padding: 15px; border-radius: 5px;">
        <li><strong>Uploader:</strong> ${uploaderName}</li>
        <li><strong>Document Title:</strong> ${docTitle}</li>
        <li><strong>Status:</strong> Pending</li>
      </ul>
      <p>Please log in to the Admin Dashboard to approve or reject this document.</p>
    </div>
  `;
  
  try {
    await transporter.sendMail({ from: 'archiviacap@gmail.com', to: adminEmails, subject, html });
    console.log(`[Email] Admin alert sent to ${adminEmails.length} recipients.`);
  } catch (err) {
    console.error(`[Email Error] Failed to send admin alert: ${err.message}`);
  }
};
exports.sendSuperAdminRequestAlert = async (superAdminEmails, requestType, docTitle, requesterName, reason) => {
  if (!superAdminEmails || superAdminEmails.length === 0) return;

  const subject = `Approval Needed: ${requestType} Request`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: auto;">
      <h2 style="color: #DC2626;">${requestType} Approval Required</h2>
      <p>An Admin has requested to <strong>${requestType.toLowerCase()}</strong> a document.</p>
      <div style="background-color: #fff1f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px;">
        <p><strong>Requester:</strong> ${requesterName}</p>
        <p><strong>Document:</strong> ${docTitle}</p>
        <p><strong>Reason:</strong> ${reason}</p>
      </div>
      <p style="margin-top: 15px;">Please log in as Super Admin to approve or reject this request.</p>
    </div>
  `;

  try {
    await transporter.sendMail({ from: 'archiviacap@gmail.com', to: superAdminEmails, subject, html });
    console.log(`[Email] Super Admin alert sent.`);
  } catch (err) {
    console.error(`[Email Error] Failed to send super admin alert: ${err.message}`);
  }
};
exports.sendRequestOutcome = async (email, requestType, docTitle, outcome) => {
  const subject = `Request Update: ${requestType} for "${docTitle}"`;
  const color = outcome.toLowerCase().includes('approved') ? 'green' : 'red';
  
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: auto;">
      <h2>Request ${outcome}</h2>
      <p>The request to <strong>${requestType}</strong> the document <strong>"${docTitle}"</strong> has been <strong style="color:${color}">${outcome}</strong>.</p>
      <p>If approved, the action has been completed successfully.</p>
    </div>
  `;
  try {
    await transporter.sendMail({ from: 'archiviacap@gmail.com', to: email, subject, html });
  } catch (err) {
    console.error(`[Email Error] Failed to send outcome email: ${err.message}`);
  }
};