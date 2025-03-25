<!-- src/routes/display/+page.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { user } from '$lib/auth';
	import DisplayModeIndicator from '../../components/DisplayModeIndicator.svelte';
	import MediaInfo from '../../components/MediaInfo.svelte';
	import Debug from './Debug.svelte';
	import { toTitleCase, capitalizeSentences, capitalizeNames } from '$lib/textFormat';

	// Accept data from server-side load function
	export let data;

	let mediaItems = data.initialMedia || [];
	let currentIndex = 0;
	let loading = mediaItems.length === 0;
	let error = data.error || null;
	let refreshInterval;
	let mediaElement;
	let isPlaying = true;
	let apiResponse = null; // For debugging

	// Determine if user is an admin
	let showIndicator = true;
	let indicatorTimeout;

	// Admin check
	$: isAdmin = $user && $user.role === 'admin';

	// Fetch approved media items
	async function fetchMedia() {
		try {
			console.log('Fetching media from API...');
			const response = await fetch('/api/media/approved');
			const result = await response.json();

			// Store the API response for debugging
			apiResponse = result;
			console.log('API Response:', result);

			if (result.success && result.data && result.data.media) {
				mediaItems = result.data.media;
				console.log(`Loaded ${mediaItems.length} media items`);
				loading = false;

				// Start playback if we have items
				if (mediaItems.length > 0) {
					showMedia(0);
				} else {
					error = 'No media items available';
				}
			} else {
				error = 'No media available or API returned invalid data';
				loading = false;
			}
		} catch (err) {
			console.error('Error fetching media:', err);
			error = `Failed to load media: ${err.message}`;
			loading = false;
		}
	}

	// Display current media item
	function showMedia(index) {
		currentIndex = index;
		isPlaying = true;

		// Reset any existing timers
		if (refreshInterval) {
			clearTimeout(refreshInterval);
		}

		const item = mediaItems[currentIndex];
		console.log('Now showing media item:', item);

		// If it's a video, we'll let the video's end event handle advancing
		if (item.file_type === 'video' || item.file_type.startsWith('video/')) {
			console.log(`Playing video: ${item.title}`);
			// For videos, we don't set a timer - we rely on the video's onended event
		} else {
			// For images, set a timer based on the duration
			const duration = item.duration ? parseInt(item.duration) * 1000 : 10000;
			console.log(`Showing image: ${item.title} for ${duration / 1000} seconds`);
			refreshInterval = setTimeout(() => advanceMedia(), duration);
		}
	}

	// Advance to next media item
	function advanceMedia() {
		if (mediaItems.length === 0) return;

		const nextIndex = (currentIndex + 1) % mediaItems.length;
		console.log(`Advancing to next item: ${nextIndex} of ${mediaItems.length}`);
		showMedia(nextIndex);
	}

	// Handle video ended event
	function handleVideoEnded() {
		console.log('Video playback ended, advancing to next item');
		// Only advance if this item is still the current one
		if (mediaElement && mediaElement.src.includes(currentItem.file_url)) {
			advanceMedia();
		}
	}

	// Handle media load errors
	function handleMediaError(e) {
		console.error('Media loading error:', e);
		error = `Error loading media: ${currentItem?.file_url}`;

		// Try to advance to the next item after a short delay
		setTimeout(() => advanceMedia(), 3000);
	}

	// Set up component
	onMount(() => {
		console.log('Display component mounted');
		fetchMedia();
		hideIndicatorAfterDelay();

		// Refresh the media list every 5 minutes
		const mediaRefreshInterval = setInterval(
			() => {
				console.log('Refreshing media list from server');
				fetchMedia();
			},
			5 * 60 * 1000
		);

		return () => {
			clearInterval(mediaRefreshInterval);
			if (refreshInterval) clearTimeout(refreshInterval);
			if (indicatorTimeout) {
				clearTimeout(indicatorTimeout);
			}
		};
	});

	onDestroy(() => {
		if (refreshInterval) clearTimeout(refreshInterval);
	});

	// Get current media item
	$: currentItem = mediaItems[currentIndex] || null;
	$: isVideo =
		currentItem &&
		(currentItem.file_type === 'video' || currentItem.file_type.startsWith('video/'));
	$: isImage =
		currentItem &&
		(currentItem.file_type === 'image' || currentItem.file_type.startsWith('image/'));

	// Force URL to have proper leading slash
	$: mediaUrl = currentItem?.file_url?.startsWith('/')
		? currentItem.file_url
		: `/${currentItem?.file_url}`;

	// Log the metadata to debug
	function logMetadata(item) {
		if (item && item.metadata) {
			console.log('Item metadata:', item.metadata);
			console.log('Hide info:', item.metadata.hide_info);
			console.log('Hide title:', item.metadata.hide_title);
			console.log('Hide description:', item.metadata.hide_description);
			console.log('Hide creator:', item.metadata.hide_creator);
		} else {
			console.log('No metadata for item:', item);
		}
	}

	// Add a debug flag
	let showDebug = false;

	// Check if QR code exists for the current item
	$: hasQRCode = currentItem && currentItem.qr_code && currentItem.qr_code.trim() !== '';

	// For debugging QR code
	$: if (currentItem) {
		console.log('Current item QR code:', currentItem.qr_code);
	}

	// Toggle debug view with Ctrl+Alt+D
	function handleKeydown(event) {
		if (event.ctrlKey && event.altKey && event.key === 'd') {
			showDebug = !showDebug;
		}
	}

	onMount(() => {
		// Add keydown listener for debug toggle
		window.addEventListener('keydown', handleKeydown);

		// ...existing onMount code...

		return () => {
			window.removeEventListener('keydown', handleKeydown);
			// ...existing cleanup code...
		};
	});

	function hideIndicatorAfterDelay() {
		if (indicatorTimeout) {
			clearTimeout(indicatorTimeout);
		}

		showIndicator = true;

		indicatorTimeout = setTimeout(() => {
			showIndicator = false;
		}, 5000);
	}

	// Add playback control functions
	function togglePlayPause() {
		isPlaying = !isPlaying;
		
		if (isPlaying) {
			// Resume playback
			if (isVideo && mediaElement) {
				mediaElement.play();
			} else {
				// For images, start a new timer
				const duration = currentItem?.duration ? parseInt(currentItem.duration) * 1000 : 10000;
				refreshInterval = setTimeout(() => advanceMedia(), duration);
			}
		} else {
			// Pause playback
			if (isVideo && mediaElement) {
				mediaElement.pause();
			}
			// Clear any existing timers
			if (refreshInterval) {
				clearTimeout(refreshInterval);
			}
		}
	}
	
	function goToPrevious() {
		if (mediaItems.length === 0) return;
		
		// Clear any existing timers
		if (refreshInterval) {
			clearTimeout(refreshInterval);
		}
		
		const prevIndex = (currentIndex - 1 + mediaItems.length) % mediaItems.length;
		showMedia(prevIndex);
	}
	
	function goToNext() {
		if (mediaItems.length === 0) return;
		
		// Clear any existing timers
		if (refreshInterval) {
			clearTimeout(refreshInterval);
		}
		
		advanceMedia();
	}
