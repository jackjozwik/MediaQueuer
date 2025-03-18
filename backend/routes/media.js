// routes/media.js
const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { verifyToken, isFacultyOrAdmin } = require('../middleware/auth');
const { upload, handleUploadErrors } = require('../middleware/upload');

// Get approved media (public route for display TVs)
router.get('/approved', mediaController.getApprovedMedia);

// Protected routes
router.post(
  '/upload', 
  verifyToken, 
  upload.single('media'), 
  handleUploadErrors, 
  mediaController.uploadMedia
);

// Admin routes
router.get('/pending', verifyToken, isFacultyOrAdmin, mediaController.getPendingMedia);
router.post('/approve/:id', verifyToken, isFacultyOrAdmin, mediaController.approveMedia);
router.post('/reject/:id', verifyToken, isFacultyOrAdmin, mediaController.rejectMedia);

// Content management routes
router.delete('/delete/:id', verifyToken, isFacultyOrAdmin, mediaController.deleteMedia);
router.put('/update/:id', verifyToken, isFacultyOrAdmin, mediaController.updateMedia);

// New route for updating display order
router.post('/order', verifyToken, isFacultyOrAdmin, mediaController.updateMediaOrder);

module.exports = router;