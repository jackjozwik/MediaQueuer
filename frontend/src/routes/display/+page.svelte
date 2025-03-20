<!-- src/routes/display/+page.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { user } from '$lib/auth';
	import DisplayModeIndicator from '../../components/DisplayModeIndicator.svelte';
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

				<div class="media-info" class:hidden={currentItem.metadata?.hide_info}>
					<div class="info-content">
						<!-- Profile image section -->
						<div class="profile-section">
							{#if currentItem.profile_image}
								<div class="profile-image">
									<img src={currentItem.profile_image} alt="Profile" />
								</div>
							{:else}
								<div class="profile-placeholder"></div>
							{/if}
						</div>

						<!-- Text content section -->
						<div class="text-section">
							{#if !currentItem.metadata?.hide_title}
								<h2 class="title">{currentItem.title || 'Untitled'}</h2>
							{/if}

							{#if currentItem.description && !currentItem.metadata?.hide_description}
								<p class="description">{currentItem.description}</p>
							{/if}

							{#if !currentItem.metadata?.hide_creator}
								<p class="creator">
									Created by: {currentItem.full_name || currentItem.uploaded_by || 'Unknown'}
								</p>
							{/if}
						</div>

						<!-- QR code section - only shown if one exists -->
						{#if hasQRCode}
							<div class="qr-code-section">
								<img src={currentItem.qr_code} alt="QR Code" class="qr-code" />
							</div>
						{/if}
					</div>
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
		background-color: rgba(0, 0, 0, 0.7);
		box-sizing: border-box;
		width: auto;
		max-width: min(650px, 65%);
		border-top-right-radius: 8px;
	}

	.info-content {
		display: flex;
		align-items: center;
		padding: 16px;
	}

	/* Profile image section */
	.profile-section {
		margin-right: 20px;
		flex-shrink: 0;
	}

	.profile-image,
	.profile-placeholder {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		overflow: hidden;
		border: 2px solid rgba(255, 255, 255, 0.5);
		background-color: #333;
	}

	.profile-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Text content section */
	.text-section {
		flex: 1;
		margin-right: 20px;
		min-width: 0;
		max-width: 100%;
	}

	.title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 6px 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.description {
		font-size: 1rem;
		margin: 0 0 6px 0;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		opacity: 0.9;
	}

	.creator {
		font-size: 0.9rem;
		margin: 0;
		opacity: 0.7;
	}

	/* QR code section */
	.qr-code-section {
		border-left: 1px solid rgba(255, 255, 255, 0.3);
		padding-left: 20px;
		flex-shrink: 0;
	}

	.qr-code {
		width: 80px;
		height: 80px;
		background-color: #fff;
		padding: 4px;
		border-radius: 4px;
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

	/* Media queries for responsive design */
	@media (max-width: 768px) {
		.title {
			font-size: 1.2rem;
		}

		.description {
			font-size: 0.9rem;
		}

		.creator {
			font-size: 0.8rem;
		}

		.profile-image,
		.profile-placeholder {
			width: 45px;
			height: 45px;
		}

		.qr-code {
			width: 65px;
			height: 65px;
		}

		.media-info {
			max-width: 90%;
		}
	}

	/* For wider screens, ensure the info box doesn't stretch too much */
	@media (min-width: 1600px) {
		.media-info {
			max-width: 550px;
		}
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
