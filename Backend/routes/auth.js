const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ✅ FIX: Destructure 'verifyToken' from the middleware
const { verifyToken } = require('../middleware/authMiddleware'); 

// Public Routes
router.post('/register', authController.register);
router.post('/verify', authController.verifyEmail);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected Routes (Use verifyToken instead of authMiddleware)
router.get('/profile', verifyToken, authController.getProfile);

router.put('/update-profile/initiate', verifyToken, authController.initiateUpdateProfile);
router.post('/update-profile/verify', verifyToken, authController.verifyUpdateProfile);

router.post('/request-password-otp', verifyToken, authController.requestPasswordChangeOTP);

router.put('/change-password', verifyToken, authController.changePassword);

// ✅ NEW: Route for direct password change (Used by First Login Modal)
router.put('/change-password-direct', verifyToken, authController.changePasswordDirect);

module.exports = router;