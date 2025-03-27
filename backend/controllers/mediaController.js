// controllers/mediaController.js
const fs = require('fs');
const path = require('path');
const { db } = require('../db/database');
const displayState = require('../services/displayState');
// const QRCode = require('qrcode');

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
    let mediaDuration = duration;

    // For videos, try to extract duration using ffprobe if available
    // This is a placeholder - we'll need to implement this
    if (fileType === 'video') {
      try {
        // If ffprobe is available, extract video duration
        // For now, set a default duration for videos (300 seconds = 5 minutes)
        mediaDuration = 300; 
        console.log(`Setting default video duration: ${mediaDuration} seconds`);
      } catch (err) {
        console.error('Error extracting video duration:', err);
      }
    }

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
      mediaDuration || (fileType === 'image' ? settings.default_image_duration : null),
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

// Upload QR code for a specific media item
const uploadMediaQRCode = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No QR code file uploaded'
      });
    }

    // Check if media exists and belongs to the user or user is admin
    const media = db.prepare(`
      SELECT m.id, m.user_id FROM media m
      WHERE m.id = ?
    `).get(id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Check if user owns this media or is admin
    if (media.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this media item'
      });
    }

    // Update media with QR code path
    const qrCodePath = `/uploads/qrcodes/${path.basename(req.file.path)}`;

    const result = db.prepare(`
      UPDATE media
      SET qr_code = ?
      WHERE id = ?
    `).run(qrCodePath, id);

    if (result.changes === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update media with QR code'
      });
    }

    return res.json({
      success: true,
      message: 'QR code uploaded successfully',
      data: {
        qrCode: qrCodePath
      }
    });
  } catch (error) {
    console.error('Upload QR code error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete QR code for a specific media item
const deleteMediaQRCode = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if media exists and belongs to the user or user is admin
    const media = db.prepare(`
      SELECT m.id, m.user_id, m.qr_code FROM media m
      WHERE m.id = ?
    `).get(id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Check if user owns this media or is admin
    if (media.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this media item'
      });
    }

    // Check if media has QR code
    if (!media.qr_code) {
      return res.status(404).json({
        success: false,
        message: 'Media has no QR code to delete'
      });
    }

    // Delete the file if it exists
    try {
      const filePath = path.join(__dirname, '..', media.qr_code.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Error deleting QR code file:', err);
    }

    // Update media to remove QR code
    const result = db.prepare(`
      UPDATE media
      SET qr_code = NULL
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update media'
      });
    }

    return res.json({
      success: true,
      message: 'QR code deleted successfully'
    });
  } catch (error) {
    console.error('Delete QR code error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update the getApprovedMedia function to include qr_code field from media table
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
        m.qr_code, m.approved_by,
        u.username as uploaded_by, 
        u.first_name, u.last_name, u.preferred_name,
        COALESCE(u.preferred_name, u.first_name) || ' ' || u.last_name as full_name,
        approver.username as approved_by_username
    `;

    // Add profile_image only if column exists
    if (hasProfileImage) {
      query += `, u.profile_image`;
    }

    query += `
      FROM media m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN users approver ON m.approved_by = approver.id
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

    // We've moved to a new sync system, don't use the old caching method
    // displayState.cacheMediaItems(mediaWithUrls);

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
        m.duration, m.created_at, m.metadata, m.qr_code,
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
      // Add QR code URL if it exists
      qr_code: item.qr_code ? item.qr_code : null,
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
    
    // Clear the display state media cache so the new item appears
    if (displayState && typeof displayState.clearMediaCache === 'function') {
      displayState.clearMediaCache();
      console.log('Media cache cleared after approval');
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
    
    // Clear the display state media cache
    if (displayState && typeof displayState.clearMediaCache === 'function') {
      displayState.clearMediaCache();
      console.log('Media cache cleared after deletion');
    }
    
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
    
    // Clear the media cache since display order has changed
    if (displayState && typeof displayState.clearMediaCache === 'function') {
      displayState.clearMediaCache();
      console.log('Media cache cleared after order update');
    }
    
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
    
    // Clear the media cache if we updated duration or other display-related fields
    if (displayState && typeof displayState.clearMediaCache === 'function') {
      displayState.clearMediaCache();
      console.log('Media cache cleared after update');
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

/**
 * Get synchronized display state with timing information
 */
const getSyncDisplayState = async (req, res) => {
  try {
    // Get current display state
    const state = displayState.getSyncDisplayState();
    
    // Get approved media items
    const mediaItems = displayState.getSyncMediaItems();
    
    // Calculate time information
    const now = Date.now();
    const elapsedTime = (now - state.startTimestamp) / 1000; // seconds
    
    // Prepare time info
    const timeInfo = {
      serverTime: now,
      elapsedTime
    };
    
    return res.json({
      success: true,
      data: {
        state,
        media: mediaItems,
        timeInfo
      }
    });
  } catch (error) {
    console.error('Error getting sync display state:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting sync display state'
    });
  }
};

/**
 * Update video duration
 */
const updateVideoDuration = async (req, res) => {
  try {
    const { mediaId, duration } = req.body;
    
    if (!mediaId || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Media ID and duration are required'
      });
    }
    
    // Update duration in database and cache
    displayState.updateMediaDuration(mediaId, duration);
    
    return res.json({
      success: true,
      message: 'Video duration updated'
    });
  } catch (error) {
    console.error('Error updating video duration:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating video duration'
    });
  }
};

/**
 * Advance to the next media item
 */
const advanceMedia = async (req, res) => {
  try {
    const newState = displayState.advanceMedia();
    
    return res.json({
      success: true,
      message: 'Advanced to next media',
      data: { state: newState }
    });
  } catch (error) {
    console.error('Error advancing media:', error);
    return res.status(500).json({
      success: false,
      message: 'Error advancing media'
    });
  }
};

/**
 * Reset the timeline (admin only)
 */
const resetTimeline = async (req, res) => {
  try {
    // Check if user is admin or faculty
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'faculty')) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }
    
    const newState = displayState.resetTimeline();
    
    return res.json({
      success: true,
      message: 'Timeline reset successfully',
      data: { state: newState }
    });
  } catch (error) {
    console.error('Error resetting timeline:', error);
    return res.status(500).json({
      success: false,
      message: 'Error resetting timeline'
    });
  }
};

/**
 * Skip to specific media (admin only)
 */
const skipToMedia = async (req, res) => {
  try {
    // Check if user is admin or faculty
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'faculty')) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }
    
    const { index } = req.body;
    
    if (index === undefined || index < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid media index is required'
      });
    }
    
    const newState = displayState.skipToMedia(parseInt(index));
    
    return res.json({
      success: true,
      message: 'Skipped to media successfully',
      data: { state: newState }
    });
  } catch (error) {
    console.error('Error skipping to media:', error);
    return res.status(500).json({
      success: false,
      message: 'Error skipping to media'
    });
  }
};

// Archive a media item
const archiveMedia = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if media exists and is approved
    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }
    
    if (media.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved media can be archived'
      });
    }
    
    // Archive the media
    const result = db.prepare(`
      UPDATE media
      SET status = 'archived', archived_at = datetime('now'), archived_by = ?
      WHERE id = ?
    `).run(req.user.id, id);
    
    if (result.changes === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to archive media'
      });
    }
    
    // Clear the media cache to reflect changes
    if (displayState && typeof displayState.clearMediaCache === 'function') {
      displayState.clearMediaCache();
    }
    
    return res.json({
      success: true,
      message: 'Media archived successfully'
    });
  } catch (error) {
    console.error('Archive media error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Restore an archived media item
const restoreMedia = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if media exists and is archived
    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }
    
    if (media.status !== 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Only archived media can be restored'
      });
    }
    
    // Restore the media
    const result = db.prepare(`
      UPDATE media
      SET status = 'approved', approved_at = datetime('now'), approved_by = ?
      WHERE id = ?
    `).run(req.user.id, id);
    
    if (result.changes === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to restore media'
      });
    }
    
    // Clear the media cache to reflect changes
    if (displayState && typeof displayState.clearMediaCache === 'function') {
      displayState.clearMediaCache();
    }
    
    return res.json({
      success: true,
      message: 'Media restored successfully'
    });
  } catch (error) {
    console.error('Restore media error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get archived media
const getArchivedMedia = async (req, res) => {
  try {
    // Check if profile_image column exists in the users table
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasProfileImage = tableInfo.some(column => column.name === 'profile_image');

    // Build the query based on column availability
    let query = `
      SELECT 
        m.id, m.title, m.description, m.file_path, m.file_type, 
        m.duration, m.display_order, m.created_at, m.approved_at, m.metadata,
        m.qr_code, m.approved_by, m.archived_at, m.archived_by,
        u.username as uploaded_by, 
        u.first_name, u.last_name, u.preferred_name,
        COALESCE(u.preferred_name, u.first_name) || ' ' || u.last_name as full_name,
        approver.username as approved_by_username,
        archiver.username as archived_by_username
    `;

    // Add profile_image only if column exists
    if (hasProfileImage) {
      query += `, u.profile_image`;
    }

    query += `
      FROM media m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN users approver ON m.approved_by = approver.id
      LEFT JOIN users archiver ON m.archived_by = archiver.id
      WHERE m.status = 'archived'
      ORDER BY m.archived_at DESC
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
    console.error('Get archived media error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user uploads
const getUserUploads = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT m.*, u.email, u.first_name, u.last_name, u.preferred_name,
        CASE 
          WHEN u.preferred_name IS NOT NULL AND u.preferred_name != '' 
          THEN u.preferred_name 
          ELSE u.first_name || ' ' || u.last_name 
        END as full_name
      FROM media m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
    `;

    const userMedia = db.prepare(query).all(userId);

    const mediaWithUrls = userMedia.map(media => ({
      ...media,
      file_url: `/uploads/${path.basename(media.file_path)}`,
      qr_code: media.qr_code ? `/uploads/qrcodes/${path.basename(media.qr_code)}` : null
    }));

    return res.json({
      success: true,
      data: {
        media: mediaWithUrls
      }
    });
  } catch (err) {
    console.error('Error fetching user uploads:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your uploads'
    });
  }
};

// Update user media
const updateUserMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description } = req.body;

    // First check if the media belongs to the user
    const mediaCheck = db.prepare('SELECT * FROM media WHERE id = ? AND user_id = ?').get(id, userId);

    if (!mediaCheck) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this media'
      });
    }

    // Update the media
    db.prepare(`
      UPDATE media 
      SET title = ?, description = ?, status = 'pending' 
      WHERE id = ?
    `).run(title, description, id);

    // Get the updated media
    const updatedMedia = db.prepare(`
      SELECT m.*, u.email, u.first_name, u.last_name, u.preferred_name,
        CASE 
          WHEN u.preferred_name IS NOT NULL AND u.preferred_name != '' 
          THEN u.preferred_name 
          ELSE u.first_name || ' ' || u.last_name 
        END as full_name
      FROM media m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(id);

    const mediaWithUrl = {
      ...updatedMedia,
      file_url: `/uploads/${path.basename(updatedMedia.file_path)}`,
      qr_code: updatedMedia.qr_code ? `/uploads/qrcodes/${path.basename(updatedMedia.qr_code)}` : null
    };

    // If it was previously approved, update the display state
    if (mediaCheck.status === 'approved') {
      // Remove from the timeline
      displayState.clearMediaCache();
    }

    return res.json({
      success: true,
      message: 'Media updated successfully. It will need to be approved again.',
      data: {
        media: mediaWithUrl
      }
    });
  } catch (err) {
    console.error('Error updating user media:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update media'
    });
  }
};

// Delete user media
const deleteUserMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // First check if the media belongs to the user
    const media = db.prepare('SELECT * FROM media WHERE id = ? AND user_id = ?').get(id, userId);

    if (!media) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this media'
      });
    }

    // Delete the media record
    db.prepare('DELETE FROM media WHERE id = ?').run(id);

    // Attempt to delete the physical file
    try {
      if (media.file_path) {
        fs.unlinkSync(media.file_path);
      }
      
      // Also delete QR code if it exists
      if (media.qr_code) {
        fs.unlinkSync(media.qr_code);
      }
    } catch (fileErr) {
      console.error('Error deleting media file:', fileErr);
      // Continue even if file deletion fails
    }

    // If it was approved, refresh the media cache
    if (media.status === 'approved') {
      displayState.clearMediaCache();
    }

    return res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting user media:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete media'
    });
  }
};

