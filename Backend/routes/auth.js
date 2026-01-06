const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware'); 

router.post('/register', authController.register);
router.post('/verify', authController.verifyEmail);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/profile', authMiddleware, authController.getProfile);

// --- OLD UPDATE ROUTE (Replaced by the 2-step OTP flow below) ---
// router.put('/profile', authMiddleware, authController.updateProfile);

// --- NEW ACCOUNT UPDATE ROUTES (OTP Flow) ---
// 1. Request update -> Sends OTP
router.put('/update-profile/initiate', authMiddleware, authController.initiateUpdateProfile);
// 2. Verify OTP -> Updates Database
router.post('/update-profile/verify', authMiddleware, authController.verifyUpdateProfile);

router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;