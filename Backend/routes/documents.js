const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware'); 

router.get('/debug-schema', async (req, res) => {
  const db = require('../db'); // Adjust path to your db.js
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


router.get('/my-uploads', authMiddleware, documentController.getUserUploads);
router.post('/upload', authMiddleware, documentController.uploadDocument);
router.put('/:id', authMiddleware, documentController.updateDocument);
router.delete('/:id', authMiddleware, documentController.deleteDocument);
router.post('/:id/request-delete', authMiddleware, documentController.requestDeleteDocument);

console.log('Auth Middleware:', authMiddleware);
console.log('Admin Middleware:', adminMiddleware);
console.log('Approve Controller:', documentController.approveDocument);



router.put('/approve/:id', authMiddleware, adminMiddleware, documentController.approveDocument);

module.exports = router;