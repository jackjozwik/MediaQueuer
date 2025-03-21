// services/displayState.js

// Backend service to manage synchronized display state
const { db } = require('../db/database');
const cache = require('../utils/cache');

// Cache keys
const SYNC_STATE_KEY = 'sync_display_state';
const SYNC_MEDIA_KEY = 'sync_display_media';

/**
 * Default display state structure
 */
const defaultDisplayState = {
  currentIndex: 0,            // Current media index
  startTimestamp: Date.now(), // When the current item started
  lastUpdateTime: Date.now(), // When state was last updated
};

// Virtual player state
let virtualPlayerTimer = null;
let periodicRefreshTimer = null;
let lastMediaCount = 0;

/**
 * Initialize the sync display state
 */
function initSyncDisplayState() {
  // Check if we already have a state in cache
  const cachedState = cache.get(SYNC_STATE_KEY);
  
  if (!cachedState) {
    console.log('[VIRTUAL PLAYER] Initializing sync display state');
    cache.set(SYNC_STATE_KEY, defaultDisplayState);
  }
  
  // Get initial media count
  const mediaItems = getSyncMediaItems();
  lastMediaCount = mediaItems.length;
  
  // Start the periodic refresh
  startPeriodicRefresh();
  
  // Start the virtual player
  startVirtualPlayer();
  
  return cachedState || defaultDisplayState;
}

/**
 * Get the current synchronized display state
 * @returns {Object} Current display state
 */
function getSyncDisplayState() {
  const state = cache.get(SYNC_STATE_KEY) || defaultDisplayState;
  return state;
}

/**
 * Get the approved media items for synchronization
 * @returns {Array} Array of media items
 */
function getSyncMediaItems() {
  try {
    // First check cache
    const cachedMedia = cache.get(SYNC_MEDIA_KEY);
    
    if (cachedMedia) {
      return cachedMedia;
    }
    
    // If not in cache, get from database
    const query = `
      SELECT 
        m.id, m.title, m.description, m.file_path, m.file_type, 
        m.duration, m.display_order, m.created_at, m.approved_at, m.metadata,
        m.qr_code, 
        u.username as uploaded_by, 
        u.first_name, u.last_name, u.preferred_name,
        COALESCE(u.preferred_name, u.first_name) || ' ' || u.last_name as full_name
      FROM media m
      JOIN users u ON m.user_id = u.id
      WHERE m.status = 'approved'
      ORDER BY 
        CASE WHEN m.display_order IS NULL THEN 1 ELSE 0 END, 
        m.display_order ASC,
        m.approved_at DESC
    `;
    
    const rows = db.prepare(query).all();
    
    // Process URLs to ensure they're accessible
    const mediaItems = rows.map(item => {
      // Generate file URL from path
      if (item.file_path) {
        const filename = item.file_path.split('\\').pop().split('/').pop();
        item.file_url = `/uploads/${filename}`;
      }
      
      // Generate QR code URL from path
      if (item.qr_code && typeof item.qr_code === 'string') {
        if (item.qr_code.includes('\\') || item.qr_code.includes('/')) {
          const qrFilename = item.qr_code.split('\\').pop().split('/').pop();
          item.qr_code = `/uploads/qrcodes/${qrFilename}`;
        } else if (!item.qr_code.startsWith('/') && !item.qr_code.startsWith('http')) {
          item.qr_code = `/uploads/qrcodes/${item.qr_code}`;
        }
      }
      
      // Parse metadata if it exists
      if (item.metadata && typeof item.metadata === 'string') {
        try {
          item.metadata = JSON.parse(item.metadata);
        } catch (e) {
          console.error('Error parsing metadata:', e);
          item.metadata = {};
        }
      }
      
      return item;
    });
    
    // Cache the media items
    cache.set(SYNC_MEDIA_KEY, mediaItems, 60 * 5); // Cache for 5 minutes
    
    return mediaItems;
  } catch (error) {
    console.error('Error getting sync media items:', error);
    return [];
  }
}

