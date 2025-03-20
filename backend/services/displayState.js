// services/displayState.js
/**
 * A more reliable helper function to check if a video is at/near its end
 * @param {number} currentTime - Current playback position
 * @param {number} duration - Total video duration
 * @param {number} threshold - Threshold in seconds to consider "at the end" (default: 0.5)
 * @return {boolean} True if the video is at/near its end
 */

// Initial state - this will be shared across all clients
const state = {
  currentIndex: 0,
  currentMediaId: null,
  lastChanged: Date.now(),
  changedBy: 'system',
  videoState: {
    isPlaying: true,
    currentTime: 0,
    duration: 0,
    lastUpdated: Date.now()
  }
};

// Auto-advance timer
let autoAdvanceTimer = null;
let cachedMediaItems = [];

/**
 * Get current display state
 */
const getState = () => {
  // Return a copy of the state to avoid direct mutation
  return { ...state };
};

/**
 * Cache the current media items for auto-advancement
 */
const cacheMediaItems = (mediaItems) => {
  if (Array.isArray(mediaItems) && mediaItems.length > 0) {
    // Map any string IDs to numbers for consistency
    cachedMediaItems = mediaItems.map(item => ({
      ...item,
      id: typeof item.id === 'string' ? parseInt(item.id, 10) : item.id
    }));
    
    console.log(`Cached ${cachedMediaItems.length} media items for auto-advancement`);
    console.log('Media IDs:', cachedMediaItems.map(item => item.id).join(', '));
    
    // If we have a current media ID but no timer, restart auto-advancement
    if (state.currentMediaId && !autoAdvanceTimer) {
      const currentItem = cachedMediaItems.find(item => 
        item.id === state.currentMediaId || 
        item.id === parseInt(state.currentMediaId, 10)
      );
      
      if (currentItem) {
        console.log(`Restarting auto-advance for current media: ${currentItem.id}`);
        setupAutoAdvance(currentItem);
      } else {
        console.log(`Current media ID ${state.currentMediaId} not found in cached items`);
      }
    }
  }
};

/**
 * Update state with new media item
 */
const updateMedia = (mediaId, index, userId = 'unknown') => {
  // Clear any existing auto-advance timer
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
    console.log('Cleared existing auto-advance timer during updateMedia');
  }
  
  // Update state
  state.currentIndex = index;
  state.currentMediaId = mediaId;
  state.lastChanged = Date.now();
  state.changedBy = userId;
  
  // Reset video state
  state.videoState = {
    isPlaying: true,
    currentTime: 0,
    duration: 0,
    lastUpdated: Date.now()
  };
  
  console.log(`Display state updated by ${userId} to index ${index}, media ${mediaId}`);
  
  // Try to setup auto-advance for the new media
  if (cachedMediaItems.length > 0) {
    const mediaItem = cachedMediaItems.find(item => item.id === parseInt(mediaId) || item.id === mediaId);
    if (mediaItem) {
      // Add slight delay before setting up auto-advance to avoid race conditions
      setTimeout(() => {
        setupAutoAdvance(mediaItem);
      }, 100);
    } else {
      console.log(`Warning: Selected media ID ${mediaId} not found in cached items. Available IDs:`, 
                  cachedMediaItems.map(item => item.id));
    }
  } else {
    console.log('No cached media items available for auto-advancement');
  }
  
  return getState();
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
  
  console.log(`Video state updated by ${userId}: playing=${isPlaying}, time=${currentTime.toFixed(2)} / ${duration.toFixed(2)}`);
  
  // Check if video has ended and should auto-advance
  if (isPlaying && isVideoAtEnd(currentTime, duration)) {
    console.log(`Video end detected (${currentTime.toFixed(2)}/${duration.toFixed(2)}), triggering auto-advance`);
    // Schedule auto-advance with a short delay to allow any final frames to play
    setTimeout(() => triggerAutoAdvance(), 500);
  }
  
  return getState();
};

/**
 * Set up auto-advance timer based on media type
 */
