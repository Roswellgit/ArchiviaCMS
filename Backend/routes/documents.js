const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware'); 

router.get('/debug-schema', async (req, res) => {
  const db = require('../db'); 
  try {
    const result = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents';
    `);
    res.json({ 
      message: "Columns found in DB", 
      columns: result.rows.map(r => r.column_name) 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/', optionalAuthMiddleware, documentController.getAllDocuments);
router.get('/search', optionalAuthMiddleware, documentController.searchDocuments);
router.post('/filter', optionalAuthMiddleware, documentController.filterDocuments);

router.get('/popular', documentController.getPopularSearches);
router.get('/filters', documentController.getFilters);

router.post('/citation', optionalAuthMiddleware, documentController.generateCitation);
router.get('/my-uploads', verifyToken, documentController.getUserUploads);
router.post('/upload', verifyToken, documentController.uploadDocument);
router.put('/:id', verifyToken, documentController.updateDocument);
router.delete('/:id', verifyToken, documentController.deleteDocument);
router.post('/:id/request-delete', verifyToken, documentController.requestDeleteDocument);
console.log('Verify Token:', verifyToken);
console.log('Is Admin:', isAdmin);
router.put('/approve/:id', verifyToken, isAdmin, documentController.approveDocument);

module.exports = router;