<!-- src/routes/display/+page.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
  import Debug from './Debug.svelte';


	// Accept data from server-side load function
	export let data;

	let mediaItems = data.initialMedia || [];
	let currentIndex = 0;
	let loading = mediaItems.length === 0;
	let error = data.error || null;
	let refreshInterval;
	let mediaElement;
	let isPlaying = false;
	let apiResponse = null; // For debugging

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
</script>

<svelte:head>
	<title>Media Display</title>
</svelte:head>

<div class="display-container">
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

				<div class="media-info" class:hidden={currentItem.metadata?.hide_info}>
					{#if !currentItem.metadata?.hide_title}
						<h2>{currentItem.title || 'Untitled'}</h2>
					{/if}

					{#if currentItem.description && !currentItem.metadata?.hide_description}
						<p class="description">{currentItem.description}</p>
					{/if}

					{#if !currentItem.metadata?.hide_creator}
						<p class="creator">
							{#if currentItem.profile_image}
								<span class="profile-image">
									<img src={currentItem.profile_image} alt="Profile" />
								</span>
							{/if}
							Created by: {currentItem.full_name || currentItem.uploaded_by || 'Unknown'}
						</p>
					{/if}
				</div>
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

	.media-info {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		background-color: rgba(0, 0, 0, 0.7);
		padding: 1rem;
		box-sizing: border-box;
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

	.description {
		margin: 0.5rem 0;
		font-size: 1rem;
	}

	.creator {
		margin: 0.5rem 0 0 0;
		font-size: 0.9rem;
		opacity: 0.8;
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

	.profile-image {
		display: inline-block;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		overflow: hidden;
		margin-right: 10px;
		border: 2px solid rgba(255, 255, 255, 0.5);
	}

	.profile-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.media-info.hidden {
		display: none;
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
</style>
