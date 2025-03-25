<!-- src/routes/display/sync/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import DisplayModeIndicator from '../../../components/DisplayModeIndicator.svelte';
  import MediaInfo from '../../../components/MediaInfo.svelte';
  import { toTitleCase, capitalizeSentences, capitalizeNames } from '$lib/textFormat';
  
  // Accept data from server-side load function
  export let data;
  
  let mediaItems = data.initialMedia || [];
  let currentIndex = data.initialState?.currentIndex || 0;
  let loading = true;
  let error = data.error || null;
  let mediaElement;
  let showIndicator = true;
  let indicatorTimeout;
  
  // Timing information
  let startTimestamp = data.initialState?.startTimestamp || Date.now();
  let elapsedTimeOnLoad = data.timeInfo?.elapsedTime || 0;
  
  // Handle video metadata loaded
  function handleMetadataLoaded() {
    if (isVideo && mediaElement) {
      // For videos, seek to the correct position based on elapsed time
      if (elapsedTimeOnLoad > 0) {
        try {
          mediaElement.currentTime = elapsedTimeOnLoad;
          console.log(`Set initial video position to ${elapsedTimeOnLoad} seconds`);
        } catch (err) {
          console.error('Error setting video time:', err);
        }
      }
      
      // If duration in DB doesn't match actual duration, update it
      if (mediaElement.duration && currentItem) {
        const videoDuration = mediaElement.duration;
        if (!currentItem.duration || Math.abs(currentItem.duration - videoDuration) > 1) {
          console.log(`Updating duration for ${currentItem.title} from ${currentItem.duration || 'none'} to ${videoDuration}`);
          reportVideoDuration(currentItem.id, videoDuration);
        }
      }
    }
  }
  
  // When a video ends, move to the next item in the playlist
  function handleVideoEnded() {
    console.log('Video ended, moving to next item');
    moveToNextItem();
  }
  
  // Handle video errors
  function handleMediaError(e) {
    console.error('Media loading error:', e);
    const errorUrl = currentItem?.file_url || 'unknown';
    error = `Error loading media: ${errorUrl}`;
    
    // Log more details about the error
    console.error(`Failed to load media: ${errorUrl}`);
    console.error('Current item:', currentItem);
    
    // Clear error after a few seconds
    setTimeout(() => {
      error = null;
    }, 3000);
    
    // Move to next item after a short delay
    setTimeout(() => {
      moveToNextItem();
    }, 1000);
  }
  
  // Move to the next media item in the playlist
  function moveToNextItem() {
    currentIndex = (currentIndex + 1) % mediaItems.length;
    startTimestamp = Date.now();
    elapsedTimeOnLoad = 0;
  }
  
  // Report video duration to server
  async function reportVideoDuration(mediaId, duration) {
    if (!mediaId || !duration) return;
    
    try {
      const response = await fetch('/api/media/update-duration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mediaId,
          duration
        })
      });
      
      if (response.ok) {
        console.log(`Updated duration for media ${mediaId}: ${duration} seconds`);
        
        // Update local copy
        if (currentItem && currentItem.id === mediaId) {
          currentItem.duration = duration;
        }
      }
    } catch (error) {
      console.error('Error updating video duration:', error);
    }
  }
  
  // For images, set up a timer to advance to the next item
  let imageTimer;
  
  function setupImageTimer() {
    clearTimeout(imageTimer);
    
    if (isImage && currentItem) {
      const duration = currentItem.duration ? parseInt(currentItem.duration) : 10;
      const remainingTime = Math.max(0, (duration - elapsedTimeOnLoad) * 1000);
      
      console.log(`Setting up image timer for ${remainingTime}ms`);
      
      imageTimer = setTimeout(() => {
        console.log('Image duration ended, moving to next item');
        moveToNextItem();
      }, remainingTime);
    }
  }
  
  function getSafeMediaUrl(url) {
    if (!url) return '';
    
    // If it's already a proper URL (http/https) or starts with /, use it as is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
      return url;
    }
    
    // If it contains backslashes (Windows path), extract just the filename
    if (url.includes('\\')) {
      const parts = url.split('\\');
      return `/uploads/${parts[parts.length - 1]}`;
    }
    
    // Otherwise, add leading slash if needed
    return url.startsWith('/') ? url : `/uploads/${url}`;
  }
  
  function hideIndicatorAfterDelay() {
    if (indicatorTimeout) {
      clearTimeout(indicatorTimeout);
    }
    
    showIndicator = true;
    
    indicatorTimeout = setTimeout(() => {
      showIndicator = false;
    }, 7000);
  }
  
  // Set up component
  onMount(() => {
    console.log('Sync display component mounted');
    loading = false;
    hideIndicatorAfterDelay();
    
    // Set up user interaction to enable audio
    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
    
    if (isImage) {
      setupImageTimer();
    }
    
    // Set up periodic refresh to check for new content
    const refreshInterval = setInterval(async () => {
      try {
        // Only refresh if we're not in the middle of a transition
        if (!loading) {
          console.log('Checking for new content and updates...');
          const response = await fetch('/api/media/sync-state');
          const result = await response.json();
          
          if (result.success && result.data) {
            // Check if the media list has changed
            const currentIds = mediaItems.map(item => item.id);
            const newIds = result.data.media.map(item => item.id);
            const idsChanged = JSON.stringify(currentIds) !== JSON.stringify(newIds);
            
            // Check if the current item's user data has changed even if IDs are the same
            let userDataChanged = false;
            if (!idsChanged && currentIndex < mediaItems.length) {
              const currentItem = mediaItems[currentIndex];
              const newItem = result.data.media.find(item => item.id === currentItem.id);
              
              if (newItem) {
                // Check if profile image or user details changed
                userDataChanged = (
                  currentItem.profile_image !== newItem.profile_image ||
                  currentItem.uploaded_by !== newItem.uploaded_by ||
                  currentItem.full_name !== newItem.full_name
                );
                
                if (userDataChanged) {
                  console.log('User profile data has changed, updating current item...');
                  // Just update the current item with new user data
                  mediaItems[currentIndex] = {
                    ...currentItem,
                    profile_image: newItem.profile_image,
                    uploaded_by: newItem.uploaded_by,
                    first_name: newItem.first_name,
                    last_name: newItem.last_name,
                    preferred_name: newItem.preferred_name,
                    full_name: newItem.full_name
                  };
                  // Force a refresh
                  mediaItems = [...mediaItems];
                }
              }
            }
            
            // If the entire list changed (not just user data), do a full update
            if (idsChanged) {
              console.log('Media list has changed, updating...');
              
              // Save current position
              const currentId = mediaItems[currentIndex]?.id;
              
              // Update the list
              mediaItems = result.data.media;
              
              // Try to find the same item in the new list
              if (currentId) {
                const newIndex = mediaItems.findIndex(item => item.id === currentId);
                if (newIndex !== -1) {
                  currentIndex = newIndex;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error refreshing content:', error);
      }
    }, 30000); // Check every 30 seconds (reduced from 60s)
    
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    };
  });
  
  onDestroy(() => {
    if (imageTimer) clearTimeout(imageTimer);
    if (indicatorTimeout) clearTimeout(indicatorTimeout);
  });
  
  // Reset image timer when currentItem changes
  $: if (currentItem && isImage) {
    setupImageTimer();
  }
  
  // Enable audio after user interaction (needed for autoplay policies)
  function enableAudio() {
    if (mediaElement && isVideo && mediaElement.muted) {
      console.log('User interaction detected, enabling audio');
      mediaElement.muted = false;
      // Remove event listeners after first interaction
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    }
  }
  
  // Current media item
  $: currentItem = mediaItems[currentIndex] || null;
  
  $: isVideo = currentItem && 
    (currentItem.file_type === 'video' || currentItem.file_type?.startsWith('video/'));
    
  $: isImage = currentItem && 
    (currentItem.file_type === 'image' || currentItem.file_type?.startsWith('image/'));
  
  $: mediaUrl = currentItem?.file_url ? getSafeMediaUrl(currentItem.file_url) : '';
  
  // Check if QR code exists for the current item
  $: hasQRCode = currentItem && currentItem.qr_code && currentItem.qr_code.trim() !== '';
</script>

<svelte:head>
  <title>Digital Signage - Synchronized Display</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: black;
      color: white;
    }
    
    html, body {
      height: 100%;
      width: 100%;
    }
  </style>
</svelte:head>

<div class="display-container">
  <DisplayModeIndicator mode="sync" />
  
  {#if showIndicator}
    <div class="mode-indicator">
      <div class="mode-label">
        <span>SYNC VIEW</span>
      </div>
      <a href="/display" class="mode-toggle">Switch to Individual Mode</a>
    </div>
  {/if}
  
  {#if loading}
    <div class="loading">
      <p>Loading display...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>{error}</p>
    </div>
  {:else if mediaItems.length === 0}
    <div class="empty">
      <p>No media available for display.</p>
    </div>
  {:else if currentItem}
    <div class="media-container">
      {#if isVideo}
        <video
          src={mediaUrl}
          bind:this={mediaElement}
          autoplay
          muted
          playsinline
          on:error={handleMediaError}
          on:loadedmetadata={handleMetadataLoaded}
          on:ended={handleVideoEnded}
          class="media-element video-element"
        ></video>
      {:else if isImage}
        <img
          src={mediaUrl}
          alt={currentItem.title}
          on:error={handleMediaError}
          class="media-element image-element"
          in:fade={{ duration: 300 }}
        />
      {:else}
        <div class="unknown-type">
          <p>Media type not recognized: {currentItem.file_type || 'unknown'}</p>
        </div>
      {/if}
      
      <MediaInfo {currentItem} {hasQRCode} />
    </div>
  {/if}
</div>

<style>
  .display-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #000;
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    z-index: 1000;
  }
  
  .loading,
  .error,
  .empty {
    text-align: center;
    font-size: 2rem;
  }
  
  .media-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: #000;
  }
  
  .media-element {
    max-width: 100%;
    max-height: 100vh;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .video-element {
    width: 100vw;
    height: 100vh;
    object-fit: contain;
    background-color: #000;
  }
  
  .image-element {
    max-width: 100vw;
    max-height: 100vh;
    object-fit: contain;
  }
  
  .unknown-type {
    padding: 2rem;
    background-color: rgba(255, 0, 0, 0.3);
    border-radius: 8px;
  }
  
  /* Mode indicator styles */
  .mode-indicator {
    position: fixed;
    top: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    z-index: 1010;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    backdrop-filter: blur(5px);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    transition: opacity 0.3s ease;
  }
  
  .mode-label {
    display: flex;
    align-items: center;
    font-weight: 600;
    gap: 8px;
  }
  
  .mode-toggle {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    font-size: 12px;
    text-align: center;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .mode-toggle:hover {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
  }
</style> 