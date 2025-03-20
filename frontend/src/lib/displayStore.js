// lib/displayStore.js
import { writable, derived, get } from 'svelte/store';

// Create stores for display state
export const displayState = writable({
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
});

export const mediaItems = writable([]);
export const isPolling = writable(false);
export const pollingError = writable(null);
export const lastPollTime = writable(0);

export const syncMode = writable('polling'); // 'polling' or 'client-driven'

// Derived store to get the current media item
export const currentMedia = derived(
    [displayState, mediaItems],
    ([$displayState, $mediaItems]) => {
      if (!$mediaItems.length) {
        console.log('No media items available');
        return null;
      }
      
      if (!$displayState.currentMediaId) {
        console.log('No current media ID in display state, using first item');
        return $mediaItems[0];
      }
      
      // First try with exact match
      const mediaItem = $mediaItems.find(m => m.id === $displayState.currentMediaId);
      
      // If not found, try with parseInt (in case of string/number type mismatch)
      if (!mediaItem) {
        console.log(`Media ID ${$displayState.currentMediaId} not found directly, trying with parseInt`);
        const parsedId = typeof $displayState.currentMediaId === 'string' 
          ? parseInt($displayState.currentMediaId, 10) 
          : $displayState.currentMediaId;
        
        return $mediaItems.find(m => m.id === parsedId) || $mediaItems[0];
      }
      
      return mediaItem;
    }
  );

// Polling interval (ms)
const POLL_INTERVAL = 2000;
let pollTimer = null;
let lastStateVersion = null;

// Start polling for display state
export function startPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
    }

    isPolling.set(true);
    pollingError.set(null);

    // Initial poll
    pollDisplayState();

    // Set up interval polling
    pollTimer = setInterval(pollDisplayState, POLL_INTERVAL);

    return () => {
        // Cleanup function
        clearInterval(pollTimer);
        isPolling.set(false);
    };
}

// Stop polling
export function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    isPolling.set(false);
}

// Set sync mode
export function setSyncMode(mode) {
    if (mode === 'polling' || mode === 'client-driven') {
        syncMode.set(mode);
        console.log(`Display sync mode set to: ${mode}`);

        // If switching to polling, make sure polling is active
        if (mode === 'polling' && !get(isPolling)) {
            startPolling();
        }
    }
}

// Poll server for current display state
async function pollDisplayState() {
    try {
        console.log('Polling display state from server...');
        const response = await fetch('/api/media/display-state');
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            console.log('Received display state from server');
            lastPollTime.set(Date.now());

            // Always update media items to ensure we have the latest
            if (data.data.media && Array.isArray(data.data.media)) {
                console.log(`Received ${data.data.media.length} media items from server`);
                mediaItems.set(data.data.media);
            }

            // Update display state if provided
            if (data.data.state) {
                console.log('Updating display state:', data.data.state);
                displayState.set(data.data.state);
            }

            pollingError.set(null);
        } else {
            console.error('Server returned error:', data.message);
            pollingError.set(data.message || 'Error fetching display state');
        }
    } catch (error) {
        console.error('Error polling display state:', error);
        pollingError.set('Network error communicating with server');
    }
}

// Update display media (admin only)
export async function updateDisplayMedia(index, mediaId) {
    try {
        const response = await fetch('/api/media/display-state/media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ index, mediaId })
        });

        const data = await response.json();

        if (data.success) {
            // Update state immediately for responsive UI
            displayState.set(data.data.state);
            lastStateVersion = data.data.state.lastChanged;
            return true;
        } else {
            console.error('Failed to update display media:', data.message);
            return false;
        }
    } catch (error) {
        console.error('Error updating display media:', error);
        return false;
    }
}

// Update video state (admin only)
export async function updateVideoState(isPlaying, currentTime, duration) {
    try {
        // Check if we need to send an update (only on significant changes)
        const current = get(displayState).videoState;
        const timeDiff = Math.abs(currentTime - current.currentTime);
        const playStateChanged = isPlaying !== current.isPlaying;

        // Skip update if nothing significant changed 
        if (!playStateChanged && timeDiff < 2 && Date.now() - current.lastUpdated < 2000) {
            return true;
        }

        const response = await fetch('/api/media/display-state/video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ isPlaying, currentTime, duration })
        });

        const data = await response.json();

        if (data.success) {
            // Update state immediately for responsive UI
            displayState.update(state => ({
                ...state,
                videoState: data.data.state.videoState
            }));
            return true;
        } else {
            console.error('Failed to update video state:', data.message);
            return false;
        }
    } catch (error) {
        console.error('Error updating video state:', error);
        return false;
    }
}

// Go to next media (for admin control)
export async function nextMedia() {
    const $mediaItems = get(mediaItems);
    const $displayState = get(displayState);

    if (!$mediaItems.length) return false;

    const nextIndex = ($displayState.currentIndex + 1) % $mediaItems.length;
    const nextMediaId = $mediaItems[nextIndex].id;

    return updateDisplayMedia(nextIndex, nextMediaId);
}

// Go to previous media (for admin control)
export async function prevMedia() {
    const $mediaItems = get(mediaItems);
    const $displayState = get(displayState);

    if (!$mediaItems.length) return false;

    const prevIndex = ($displayState.currentIndex - 1 + $mediaItems.length) % $mediaItems.length;
    const prevMediaId = $mediaItems[prevIndex].id;

    return updateDisplayMedia(prevIndex, prevMediaId);
}