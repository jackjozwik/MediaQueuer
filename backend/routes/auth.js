// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const multer = require('multer');
const path = require('path');

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.registerPublicUser);

// Protected routes
router.get('/me', verifyToken, authController.getCurrentUser);
router.post('/admin/register', verifyToken, isAdmin, authController.registerUser);

const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      const profileUploadsDir = path.join(__dirname, '../uploads/profiles');
      if (!fs.existsSync(profileUploadsDir)) {
        fs.mkdirSync(profileUploadsDir, { recursive: true });
      }
      cb(null, profileUploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'profile-' + uniqueSuffix + ext);
    }
  });
  
  const profileUpload = multer({ 
    storage: profileStorage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    }
  });
  
  // Add a route to update profile image
  router.post(
    '/update-profile-image',
    verifyToken,
    profileUpload.single('profileImage'),
    async (req, res) => {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image uploaded'
        });
      }
  
      try {
        // Update user's profile image in database
        const result = db.prepare(`
          UPDATE users 
          SET profile_image = ? 
          WHERE id = ?
        `).run(`/uploads/profiles/${path.basename(req.file.path)}`, req.user.id);
  
        if (result.changes === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
  
        return res.json({
          success: true,
          message: 'Profile image updated successfully',
          data: {
            profileImage: `/uploads/profiles/${path.basename(req.file.path)}`
          }
        });
      } catch (error) {
        console.error('Update profile image error:', error);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  );

module.exports = router;
