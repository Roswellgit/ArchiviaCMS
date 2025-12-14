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
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

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
    // If email fails, delete the user so they can try again
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
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin || false
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      user: { 
        email: user.email, 
        firstName: user.first_name, 
        lastName: user.last_name,
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin || false
      } 
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error during login.');
  }
};

exports.googleLogin = async (req, res) => {
  const { token, password } = req.body; // Password is now required

  if (!password) {
    return res.status(400).json({ message: 'Password is required for Google login.' });
  }

  try {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID, 
    });
    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    let user = await userModel.findByEmail(email);

    if (user) {
      // Existing User Logic
      if (user.is_active === false) {
        return res.status(403).json({ message: 'This account has been deactivated.' });
      }

      // === UPDATED LOGIC FOR LEGACY USERS ===
      // If the user has the placeholder password, update it now instead of blocking them
      if (user.password_hash === 'GOOGLE_AUTH_USER') {
          
          // Validate the new password they provided
          if (!passwordRegex.test(password)) {
            return res.status(400).json({
              message: 'Password is not strong enough.',
              details: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
            });
          }

          // Hash and save the new password
          const newHash = await bcrypt.hash(password, saltRounds);
          await userModel.updatePassword(user.id, newHash);
          
          // Continue to login (no need to return, just proceed to token generation)
      } else {
          // Standard Password Check for normal users
          const passwordMatch = await bcrypt.compare(password, user.password_hash);
          if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
          }
      }

    } else {
      // New User: Validate password strength and Create
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
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin || false
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token: appToken, 
      user: { 
        email: user.email, 
        firstName: user.first_name, 
        lastName: user.last_name,
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin || false
      } 
    });

  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(400).json({ message: 'Google authentication failed.' });
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
    const expires = new Date(Date.now() + 3600000); 

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
       details: 'Must be 8+ chars with uppercase, lowercase, number, and special char.'
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

// === NEW METHODS ===

exports.updateProfile = async (req, res) => {
  const { firstName, lastName, email } = req.body;
  const userId = req.user.userId; 

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await userModel.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: 'Email is already in use by another account.' });
      }
    }

    const updatedUser = await userModel.updateProfile(userId, { firstName, lastName, email });
    
    // Generate a NEW token with the updated information so the frontend can update immediately
    const token = jwt.sign(
      { 
        userId: userId, 
        email: updatedUser.email, 
        firstName: updatedUser.first_name, 
        lastName: updatedUser.last_name,
        is_admin: updatedUser.is_admin,
        is_super_admin: updatedUser.is_super_admin || false
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      message: 'Profile updated successfully.', 
      token, 
      user: {
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        is_admin: updatedUser.is_admin,
        is_super_admin: updatedUser.is_super_admin
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    // req.user.userId comes from the authMiddleware
    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return only safe data (no passwords!)
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      is_admin: user.is_admin,
      is_super_admin: user.is_super_admin
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new passwords are required.' });
  }

  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      message: 'New password is too weak.',
      details: 'Must be 8+ chars with uppercase, lowercase, number, and special char.'
    });
  }

  try {
    // 1. Get user to verify current password
    const user = await userModel.findByEmail(req.user.email);

    if (!user) {
        return res.status(404).json({ message: 'User not found.' });
    }

    // 2. Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    // 3. Hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    await userModel.updatePassword(userId, newPasswordHash);

    res.json({ message: 'Password changed successfully.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error changing password.' });
  }
};