// Function to get QR code for a specific media item
const getMediaQRCode = async (req, res) => {
  const { id } = req.params;

  try {
    // Get QR code path from database
    const media = db.prepare(`
      SELECT id, qr_code FROM media WHERE id = ?
    `).get(id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // If media doesn't have a QR code
    if (!media.qr_code) {
      return res.status(404).json({
        success: false,
        message: 'No QR code available for this media'
      });
    }

    // Extract just the filename from the stored path
    const qrCodeFileName = path.basename(media.qr_code);
    const qrCodePath = path.join(__dirname, '../uploads/qrcodes', qrCodeFileName);

    // Check if file exists
    if (!fs.existsSync(qrCodePath)) {
      return res.status(404).json({
        success: false,
        message: 'QR code file not found'
      });
    }

    // Return the file
    return res.sendFile(qrCodePath);
  } catch (error) {
    console.error('Get media QR code error:', error);
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
  updateMediaOrder,
  uploadMediaQRCode,
  deleteMediaQRCode,
  getMediaQRCode,
  getSyncDisplayState,   // New endpoint for sync mode
  updateVideoDuration,   // Update video duration
  resetTimeline,         // Reset timeline to start
  skipToMedia,          // Skip to specific media
  archiveMedia,
  restoreMedia,
  getArchivedMedia,
  getUserUploads,
  updateUserMedia,
  deleteUserMedia
};