/**
 * Update the video duration for a media item
 * @param {string} mediaId - The ID of the media item
 * @param {number} duration - The duration in seconds
 */
function updateMediaDuration(mediaId, duration) {
  try {
    if (!mediaId || !duration) {
      throw new Error('Media ID and duration are required');
    }
    
    // Update in database
    db.prepare(
      'UPDATE media SET duration = ? WHERE id = ?'
    ).run(duration, mediaId);
    
    // Update in cache if it exists
    const cachedMedia = cache.get(SYNC_MEDIA_KEY);
    if (cachedMedia) {
      const updatedMedia = cachedMedia.map(item => {
        if (item.id === mediaId) {
          return { ...item, duration };
        }
        return item;
      });
      
      cache.set(SYNC_MEDIA_KEY, updatedMedia, 60 * 5); // Cache for 5 minutes
    }
    
    return true;
  } catch (error) {
    console.error('Error updating media duration:', error);
    throw error;
  }
}

/**
 * Move to the next media item
 */
function advanceMedia() {
  // Get the current state and media items
  const state = getSyncDisplayState();
  const mediaItems = getSyncMediaItems();
  
  if (!mediaItems || mediaItems.length === 0) {
    return state;
  }
  
  // Calculate the next index (with wrap-around)
  const nextIndex = (state.currentIndex + 1) % mediaItems.length;
  
  // Update the state
  const newState = {
    ...state,
    currentIndex: nextIndex,
    startTimestamp: Date.now(),
    lastUpdateTime: Date.now()
  };
  
  // Save to cache
  cache.set(SYNC_STATE_KEY, newState);
  
  // Log the transition
  const currentItem = mediaItems[nextIndex];
  console.log(`[VIRTUAL PLAYER] Now playing: ${currentItem.title} (${currentItem.file_type})`);

  // Schedule the next item
  scheduleNextItem(nextIndex);
  
  return newState;
}

/**
 * Reset the timeline to start from the beginning
 */
function resetTimeline() {
  stopVirtualPlayer();
  
  const newState = {
    ...defaultDisplayState,
    startTimestamp: Date.now(),
    lastUpdateTime: Date.now(),
  };
  
  cache.set(SYNC_STATE_KEY, newState);
  
  console.log('[VIRTUAL PLAYER] Timeline reset to beginning');
  
  // Restart the virtual player
  startVirtualPlayer();
  
  return newState;
}

/**
 * Skip to a specific media item
 * @param {number} index - Index to skip to
 */
function skipToMedia(index) {
  // Get media items to validate index
  const mediaItems = getSyncMediaItems();
  
  if (!mediaItems || mediaItems.length === 0) {
    return getSyncDisplayState();
  }
  
  // Stop the current timer
  stopVirtualPlayer();
  
  // Make sure index is valid
  const validIndex = Math.max(0, Math.min(index, mediaItems.length - 1));
  
  // Update state
  const newState = {
    ...getSyncDisplayState(),
    currentIndex: validIndex,
    startTimestamp: Date.now(),
    lastUpdateTime: Date.now()
  };
  
  cache.set(SYNC_STATE_KEY, newState);
  
  // Log the skip
  const currentItem = mediaItems[validIndex];
  console.log(`[VIRTUAL PLAYER] Skipped to: ${currentItem.title} (${currentItem.file_type})`);
  
  // Schedule the next item
  scheduleNextItem(validIndex);
  
  return newState;
}

/**
 * Clear the media cache to force a refresh
 */
function clearMediaCache() {
  cache.del(SYNC_MEDIA_KEY);
  console.log('[VIRTUAL PLAYER] Media cache cleared');
}

/**
 * Schedule the next item to play based on current item duration
 */
