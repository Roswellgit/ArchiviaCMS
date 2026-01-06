const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminMiddleware = require('../middleware/adminMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

// --- ACCOUNT & GROUP CREATION (RBAC) ---
router.post('/create-account', authMiddleware, adminController.createAccount);
router.post('/create-group', authMiddleware, adminController.createGroup);

// ------------------------------------------
// PROTECT ALL ROUTES BELOW THIS LINE
// ------------------------------------------
router.use(authMiddleware, adminMiddleware);

// --- Analytics ---
router.get('/analytics', adminController.getDashboardStats);

// --- User Management ---
router.get('/users', adminController.getAllUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/reactivate', adminController.reactivateUser);

router.get('/user-archive-requests', adminController.getUserArchiveRequests);
router.delete('/user-archive-requests/:id/approve', adminController.approveUserArchive);
router.put('/user-archive-requests/:id/reject', adminController.rejectUserArchive);

// --- Document Management ---

// 1. Get Pending Queue (Must come BEFORE generic /:id routes)
router.get('/documents/pending', adminController.getPendingDocuments);

// 2. Approve/Reject
router.put('/documents/:id/approve', adminController.approveDocument);
router.put('/documents/:id/reject', adminController.rejectDocument);

// 3. General Admin Updates
router.put('/documents/:id', adminController.adminUpdateDocument);
router.delete('/documents/:id', adminController.adminDeleteDocument);
router.post('/documents/:id/archive', adminController.adminRequestArchive);
router.put('/documents/:id/restore', adminController.restoreDocument);

// --- Requests Management ---
router.get('/requests', adminController.getDeletionRequests);
router.delete('/requests/:id/approve', adminController.approveDeletion);
router.put('/requests/:id/reject', adminController.rejectDeletion);

router.get('/archive-requests', adminController.getArchiveRequests);
router.delete('/archive-requests/:id/approve', adminController.approveArchive);
router.put('/archive-requests/:id/reject', adminController.rejectArchive);

// --- Settings & Branding ---
router.put('/settings', adminController.updateSettings);
router.post('/icon-upload', adminController.uploadIcon);
router.post('/upload-bg-image', adminController.uploadBgImage);
router.post('/remove-bg-image', adminController.removeBgImage);
router.post('/upload-brand-icon', adminController.uploadBrandIcon);
router.post('/remove-brand-icon', adminController.removeBrandIcon);
router.post('/settings/reset', adminController.resetSettings);

router.get('/options', adminController.getFormOptions);
router.post('/options', adminController.addFormOption); 
router.delete('/options', adminController.deleteFormOption);
router.post('/create-account', adminController.createAccount);

module.exports = router;