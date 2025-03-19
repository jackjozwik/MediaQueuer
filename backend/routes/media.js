// routes/media.js
const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { verifyToken, isFacultyOrAdmin } = require('../middleware/auth');
const { upload, handleUploadErrors } = require('../middleware/upload');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Configure storage for QR codes
const qrCodeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const qrUploadsDir = path.join(__dirname, '../uploads/qrcodes');
    if (!fs.existsSync(qrUploadsDir)) {
      fs.mkdirSync(qrUploadsDir, { recursive: true });
    }
    cb(null, qrUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'qrcode-' + uniqueSuffix + ext);
  }
});

const qrCodeUpload = multer({
  storage: qrCodeStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Add QR code to media
router.post(
  '/:id/qrcode', 
  verifyToken, 
  qrCodeUpload.single('qrCode'),
  mediaController.uploadMediaQRCode
);

// Delete QR code from media
router.delete(
  '/:id/qrcode', 
  verifyToken, 
  mediaController.deleteMediaQRCode
);

module.exports = router;