</script>

<svelte:head>
	<title>Media Display</title>
</svelte:head>

<div class="display-container">
	{#if showIndicator}
		<div
			class="mode-indicator"
			on:click={() => (showIndicator = true)}
			on:mouseenter={() => (showIndicator = true)}
		>
			<div class="mode-label">
				<span>INDIVIDUAL VIEW</span>
			</div>
			<a href="/display/live" class="mode-toggle">Switch to Live Mode</a>
		</div>
	{/if}
	<DisplayModeIndicator mode="individual" {isAdmin} />
	<Debug item={currentItem} visible={showDebug} />

	{#if loading}
		<div class="loading">
			<p>Loading media...</p>
		</div>
	{:else if error}
		<div class="error">
			<p>{error}</p>
		</div>
	{:else if mediaItems.length === 0}
		<div class="empty">
			<p>No media available for display.</p>
			{#if apiResponse}
				<div class="debug-info">
					<p>API Response: {JSON.stringify(apiResponse)}</p>
				</div>
			{/if}
		</div>
	{:else if currentItem}
		<div class="media-container">
			{#if isVideo}
				<video
					src={mediaUrl}
					bind:this={mediaElement}
					autoplay
					muted={false}
					playsinline
					controls
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
					<p>Media type not recognized: {currentItem.file_type || 'unknown'}</p>
					<p class="debug-info">Item data: {JSON.stringify(currentItem)}</p>
				</div>
			{/if}

			{#if currentItem}
				{#if (logMetadata(currentItem), false)}
					<!-- Just for debugging, doesn't render anything -->
				{/if}

				<MediaInfo {currentItem} {hasQRCode} />
			{/if}
		</div>
	{/if}
</div>

<a href="/display/sync" class="mode-switch-button">
  Switch to Synchronized Mode
</a>

<!-- Playback controls -->
<div class="playback-controls">
  <button class="control-btn prev-btn" on:click={goToPrevious} title="Previous">
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
    </svg>
  </button>
  
  <button class="control-btn play-pause-btn" on:click={togglePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
    {#if isPlaying}
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M8 5v14l11-7z"/>
      </svg>
    {/if}
  </button>
  
  <button class="control-btn next-btn" on:click={goToNext} title="Next">
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
    </svg>
  </button>
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

	/* Hide video controls initially, show on hover */
	.video-element::-webkit-media-controls {
		opacity: 0;
		transition: opacity 0.3s;
	}

	.video-element:hover::-webkit-media-controls {
		opacity: 1;
	}

	/* For Firefox */
	.video-element {
		transition: opacity 0.3s;
	}

	.video-element:hover {
		opacity: 1;
	}

	.debug-info {
		font-size: 0.9rem;
		background-color: rgba(0, 0, 0, 0.7);
		padding: 1rem;
		margin-top: 1rem;
		max-width: 80%;
		overflow: auto;
	}

	.unknown-type {
		padding: 2rem;
		background-color: rgba(255, 0, 0, 0.3);
		border-radius: 8px;
	}
    
    /* Media queries for responsive design */
    @media (max-width: 768px) {
        /* Responsive styles that don't relate to MediaInfo */
    }
    
    /* Mode switch button */
    .mode-switch-button {
        position: absolute;
        bottom: 20px;
        right: 20px;
        background-color: rgba(0, 0, 0, 0.6);
        color: white;
        text-decoration: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 1002;
    }
    
    .mode-switch-button:hover {
        background-color: rgba(0, 0, 0, 0.8);
    }
    
    /* Playback controls */
    .playback-controls {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 20px;
        background-color: rgba(0, 0, 0, 0.6);
        padding: 10px 20px;
        border-radius: 30px;
        z-index: 1002;
    }
    
    .control-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .control-btn:hover {
        background-color: rgba(255, 255, 255, 0.3);
    }
    
    .play-pause-btn {
        width: 50px;
        height: 50px;
    }
</style>
