const express = require('express');
const adminController = require('../controllers/adminController');
const adminMiddleware = require('../middleware/adminMiddleware');
const router = express.Router();

router.use(adminMiddleware);

// Analytics
router.get('/analytics', adminController.getDashboardStats);

// User 
router.get('/users', adminController.getAllUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/reactivate', adminController.reactivateUser);

// User Archive Requests
router.get('/user-archive-requests', adminController.getUserArchiveRequests);
router.delete('/user-archive-requests/:id/approve', adminController.approveUserArchive);
router.put('/user-archive-requests/:id/reject', adminController.rejectUserArchive);

// Document 
router.put('/documents/:id', adminController.adminUpdateDocument);
router.delete('/documents/:id', adminController.adminDeleteDocument);
router.post('/documents/:id/archive', adminController.adminRequestArchive);
// NEW: Restore Route
router.put('/documents/:id/restore', adminController.restoreDocument);

// User Deletion Requests (Documents)
router.get('/requests', adminController.getDeletionRequests);
router.delete('/requests/:id/approve', adminController.approveDeletion);
router.put('/requests/:id/reject', adminController.rejectDeletion);

// Admin Archive Requests (Documents)
router.get('/archive-requests', adminController.getArchiveRequests);
// UPDATED: Now points to the specific archive approval handler
router.delete('/archive-requests/:id/approve', adminController.approveArchive);
router.put('/archive-requests/:id/reject', adminController.rejectArchive);

// Theme/Settings 
router.put('/settings', adminController.updateSettings);
router.post('/icon-upload', adminController.uploadIcon);
router.post('/upload-bg-image', adminController.uploadBgImage);
router.post('/remove-bg-image', adminController.removeBgImage);
router.post('/upload-brand-icon', adminController.uploadBrandIcon);
router.post('/remove-brand-icon', adminController.removeBrandIcon);
router.post('/settings/reset', adminController.resetSettings);

module.exports = router;