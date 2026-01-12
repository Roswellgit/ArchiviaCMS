const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const userModel = require('../models/userModel');
const emailService = require('../services/emailService');
const crypto = require('crypto');
const db = require('../db');

const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;


exports.register = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: 'Password is not strong enough.',
      details: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
    });
  }

  try {
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); 

    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await userModel.createWithOTP({
      firstName,
      lastName,
      email,
      passwordHash,
      otp,
      otpExpires
    });

   try {
    await emailService.sendOTP(email, otp); 
  } catch (emailError) {
    await db.query('DELETE FROM users WHERE id = $1', [user.id]); 
    return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
  }
   
    res.status(201).json({
        message: 'Registration successful. Please verify your email.',
        email: email, 
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email
        }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error during registration.');
  }
};

exports.verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  try {
    const user = await userModel.findByEmail(email);
    
    if (!user) {
        return res.status(400).json({ message: 'User not found.' });
    }
    
    if (user.is_verified) {
        return res.status(200).json({ message: 'User is already verified.' });
    }

    if (user.otp_code !== otp) {
        return res.status(400).json({ message: 'Invalid OTP.' });
    }
    
    if (new Date() > new Date(user.otp_expires)) {
        return res.status(400).json({ message: 'OTP has expired. Please register again to generate a new one.' });
    }
  
    await userModel.markVerified(user.id);
    
    res.status(200).json({ message: 'Email verified! You can now log in.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error during verification.' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ message: 'This account has been deactivated. Please contact support.' });
    }

    if (!user.is_verified) {
        return res.status(403).json({ message: 'Please verify your email address before logging in.' });
    }

    if (!user.password_hash) {
       return res.status(401).json({ message: 'Please login using Google.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        firstName: user.first_name, 
        lastName: user.last_name,
        role: user.role, 
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin || false,
        is_adviser: user.is_adviser // ✅ ADDED
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id,
        email: user.email, 
        firstName: user.first_name, 
        lastName: user.last_name,
        role: user.role, 
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin || false,
        is_adviser: user.is_adviser // ✅ ADDED
      } 
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error during login.');
  }
};

exports.googleLogin = async (req, res) => {
  const { token, password } = req.body;

  try {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID, 
    });
    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    let user = await userModel.findByEmail(email);

    if (user) {
      if (user.is_active === false) {
        return res.status(403).json({ message: 'This account has been deactivated.' });
      }
    } else {
      if (!password) {
        return res.status(400).json({ message: 'Password is required to create a new account.' });
      }

      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message: 'Password is not strong enough.',
          details: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        });
      }

      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      user = await userModel.createGoogleUser({
        email,
        firstName: given_name || 'Google',
        lastName: family_name || 'User',
        passwordHash
      });
    }

    const appToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        firstName: user.first_name, 
        lastName: user.last_name,
        role: user.role, 
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin || false,
        is_adviser: user.is_adviser // ✅ ADDED
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token: appToken, 
      user: { 
        id: user.id,
        email: user.email, 
        firstName: user.first_name, 
        lastName: user.last_name,
        role: user.role, 
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin || false,
        is_adviser: user.is_adviser // ✅ ADDED
      } 
    });

  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(400).json({ message: 'Google authentication failed.' });
  }
};


exports.getProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role, 
      is_admin: user.is_admin,
      is_super_admin: user.is_super_admin,
      is_adviser: user.is_adviser // ✅ ADDED
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.initiateUpdateProfile = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  const userId = req.user.userId;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    if (email) {
      const existingUser = await userModel.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: 'Email is already in use by another account.' });
      }
    }

    const updateData = { firstName, lastName, email };

    if (password && password.trim() !== "") {
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message: 'New password is too weak.',
          details: 'Must be 8+ chars with uppercase, lowercase, number, and special char.'
        });
      }
      updateData.password_hash = await bcrypt.hash(password, saltRounds);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); 

    await userModel.savePendingUpdate(userId, updateData, otp, expiry);

    const currentUser = await userModel.findById(userId);
    await emailService.sendUpdateOtp(currentUser.email, otp);

    res.json({ 
      message: 'Verification required. OTP sent to your current email.', 
      requireOtp: true 
    });

  } catch (err) {
    console.error("Initiate Update Error:", err);
    res.status(500).json({ message: 'Server error initiating update.' });
  }
};

