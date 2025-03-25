<!-- src/routes/display/live/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { mediaItems, displayState } from '$lib/displayStore';
  import DisplayModeIndicator from '../../../components/DisplayModeIndicator.svelte';
  import MediaInfo from '../../../components/MediaInfo.svelte';
  import { fade } from 'svelte/transition';
  import { toTitleCase, capitalizeSentences, capitalizeNames } from '$lib/textFormat';
  
  export let data;
  
  let currentIndex = 0;
  let mediaElement;
  let isPlaying = true;
  let imageTimer = null;
  let initialSync = true;
  let error = null;
  let showIndicator = true;
  let indicatorTimeout;
  
  onMount(async () => {
    console.log("LiveDisplay mounted");
    hideIndicatorAfterDelay();
    
    // Initial poll to sync with server
    try {
      const response = await fetch('/api/media/display-state');
      const data = await response.json();
      
      if (data.success) {
        // Set media items
        if (data.data.media && Array.isArray(data.data.media)) {
          mediaItems.set(data.data.media);
          console.log(`Loaded ${data.data.media.length} media items`);
        }
        
        // Set initial state
        if (data.data.state) {
          displayState.set(data.data.state);
          currentIndex = data.data.state.currentIndex || 0;
          console.log(`Synced with server at index ${currentIndex}`);
        }
        
        setTimeout(() => {
          initialSync = false;
        }, 500); // Small delay to ensure video loads properly
      }
    } catch (err) {
      console.error("Error syncing with server:", err);
      error = `Failed to sync: ${err.message}`;
      initialSync = false;
    }
    
    return () => {
      clearImageTimer();
      if (indicatorTimeout) {
        clearTimeout(indicatorTimeout);
      }
    };
  });
  
  function clearImageTimer() {
    if (imageTimer) {
      clearTimeout(imageTimer);
      imageTimer = null;
    }
  }
  
  // Handle video ended event
  function handleVideoEnded() {
    console.log('Video playback ended, advancing to next item');
    goToNext();
  }
  
  // Handle media load errors
  function handleMediaError(e) {
    console.error('Media loading error:', e);
    error = `Error loading media: ${currentItem?.file_url}`;
    
    // Try to advance to the next item after a short delay
    setTimeout(() => goToNext(), 3000);
  }
  
  function goToNext() {
    clearImageTimer();
    currentIndex = (currentIndex + 1) % $mediaItems.length;
    
    // For images, set a timer based on the duration
    if (isImage) {
      const duration = currentItem.duration ? parseInt(currentItem.duration) * 1000 : 10000;
      console.log(`Showing image: ${currentItem.title} for ${duration / 1000} seconds`);
      imageTimer = setTimeout(() => goToNext(), duration);
    }
  }
  
  function hideIndicatorAfterDelay() {
    if (indicatorTimeout) {
      clearTimeout(indicatorTimeout);
    }
    
    showIndicator = true;
    
    indicatorTimeout = setTimeout(() => {
      showIndicator = false;
    }, 5000);
  }
  
  // Get current media item
  $: currentItem = $mediaItems[currentIndex] || null;
  
  $: isVideo = currentItem && 
    (currentItem.file_type === 'video' || currentItem.file_type.startsWith('video/'));
    
  $: isImage = currentItem && 
    (currentItem.file_type === 'image' || currentItem.file_type.startsWith('image/'));
  
  // Force URL to have proper leading slash
  $: mediaUrl = currentItem?.file_url?.startsWith('/') 
    ? currentItem.file_url 
    : `/${currentItem?.file_url}`;
    
  // Set up timer for images when currentItem changes
  $: if (!initialSync && currentItem && isImage) {
    clearImageTimer();
    const duration = currentItem.duration ? parseInt(currentItem.duration) * 1000 : 10000;
    console.log(`Setting timer for image: ${currentItem.title} - ${duration/1000}s`);
    imageTimer = setTimeout(() => goToNext(), duration);
  }
  
  // Check if QR code exists for the current item
  $: hasQRCode = currentItem && currentItem.qr_code && currentItem.qr_code.trim() !== '';
  
  // For debugging QR code
  $: if (currentItem) {
    console.log('Current item QR code:', currentItem.qr_code);
    if (currentItem.metadata) {
      console.log('Item metadata:', currentItem.metadata);
    }
  }
</script>

<svelte:head>
  <title>Digital Signage - Live Mode</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: black;
    }
  </style>
</svelte:head>

<div class="display-container">
  {#if showIndicator}
    <div
      class="mode-indicator"
      on:click={() => (showIndicator = true)}
      on:mouseenter={() => (showIndicator = true)}
    >
      <div class="mode-label">
        <span>LIVE VIEW</span>
      </div>
      <a href="/display" class="mode-toggle">Switch to Individual Mode</a>
    </div>
  {/if}
  
  <DisplayModeIndicator mode="live" />
  
  {#if initialSync}
    <div class="loading">
      <p>Syncing with display system...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>{error}</p>
    </div>
  {:else if !currentItem}
    <div class="no-media">
      <p>No media content available</p>
    </div>
  {:else}
    <div class="media-container">
      {#if isVideo}
        <video
          src={mediaUrl}
          bind:this={mediaElement}
          autoplay
          muted={false}
          playsinline
          on:ended={handleVideoEnded}
          on:error={handleMediaError}
          class="media-element video-element"
        ></video>
      {:else if isImage}
        <img
          src={mediaUrl}
          alt={currentItem.title}
          on:error={handleMediaError}
          class="media-element image-element"
        />
      {:else}
        <div class="unknown-type">
          <p>Unsupported media type: {currentItem.file_type || 'unknown'}</p>
          <p class="debug-info">Item data: {JSON.stringify(currentItem)}</p>
        </div>
      {/if}

      <!-- Show media info if available -->
      {#if !currentItem.metadata?.hide_info}
        <MediaInfo {currentItem} {hasQRCode} />
      {/if}
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
  .no-media {
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

  .debug-info {
    font-size: 0.9rem;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 1rem;
    margin-top: 1rem;
    max-width: 80%;
    overflow: auto;
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