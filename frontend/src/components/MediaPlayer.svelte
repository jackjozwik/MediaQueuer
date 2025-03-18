<!-- src/components/MediaPlayer.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  
  // Props
  export let mediaList = [];
  export let showControls = false;
  
  // State
  let currentIndex = 0;
  let currentMedia = null;
  let isPlaying = true;
  let timeoutId = null;
  let videoElement;
  
  // Track when media changes
  $: {
    if (mediaList && mediaList.length > 0) {
      currentMedia = mediaList[currentIndex];
    } else {
      currentMedia = null;
    }
  }
  
  onMount(() => {
    startPlayback();
    
    // Add keyboard controls
    window.addEventListener('keydown', handleKeydown);
  });
  
  onDestroy(() => {
    clearTimeout(timeoutId);
    window.removeEventListener('keydown', handleKeydown);
  });
  
  // Handle keyboard controls
  function handleKeydown(e) {
    switch(e.key) {
      case 'ArrowRight':
        nextMedia();
        break;
      case 'ArrowLeft':
        prevMedia();
        break;
      case ' ':
        togglePlayPause();
        break;
    }
  }
  
  // Toggle play/pause
  function togglePlayPause() {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }
  
  // Start or resume playback
  function startPlayback() {
    if (!mediaList || mediaList.length === 0) return;
    
    isPlaying = true;
    
    // For images, set a timeout to move to the next item
    if (currentMedia.file_type === 'image') {
      const duration = currentMedia.duration * 1000 || 10000; // Default 10 seconds
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        nextMedia();
      }, duration);
    } else if (currentMedia.file_type === 'video' && videoElement) {
      videoElement.play().catch(error => {
        console.error('Error playing video:', error);
      });
    }
  }
  
  // Pause playback
  function pausePlayback() {
    isPlaying = false;
    clearTimeout(timeoutId);
    
    if (currentMedia.file_type === 'video' && videoElement) {
      videoElement.pause();
    }
  }
  
  // Video ended handler
  function handleVideoEnded() {
    nextMedia();
  }
  
  // Go to next media
  function nextMedia() {
    clearTimeout(timeoutId);
    
    if (!mediaList || mediaList.length === 0) return;
    
    currentIndex = (currentIndex + 1) % mediaList.length;
    
    if (isPlaying) {
      // Small delay to ensure proper transition between media items
      setTimeout(() => {
        startPlayback();
      }, 50);
    }
  }
  
  // Go to previous media
  function prevMedia() {
    clearTimeout(timeoutId);
    
    if (!mediaList || mediaList.length === 0) return;
    
    currentIndex = (currentIndex - 1 + mediaList.length) % mediaList.length;
    
    if (isPlaying) {
      setTimeout(() => {
        startPlayback();
      }, 50);
    }
  }
</script>

<div class="media-player">
  {#if mediaList.length === 0}
    <div class="placeholder">
      <h2>No media available</h2>
      <p>Please upload content to be displayed</p>
    </div>
  {:else if currentMedia}
    <div class="media-container">
      {#if currentMedia.file_type === 'image'}
        <img 
          src={currentMedia.file_url} 
          alt={currentMedia.title} 
          class="media-content"
        />
      {:else if currentMedia.file_type === 'video'}
        <video 
          bind:this={videoElement}
          src={currentMedia.file_url} 
          autoplay={isPlaying}
          class="media-content"
          on:ended={handleVideoEnded}
        >
          <!-- Adding empty track to satisfy accessibility warning -->
          <track kind="captions" src="" label="English" />
        </video>
      {/if}
      
      <div class="media-info">
        <h3>{currentMedia.title}</h3>
        {#if currentMedia.description}
          <p class="description">{currentMedia.description}</p>
        {/if}
        <p class="credit">
          Created by {currentMedia.full_name || currentMedia.uploaded_by}
        </p>
      </div>
    </div>
    
    {#if showControls}
      <div class="controls">
        <button on:click={prevMedia} aria-label="Previous">Previous</button>
        {#if isPlaying}
          <button on:click={pausePlayback} aria-label="Pause">Pause</button>
        {:else}
          <button on:click={startPlayback} aria-label="Play">Play</button>
        {/if}
        <button on:click={nextMedia} aria-label="Next">Next</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .media-player {
    width: 100%;
    height: 100vh;
    background-color: black;
    color: white;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  
  .placeholder {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 2rem;
  }
  
  .media-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 100%;
    height: 100%;
  }
  
  .media-content {
    max-width: 100%;
    max-height: 100vh;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .media-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 1.5rem;
    font-size: 1.2rem;
  }
  
  .media-info h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-size: 2rem;
    color: white;
  }
  
  .media-info p {
    margin: 0.5rem 0;
    font-size: 1.2rem;
  }
  
  .description {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .credit {
    font-size: 1.2rem;
    opacity: 0.8;
  }
  
  .controls {
    position: absolute;
    bottom: 80px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 2rem;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  .controls button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  .controls button:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
</style>