const setupAutoAdvance = (mediaItem) => {
  // Clear any existing timer
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
    console.log('Cleared existing auto-advance timer');
  }
  
  if (!mediaItem) {
    console.log('Cannot setup auto-advance: no media item provided');
    return false;
  }
  
  console.log(`Setting up auto-advance for media ${mediaItem.id}, type ${mediaItem.file_type}`);
  
  // For images, use the duration for auto-advancement
  if (mediaItem.file_type === 'image' || mediaItem.file_type.startsWith('image/')) {
    // Get duration in milliseconds (default to 10 seconds if not specified)
    const durationMs = mediaItem.duration ? parseInt(mediaItem.duration) * 1000 : 10000;
    
    console.log(`Setting auto-advance timer for image: ${durationMs}ms`);
    
    autoAdvanceTimer = setTimeout(() => {
      console.log(`Auto-advance timer fired for image ${mediaItem.id} after ${durationMs}ms`);
      triggerAutoAdvance();
    }, durationMs);
    
    return true;
  } 
  // For videos, use the duration if available, otherwise wait for client feedback
  else if (mediaItem.file_type === 'video' || mediaItem.file_type.startsWith('video/')) {
    console.log(`Video media detected: ${mediaItem.id}`);
    
    // If we have a duration, set a timer
    if (mediaItem.duration) {
      const durationMs = parseInt(mediaItem.duration) * 1000;
      console.log(`Setting auto-advance timer for video with known duration: ${durationMs}ms`);
      
      autoAdvanceTimer = setTimeout(() => {
        console.log(`Auto-advance timer fired for video ${mediaItem.id} after ${durationMs}ms`);
        triggerAutoAdvance();
      }, durationMs);
      
      return true;
    } else {
      console.log(`Video has no duration, waiting for end detection...`);
      // Set a fallback timer for 10 minutes in case the video never ends or client doesn't report
      const fallbackMs = 10 * 60 * 1000; // 10 minutes
      
      autoAdvanceTimer = setTimeout(() => {
        console.log(`Fallback auto-advance for video ${mediaItem.id} after ${fallbackMs}ms`);
        triggerAutoAdvance();
      }, fallbackMs);
      
      return true;
    }
  }
  
  console.log(`Unknown media type: ${mediaItem.file_type}`);
  return false;
};

/**
 * Trigger auto-advance to next media item
 */
const triggerAutoAdvance = () => {
  console.log('triggerAutoAdvance called, media items:', cachedMediaItems.length);
  
  if (cachedMediaItems.length <= 1) {
    console.log('Cannot auto-advance: not enough media items');
    return null;
  }
  
  // Calculate next index
  const nextIndex = (state.currentIndex + 1) % cachedMediaItems.length;
  const nextMediaId = cachedMediaItems[nextIndex].id;
  
  console.log(`Auto-advancing from index ${state.currentIndex} to ${nextIndex} (media ID: ${nextMediaId})`);
  
  // Update state to next media
  return updateMedia(nextMediaId, nextIndex, 'system-auto');
};

/**
 * Check if video should auto-advance based on current time
 */
const checkVideoAutoAdvance = () => {
  // If we're not showing a video, do nothing
  if (!state.currentMediaId || !cachedMediaItems.length) return;
  
  const currentItem = cachedMediaItems.find(item => item.id === state.currentMediaId);
  if (!currentItem || !currentItem.file_type.startsWith('video/')) return;
  
  const { isPlaying, currentTime, duration } = state.videoState;
  
  // If video is playing and at the end, trigger auto-advance
  if (isPlaying && duration > 0 && Math.abs(currentTime - duration) < 0.5) {
    console.log(`Video ended check: current=${currentTime.toFixed(2)}, duration=${duration.toFixed(2)}`);
    triggerAutoAdvance();
  }
};

// Initialize
console.log('Display state service initialized');

const isVideoAtEnd = (currentTime, duration, threshold = 0.5) => {
  // Validate inputs to avoid false positives
  if (!duration || duration <= 0 || !currentTime) return false;
  
  // Check if we're within threshold seconds of the end
  const remainingTime = Math.max(0, duration - currentTime);
  return remainingTime <= threshold || currentTime >= duration;
};

const getTimerStatus = () => {
  return {
    timerActive: !!autoAdvanceTimer,
    currentState: {...state},
    mediaItemsCount: cachedMediaItems.length,
    currentMediaItem: cachedMediaItems.find(item => item.id === state.currentMediaId)
  };
};

module.exports = {
  getState,
  updateMedia,
  updateVideoState,
  cacheMediaItems,
  triggerAutoAdvance,
  checkVideoAutoAdvance,
  cacheMediaItems,
  isVideoAtEnd,
  setupAutoAdvance,
  getTimerStatus
};