exports.verifyUpdateProfile = async (req, res) => {
  const { otp } = req.body;
  const userId = req.user.userId;

  if (!otp) return res.status(400).json({ message: 'OTP is required' });

  try {
    const pending = await userModel.getPendingUpdate(userId);

    if (!pending || !pending.update_otp) {
      return res.status(400).json({ message: 'No pending update found.' });
    }

    if (pending.update_otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    if (new Date() > new Date(pending.update_otp_expires)) {
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    await userModel.applyUserUpdate(userId, pending.pending_update_data);
    await userModel.clearPendingUpdate(userId);

    const updatedUser = await userModel.findById(userId);

    const token = jwt.sign(
      { 
        userId: userId, 
        email: updatedUser.email, 
        firstName: updatedUser.first_name, 
        lastName: updatedUser.last_name,
        role: updatedUser.role, 
        is_admin: updatedUser.is_admin,
        is_super_admin: updatedUser.is_super_admin || false,
        is_adviser: updatedUser.is_adviser // ✅ ADDED
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      message: 'Profile updated successfully.', 
      token, 
      user: {
        id: updatedUser.id,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        role: updatedUser.role,
        is_admin: updatedUser.is_admin,
        is_super_admin: updatedUser.is_super_admin,
        is_adviser: updatedUser.is_adviser // ✅ ADDED
      }
    });

  } catch (err) {
    console.error("Verify Update Error:", err);
    res.status(500).json({ message: 'Server error verifying update.' });
  }
};


exports.requestPasswordChangeOTP = async (req, res) => {
  const { currentPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword) {
    return res.status(400).json({ message: 'Current password is required.' });
  }

  try {

    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!user.password_hash) {
        return res.status(400).json({ 
            message: 'You are using a social login (Google) and do not have a password set. Please use "Forgot Password" to create one.' 
        });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await db.query(
      'UPDATE users SET otp_code = $1, otp_expires = $2 WHERE id = $3',
      [otp, otpExpires, userId]
    );

    await emailService.sendOTP(user.email, otp); 

    res.json({ message: 'OTP sent to your email. Please verify to change password.' });

  } catch (err) {
    console.error("Request Password OTP Error:", err);
    res.status(500).json({ message: 'Server error requesting OTP.' });
  }
};

exports.changePassword = async (req, res) => {
  const { otp, newPassword } = req.body;
  const userId = req.user.userId;

  if (!otp || !newPassword) {
    return res.status(400).json({ message: 'OTP and new password are required.' });
  }

  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      message: 'New password is too weak.',
      details: 'Must be 8+ chars with uppercase, lowercase, number, and special char.'
    });
  }

  try {

    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!user.otp_code || user.otp_code.trim() !== otp.toString().trim()) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }
    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await userModel.updatePassword(userId, newPasswordHash);

    await db.query(
      'UPDATE users SET otp_code = NULL, otp_expires = NULL WHERE id = $1',
      [userId]
    );

    res.json({ message: 'Password changed successfully.' });

  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ message: 'Server error changing password.' });
  }
};


exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000;

    await userModel.saveResetToken(email, token, expires);
    
    emailService.sendPasswordReset(email, token).catch(err => console.error("Reset Email Error:", err));

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  
  if (!passwordRegex.test(password)) {
     return res.status(400).json({ 
       message: 'Password is too weak.',
       details: 'Must be 8+ characters with uppercase, lowercase, number, and special chararacter.'
     });
  }

  try {
    const user = await userModel.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    await userModel.updatePassword(user.id, passwordHash);

    res.json({ message: 'Password updated successfully. You can now login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
};