const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware'); 


router.get('/', optionalAuthMiddleware, documentController.getAllDocuments);
router.get('/search', optionalAuthMiddleware, documentController.searchDocuments);
router.post('/filter', optionalAuthMiddleware, documentController.filterDocuments);


router.get('/popular', documentController.getPopularSearches);
router.get('/filters', documentController.getFilters);


router.post('/citation', optionalAuthMiddleware, documentController.generateCitation);


router.get('/my-uploads', authMiddleware, documentController.getUserUploads);
router.post('/upload', authMiddleware, documentController.uploadDocument);
router.put('/:id', authMiddleware, documentController.updateDocument);
router.delete('/:id', authMiddleware, documentController.deleteDocument);
router.post('/:id/request-delete', authMiddleware, documentController.requestDeleteDocument);

module.exports = router;