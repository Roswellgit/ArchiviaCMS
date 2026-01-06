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

router.put('/update-profile/initiate', authMiddleware, authController.initiateUpdateProfile);
router.post('/update-profile/verify', authMiddleware, authController.verifyUpdateProfile);

router.post('/request-password-otp', authMiddleware, authController.requestPasswordChangeOTP);

router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;