function scheduleNextItem(currentIndex) {
  // Clear any existing timer
  stopVirtualPlayer();
  
  const mediaItems = getSyncMediaItems();
  if (!mediaItems || mediaItems.length === 0 || currentIndex >= mediaItems.length) {
    return;
  }
  
  const currentItem = mediaItems[currentIndex];
  const duration = currentItem.duration ? 
    parseInt(currentItem.duration) : 
    (currentItem.file_type.startsWith('image') ? 10 : 30); // Default: 10s for images, 30s for videos
  
  console.log(`[VIRTUAL PLAYER] Playing "${currentItem.title}" for ${duration} seconds`);
  
  // Schedule the next advance
  virtualPlayerTimer = setTimeout(() => {
    console.log(`[VIRTUAL PLAYER] Item "${currentItem.title}" finished playing`);
    advanceMedia();
  }, duration * 1000);
}

/**
 * Stop the virtual player timer
 */
function stopVirtualPlayer() {
  if (virtualPlayerTimer) {
    clearTimeout(virtualPlayerTimer);
    virtualPlayerTimer = null;
  }
}

/**
 * Start the virtual player
 */
function startVirtualPlayer() {
  console.log('[VIRTUAL PLAYER] Starting virtual player');
  
  // Initialize state if needed
  const state = getSyncDisplayState();
  const mediaItems = getSyncMediaItems();
  
  if (!mediaItems || mediaItems.length === 0) {
    console.log('[VIRTUAL PLAYER] No media items available for playback');
    return;
  }
  
  // Log the current item
  const currentItem = mediaItems[state.currentIndex];
  console.log(`[VIRTUAL PLAYER] Starting with: ${currentItem.title} (${currentItem.file_type})`);
  
  // Schedule the next item
  scheduleNextItem(state.currentIndex);
}

/**
 * Check for changes in the media list
 */
function checkForMediaChanges() {
  try {
    // Check if cache exists first
    const cachedMedia = cache.get(SYNC_MEDIA_KEY);
    
    if (!cachedMedia) {
      // If no cache, get fresh media
      getSyncMediaItems();
      return;
    }
    
    // Count approved media in database
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM media 
      WHERE status = 'approved'
    `;
    
    const result = db.prepare(countQuery).get();
    const currentMediaCount = result.count;
    
    // If count has changed, refresh the media
    if (currentMediaCount !== lastMediaCount) {
      console.log(`[VIRTUAL PLAYER] Media count changed from ${lastMediaCount} to ${currentMediaCount}, refreshing...`);
      cache.del(SYNC_MEDIA_KEY);
      const freshMedia = getSyncMediaItems();
      lastMediaCount = currentMediaCount;
      
      // If playing an item beyond the new list, reset
      const state = getSyncDisplayState();
      if (state.currentIndex >= freshMedia.length) {
        resetTimeline();
      }
    }
  } catch (error) {
    console.error('Error checking for media changes:', error);
  }
}

/**
 * Start periodic refresh to check for media changes
 */
function startPeriodicRefresh() {
  // Check every 30 seconds for changes
  if (!periodicRefreshTimer) {
    console.log('[VIRTUAL PLAYER] Starting periodic refresh');
    periodicRefreshTimer = setInterval(checkForMediaChanges, 30000);
    
    // Initial check
    checkForMediaChanges();
  }
}

/**
 * Stop periodic refresh
 */
function stopPeriodicRefresh() {
  if (periodicRefreshTimer) {
    clearInterval(periodicRefreshTimer);
    periodicRefreshTimer = null;
  }
}

// Make sure we clean up on module exit
process.on('exit', () => {
  stopVirtualPlayer();
  stopPeriodicRefresh();
});

// Initialize on module load
initSyncDisplayState();
console.log('Display state service initialized');

module.exports = {
  getSyncDisplayState,
  getSyncMediaItems,
  updateMediaDuration,
  advanceMedia,
  resetTimeline,
  skipToMedia,
  clearMediaCache,
}; 