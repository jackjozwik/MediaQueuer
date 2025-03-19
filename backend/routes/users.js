// File: backend/routes/users.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { db } = require('../db/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage for profile images
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

// Add GET profile route - this was missing
router.get('/profile', verifyToken, async (req, res) => {
    try {
        // Get columns in users table to check if profile_image exists
        const tableInfo = db.prepare("PRAGMA table_info(users)").all();
        const hasProfileImage = tableInfo.some(column => column.name === 'profile_image');
        
        // Build query based on available columns
        let query = `
          SELECT id, username, role, first_name, last_name, preferred_name, email
        `;
        
        // Add profile_image to query only if the column exists
        if (hasProfileImage) {
            query += `, profile_image`;
        }
        
        query += ` FROM users WHERE id = ?`;
        
        const user = db.prepare(query).get(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    preferredName: user.preferred_name,
                    email: user.email,
                    profileImage: user.profile_image || null
                }
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update user profile info (name, email, password)
router.put('/update', verifyToken, async (req, res) => {
    const { firstName, lastName, preferredName, email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        // Start building update query
        const updateFields = [];
        const params = [];

        // Add basic fields
        if (firstName) {
            updateFields.push('first_name = ?');
            params.push(firstName);
        }

        if (lastName) {
            updateFields.push('last_name = ?');
            params.push(lastName);
        }

        updateFields.push('preferred_name = ?');
        params.push(preferredName || null);

        if (email) {
            // Check if email is already used by another user
            const existingUser = db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(email, userId);

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Email is already in use by another account'
                });
            }

            updateFields.push('email = ?');
            params.push(email);
        }

        // Handle password update if provided
        if (currentPassword && newPassword) {
            // Get current user password
            const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // In a real app, you would use bcrypt.compareSync here
            // This is a simplified version since we're not hashing passwords in this example
            if (user.password !== currentPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            updateFields.push('password = ?');
            params.push(newPassword);
        }

        // Only update if there are fields to update
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        // Add updated_at timestamp
        updateFields.push('updated_at = datetime(\'now\')');

        // Add user id to params
        params.push(userId);

        // Execute update
        const result = db.prepare(`
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `).run(...params);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update profile image
router.post('/update-profile-image',
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
            // Check if profile_image column exists
            const tableInfo = db.prepare("PRAGMA table_info(users)").all();
            const hasProfileImage = tableInfo.some(column => column.name === 'profile_image');
            
            if (!hasProfileImage) {
                return res.status(500).json({
                    success: false,
                    message: 'Profile image feature not available - database needs migration'
                });
            }
            
            // Get relative path for storage
            const relativePath = `/uploads/profiles/${path.basename(req.file.path)}`;
            
            // Update user's profile image in database
            const result = db.prepare(`
              UPDATE users 
              SET profile_image = ?, updated_at = datetime('now')
              WHERE id = ?
            `).run(relativePath, req.user.id);

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
                    profileImage: relativePath
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

// Get user uploads (pending, approved, rejected)
router.get('/uploads', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const status = req.query.status || 'all';

    try {
        let query = `
      SELECT 
        m.id, m.title, m.description, m.file_path, m.file_type, 
        m.duration, m.created_at, m.approved_at, m.status
      FROM media m
      WHERE m.user_id = ?
    `;

        const params = [userId];

        // Filter by status if provided
        if (status !== 'all') {
            query += ' AND m.status = ?';
            params.push(status);
        }

        // Add order by
        query += ' ORDER BY m.created_at DESC';

        const media = db.prepare(query).all(...params);

        // Transform file paths to URLs
        const mediaWithUrls = media.map(item => ({
            ...item,
            file_url: `/uploads/${path.basename(item.file_path)}`
        }));

        return res.json({
            success: true,
            data: { media: mediaWithUrls }
        });
    } catch (error) {
        console.error('Get user uploads error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;