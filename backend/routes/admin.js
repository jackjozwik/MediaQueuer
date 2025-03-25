// routes/admin.js
const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const { db } = require('../db/database');

// Get all settings
router.get('/settings', verifyToken, isAdmin, (req, res) => {
  try {
    const settings = db.prepare('SELECT key, value FROM settings').all();
    
    return res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update setting
router.put('/settings/:key', verifyToken, isAdmin, (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  if (value === undefined) {
    return res.status(400).json({ 
      success: false, 
      message: 'Value is required' 
    });
  }
  
  try {
    const result = db.prepare(`
      UPDATE settings 
      SET value = ?, updated_at = datetime('now'), updated_by = ?
      WHERE key = ?
    `).run(value.toString(), req.user.id, key);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Setting not found' 
      });
    }
    
    return res.json({
      success: true,
      message: 'Setting updated successfully'
    });
  } catch (error) {
    console.error('Update setting error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get all users
router.get('/users', verifyToken, isAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, role, email, first_name, last_name, preferred_name,
             created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `).all();
    
    return res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update user role
router.put('/users/:id/role', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  // Validate role
  if (!role || !['student', 'faculty', 'admin'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role. Must be student, faculty, or admin'
    });
  }
  
  try {
    // Check if user exists
    const user = db.prepare('SELECT 1 FROM users WHERE id = ?').get(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update role
    db.prepare('UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?')
      .run(role, id);
    
    return res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;