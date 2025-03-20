// backend/services/displayState.js

/**
 * Service to maintain the global display state for live mode
 */

// Initial state - this will be shared across all clients
const state = {
  currentIndex: 0,
  currentMediaId: null,
  lastChanged: Date.now(),
  changedBy: 'system', // Track who made the last change
  videoState: {
    isPlaying: true,
    currentTime: 0,
    duration: 0,
    lastUpdated: Date.now()
  }
};

/**
 * Get current display state
 */
const getState = () => {
  // Return a copy of the state to avoid direct mutation
  return { 
    currentIndex: state.currentIndex,
    currentMediaId: state.currentMediaId,
    lastChanged: state.lastChanged,
    changedBy: state.changedBy,
    videoState: {
      isPlaying: state.videoState.isPlaying,
      currentTime: state.videoState.currentTime,
      duration: state.videoState.duration,
      lastUpdated: state.videoState.lastUpdated
    }
  };
};

/**
 * Update state with new media item
 * @param {string|number} mediaId - ID of the media to display
 * @param {number} index - Index in the media array
 * @param {string} userId - ID of the user making the change
 */
const updateMedia = (mediaId, index, userId = 'unknown') => {
  state.currentIndex = index;
  state.currentMediaId = mediaId;
  state.lastChanged = Date.now();
  state.changedBy = userId;
  
  // Reset video state when changing media
  state.videoState = {
    isPlaying: true,
    currentTime: 0,
    duration: 0,
    lastUpdated: Date.now()
  };
  
  console.log(`Display state updated by ${userId} to index ${index}, media ${mediaId}`);
  
  return getState(); // Return a copy
};

/**
 * Update video playback state
 */
const updateVideoState = (isPlaying, currentTime, duration, userId = 'unknown') => {
  state.videoState = {
    isPlaying,
    currentTime,
    duration,
    lastUpdated: Date.now()
  };
  
  console.log(`Video state updated by ${userId}: playing=${isPlaying}, time=${currentTime}`);
  
  return getState(); // Return a copy
};

// Add an auto-advance function that can be triggered by a timer
const autoAdvance = (mediaItems) => {
  if (!mediaItems || mediaItems.length === 0) {
    console.log('Cannot auto-advance: no media items');
    return null;
  }
  
  // Calculate next index
  const nextIndex = (state.currentIndex + 1) % mediaItems.length;
  const nextMediaId = mediaItems[nextIndex].id;
  
  // Update state
  return updateMedia(nextMediaId, nextIndex, 'system-auto');
};

// Initialize with empty state
console.log('Display state service initialized');

module.exports = {
  getState,
  updateMedia,
  updateVideoState,
  autoAdvance
};