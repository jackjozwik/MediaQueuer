// controllers/mediaController.js
const fs = require('fs');
const path = require('path');
const { db } = require('../db/database');

// Get settings from database
const getSettings = () => {
  const settings = {};
  const rows = db.prepare('SELECT key, value FROM settings').all();
  
  rows.forEach(row => {
    settings[row.key] = row.value;
  });
  
  return settings;
};

// Upload new media
const uploadMedia = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }
    
    const { title, description, duration } = req.body;
    const file = req.file;
    
    // Determine media type (image or video)
    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
    
    // Get auto-approve setting
    const settings = getSettings();
    const autoApprove = settings.auto_approve === 'true';
    
    // Insert media record
    const status = autoApprove ? 'approved' : 'pending';
    const approvedAt = autoApprove ? "datetime('now')" : null;
    const approvedBy = autoApprove ? req.user.id : null;
    
    const result = db.prepare(`
      INSERT INTO media (
        title, description, file_path, file_type, duration, 
        user_id, status, created_at, 
        approved_at, approved_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ${approvedAt}, ?)
    `).run(
      title,
      description,
      file.path,
      fileType,
      fileType === 'image' ? (duration || settings.default_image_duration) : null,
      req.user.id,
      status,
      approvedBy
    );
    
    return res.status(201).json({
      success: true,
      message: autoApprove ? 'Media uploaded and approved' : 'Media uploaded, waiting for approval',
      data: { 
        id: result.lastInsertRowid,
        status 
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get approved media for display
const getApprovedMedia = async (req, res) => {
  try {
    // Check if profile_image column exists in the users table
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasProfileImage = tableInfo.some(column => column.name === 'profile_image');
    
    // Build the query based on column availability
    let query = `
      SELECT 
        m.id, m.title, m.description, m.file_path, m.file_type, 
        m.duration, m.display_order, m.created_at, m.approved_at, m.metadata,
        u.username as uploaded_by, 
        u.first_name, u.last_name, u.preferred_name,
        COALESCE(u.preferred_name, u.first_name) || ' ' || u.last_name as full_name
    `;
    
    // Add profile_image only if column exists
    if (hasProfileImage) {
      query += `, u.profile_image`;
    }
    
    query += `
      FROM media m
      JOIN users u ON m.user_id = u.id
      WHERE m.status = 'approved'
      ORDER BY 
        CASE WHEN m.display_order IS NULL THEN 1 ELSE 0 END, 
        m.display_order ASC,
        m.approved_at DESC
    `;
    
    const media = db.prepare(query).all();
    
    // Transform file paths to URLs
    const mediaWithUrls = media.map(item => {
      // Parse metadata if it exists
      let metadata = {};
      try {
        if (item.metadata) {
          metadata = JSON.parse(item.metadata);
        }
      } catch (err) {
        console.warn('Error parsing metadata for item', item.id, err);
      }
      
      return {
        ...item,
        file_url: `/uploads/${path.basename(item.file_path)}`,
        metadata: metadata
      };
    });
    
    return res.json({
      success: true,
      data: { media: mediaWithUrls }
    });
  } catch (error) {
    console.error('Get media error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get pending media for approval
const getPendingMedia = async (req, res) => {
  try {
    const media = db.prepare(`
      SELECT 
        m.id, m.title, m.description, m.file_path, m.file_type, 
        m.duration, m.created_at, m.metadata,
        u.username as uploaded_by, u.id as user_id
      FROM media m
      JOIN users u ON m.user_id = u.id
      WHERE m.status = 'pending'
      ORDER BY m.created_at ASC
    `).all();
    
    // Transform file paths to URLs
    const mediaWithUrls = media.map(item => ({
      ...item,
      file_url: `/uploads/${path.basename(item.file_path)}`,
      metadata: item.metadata ? JSON.parse(item.metadata) : {}
    }));
    
    return res.json({
      success: true,
      data: { media: mediaWithUrls }
    });
  } catch (error) {
    console.error('Get pending media error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Approve media
const approveMedia = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Update media status
    const result = db.prepare(`
      UPDATE media 
      SET status = 'approved', approved_at = datetime('now'), approved_by = ?
      WHERE id = ? AND status = 'pending'
    `).run(req.user.id, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Media not found or already processed' 
      });
    }
    
    return res.json({
      success: true,
      message: 'Media approved successfully'
    });
  } catch (error) {
    console.error('Approve media error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Reject media
const rejectMedia = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get media details
    const media = db.prepare('SELECT file_path FROM media WHERE id = ? AND status = ?')
      .get(id, 'pending');
    
    if (!media) {
      return res.status(404).json({ 
        success: false, 
        message: 'Media not found or already processed' 
      });
    }
    
    // Update media status
    db.prepare(`
      UPDATE media 
      SET status = 'rejected', approved_at = datetime('now'), approved_by = ?
      WHERE id = ?
    `).run(req.user.id, id);
    
    // Remove file
    fs.unlink(media.file_path, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      }
    });
    
    return res.json({
      success: true,
      message: 'Media rejected and removed'
    });
  } catch (error) {
    console.error('Reject media error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Delete approved media
const deleteMedia = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get media details
    const media = db.prepare('SELECT file_path FROM media WHERE id = ?')
      .get(id);
    
    if (!media) {
      return res.status(404).json({ 
        success: false, 
        message: 'Media not found' 
      });
    }
    
    // Delete from database
    db.prepare('DELETE FROM media WHERE id = ?').run(id);
    
    // Remove file
    fs.unlink(media.file_path, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      }
    });
    
    return res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Delete media error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Update media settings (duration, etc.)
const updateMediaOrder = async (req, res) => {
  const { items } = req.body;
  
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Items array is required' 
    });
  }
  
  try {
    // Begin transaction
    db.prepare('BEGIN TRANSACTION').run();
    
    // Update each item
    const updateStmt = db.prepare(`
      UPDATE media
      SET display_order = ?
      WHERE id = ?
    `);
    
    for (const item of items) {
      updateStmt.run(item.display_order, item.id);
    }
    
    // Commit transaction
    db.prepare('COMMIT').run();
    
    return res.json({
      success: true,
      message: 'Display order updated successfully'
    });
  } catch (error) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    
    console.error('Update order error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

const updateMedia = async (req, res) => {
  const { id } = req.params;
  const { title, description, duration, metadata } = req.body;
  
  try {
    // Update media
    const updateFields = [];
    const params = [];
    
    if (title !== undefined) {
      updateFields.push('title = ?');
      params.push(title);
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    
    if (duration !== undefined) {
      updateFields.push('duration = ?');
      params.push(duration);
    }
    
    // Add metadata handling
    if (metadata !== undefined) {
      updateFields.push('metadata = ?');
      params.push(metadata);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No fields to update' 
      });
    }
    
    // Add ID to params
    params.push(id);
    
    const result = db.prepare(`
      UPDATE media 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...params);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Media not found' 
      });
    }
    
    return res.json({
      success: true,
      message: 'Media updated successfully'
    });
  } catch (error) {
    console.error('Update media error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

module.exports = {
  uploadMedia,
  getApprovedMedia,
  getPendingMedia,
  approveMedia,
  rejectMedia,
  deleteMedia,
  updateMedia,
  updateMediaOrder
};