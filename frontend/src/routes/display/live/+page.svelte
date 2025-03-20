<!-- src/routes/display/live/+page.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { user, token, isAuthenticated } from '$lib/auth';

	// Simple version of the display mode indicator
	let showIndicator = true;
	let indicatorTimeout;

	// Data from page load
	export let data;

	// Media state
	let mediaItems = [];
	let currentIndex = 0;
	let currentItem = null;
	let loading = true;
	let error = null;
	let mediaElement;
	let pollingInterval;

	// Admin status
	$: isAdmin = $user && $user.role === 'admin';

	// Initial load of media
	async function loadMedia() {
		try {
			const response = await fetch('/api/media/approved');
			const result = await response.json();

			if (result.success && result.data && result.data.media) {
				mediaItems = result.data.media;

				if (mediaItems.length > 0) {
					// Try to get current state from server first
					await fetchDisplayState();

					// If we still don't have a current item, use the first one
					if (!currentItem) {
						currentIndex = 0;
						currentItem = mediaItems[0];
					}

					loading = false;
				} else {
					error = 'No media available for display';
					loading = false;
				}
			} else {
				error = 'Failed to load media';
				loading = false;
			}
		} catch (err) {
			console.error('Error loading media:', err);
			error = 'Error: ' + err.message;
			loading = false;
		}
	}

	// Poll for display state updates
	async function fetchDisplayState() {
		try {
			const response = await fetch('/api/media/display-state');

			if (!response.ok) {
				console.error('Error fetching display state:', response.statusText);
				return;
			}

			const result = await response.json();

			if (result.success && result.data && result.data.state) {
				const serverState = result.data.state;
				console.log('Got state from server:', serverState);

				// Make sure we have media items first
				if (mediaItems.length === 0) return;

				// Get the server index and normalize it to our current array length
				const serverIndex = serverState.currentIndex % mediaItems.length;

				// Only update if index has changed or it's the first load
				if (currentIndex !== serverIndex || !currentItem) {
					console.log(`Server says we should be at index ${serverIndex}, we're at ${currentIndex}`);

					// Update to the new index
					currentIndex = serverIndex;
					currentItem = mediaItems[currentIndex];

					// Clear any automatic advance timers
					if (advanceTimer) {
						clearTimeout(advanceTimer);
						advanceTimer = null;
					}

					// If we're transitioning to a new image, set up the advance timer
					if (currentItem && currentItem.file_type.startsWith('image/')) {
						setupImageAdvanceTimer();
					}
				}
				// Only sync video if:
				// 1. It's the same video we're already playing
				// 2. AND there's a significant time difference (> 10 seconds)
				else if (currentItem && isVideo && mediaElement && serverState.videoState) {
					const timeDiff = Math.abs(mediaElement.currentTime - serverState.videoState.currentTime);

					// Only sync if the time difference is substantial (avoid micro-adjustments)
					if (timeDiff > 10) {
						console.log(`Large time difference detected (${timeDiff}s), syncing video`);
						mediaElement.currentTime = serverState.videoState.currentTime;
					}
				}
			}
		} catch (err) {
			console.error('Error fetching display state:', err);
		}
	}

	// Variable to track automatic advance timer
	let advanceTimer = null;

	// Set up timer for automatically advancing images
	function setupImageAdvanceTimer() {
		if (!currentItem || !currentItem.file_type.startsWith('image/')) return;

		// Clear any existing timer
		if (advanceTimer) {
			clearTimeout(advanceTimer);
		}

		// Get duration in seconds, with fallback to 10 seconds
		const durationSeconds = currentItem.duration ? parseInt(currentItem.duration) : 10;
		console.log(`Setting up automatic advance for image in ${durationSeconds} seconds`);

		// Set timer to advance after the specified duration
		advanceTimer = setTimeout(() => {
			if (isAdmin) {
				advanceToNextItem();
			}
		}, durationSeconds * 1000);
	}

	// Function to advance to the next item (for admin)
	function advanceToNextItem() {
		if (!isAdmin || mediaItems.length === 0) return;

		const nextIndex = (currentIndex + 1) % mediaItems.length;

		// Update local state
		currentIndex = nextIndex;
		currentItem = mediaItems[nextIndex];

		// Update server state
		console.log(`Advancing to item ${nextIndex}`);
		updateServerMedia(nextIndex, currentItem.id);

		// If it's an image, set up the next timer
		if (currentItem.file_type.startsWith('image/')) {
			setupImageAdvanceTimer();
		}
	}

	// Handle video ended event
	function handleVideoEnded() {
		console.log('Video playback ended');

		// Only admins can control advancement
		if (isAdmin) {
			advanceToNextItem();
		}
	}

	// Sync video with server state
	function syncVideoElement(serverState) {
		if (!mediaElement || !serverState.videoState) return;

		// Only sync if we're within a reasonable threshold (5 seconds)
		const timeDiff = Math.abs(mediaElement.currentTime - serverState.videoState.currentTime);

		if (timeDiff > 3) {
			console.log(
				`Syncing video time from ${mediaElement.currentTime} to ${serverState.videoState.currentTime}`
			);

			// Try to update time
			try {
				mediaElement.currentTime = serverState.videoState.currentTime;
			} catch (err) {
				console.warn('Could not set video time:', err);
			}
		}

		// Match play/pause state for admins only
		if (isAdmin) {
			if (serverState.videoState.isPlaying && mediaElement.paused) {
				mediaElement.play().catch((err) => console.warn('Could not autoplay:', err));
			} else if (!serverState.videoState.isPlaying && !mediaElement.paused) {
				mediaElement.pause();
			}
		}
	}

	// Send media update to server (admin only)
	// Update the updateServerMedia function to use the token store directly:
	async function updateServerMedia(index, mediaId) {
		if (!isAdmin) {
			console.log('Not an admin, skipping server update');
			return;
		}

		// Use the direct token store value instead of user.token
		if (!$token) {
			console.error("Missing token for server update - make sure you're logged in as admin");
			return;
		}

		console.log(`Sending update to server: index=${index}, mediaId=${mediaId}`);

		try {
			const response = await fetch('/api/media/display-state/media', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${$token}`
				},
				body: JSON.stringify({
					index,
					mediaId
				})
			});

			if (!response.ok) {
				const text = await response.text();
				console.error('Server returned error:', response.status, text);
				return;
			}

			const data = await response.json();
			console.log('Server update successful:', data);
		} catch (err) {
			console.error('Error updating server media state:', err);
		}
	}

	// Handle redirecting to individual mode for non-admins
	function handleVideoInteraction(event) {
		if (!isAdmin && (event.type === 'pause' || event.type === 'seeking')) {
			// Non-admin user interacted with video, switch to individual mode
			window.location.href = '/display';
		} else if (isAdmin) {
			// Admin can control playback
			updateServerVideoState();
		}
	}

	// Update server with video state (admin only)
	async function updateServerVideoState() {
		if (!isAdmin || !mediaElement || !$user.token) return;

		try {
			const response = await fetch('/api/media/display-state/video', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${$user.token}`
				},
				body: JSON.stringify({
					isPlaying: !mediaElement.paused,
					currentTime: mediaElement.currentTime,
					duration: mediaElement.duration || 0
				})
			});

			if (!response.ok) {
				console.error('Failed to update server video state:', response.statusText);
			}
		} catch (err) {
			console.error('Error updating server video state:', err);
		}
	}

	// Hide indicator after 5 seconds
	function hideIndicatorAfterDelay() {
		if (indicatorTimeout) {
			clearTimeout(indicatorTimeout);
		}

		showIndicator = true;

		indicatorTimeout = setTimeout(() => {
			showIndicator = false;
		}, 5000);
	}

	// Setup on component mount
	onMount(() => {
		// Load media and start polling
		loadMedia();

		pollingInterval = setInterval(fetchDisplayState, 3000);

		hideIndicatorAfterDelay();

		if (currentItem && currentItem.file_type.startsWith('image/')) {
			setupImageAdvanceTimer();
		}

		return () => {
			if (advanceTimer) clearTimeout(advanceTimer);
			if (pollingInterval) clearInterval(pollingInterval);
			clearInterval(pollingInterval);
			if (indicatorTimeout) {
				clearTimeout(indicatorTimeout);
			}
		};
	});

	// Derived values
	$: isVideo =
		currentItem &&
		(currentItem.file_type === 'video' || currentItem.file_type.startsWith('video/'));

	$: isImage =
		currentItem &&
		(currentItem.file_type === 'image' || currentItem.file_type.startsWith('image/'));

	$: mediaUrl = currentItem?.file_url?.startsWith('/')
		? currentItem.file_url
		: `/${currentItem?.file_url}`;

	$: hasQRCode = currentItem && currentItem.qr_code && currentItem.qr_code.trim() !== '';
</script>

<svelte:head>
	<title>Live Display</title>
	<!-- Force dark mode and prevent zoom or user interaction -->
	<style>
		html,
		body {
			background-color: #000;
			color: white;
			overflow: hidden;
			width: 100%;
			height: 100%;
			margin: 0;
			padding: 0;
			user-select: none;
		}
	</style>
</svelte:head>

<!-- Simple mode indicator -->
{#if showIndicator}
	<div
		class="mode-indicator"
		on:click={() => (showIndicator = true)}
		on:mouseenter={() => (showIndicator = true)}
	>
		<div class="mode-label">
			<div class="live-indicator"></div>
			<span>{isAdmin ? 'LIVE (Admin Control)' : 'LIVE STREAM'}</span>
		</div>
		<a href="/display" class="mode-toggle">Switch to Individual Mode</a>
		<div class="admin-controls">
			<div class="control-header">Admin Controls</div>
			<div class="controls-container">
				<button
					on:click={() => {
						// Go to previous item
						let newIndex = currentIndex - 1;
						if (newIndex < 0) newIndex = mediaItems.length - 1;

						// Update local state
						currentIndex = newIndex;
						currentItem = mediaItems[newIndex];

						// Update server state
						console.log(`ADMIN: Manually changing to index ${newIndex}`);
						updateServerMedia(newIndex, currentItem.id);
					}}
				>
					Previous
				</button>

				<span class="item-indicator">
					Item {currentIndex + 1} of {mediaItems.length}
				</span>

				<button
					on:click={() => {
						// Go to next item
						let newIndex = (currentIndex + 1) % mediaItems.length;

						// Update local state
						currentIndex = newIndex;
						currentItem = mediaItems[newIndex];

						// Update server state
						console.log(`ADMIN: Manually changing to index ${newIndex}`);
						updateServerMedia(newIndex, currentItem.id);
					}}
				>
					Next
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="display-container">
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
		</div>
	{:else if currentItem}
		<div class="media-container">
			{#if isVideo}
				<video
					src={mediaUrl}
					bind:this={mediaElement}
					autoplay
					on:ended={handleVideoEnded}
					on:pause={handleVideoInteraction}
					on:seeking={handleVideoInteraction}
					on:seeked={handleVideoInteraction}
					muted={false}
					controls={isAdmin}
					class="media-element video-element"
				></video>
			{:else if isImage}
				<img src={mediaUrl} alt={currentItem.title} class="media-element image-element" />
			{:else}
				<div class="unknown-type">
					<p>Unsupported media type</p>
				</div>
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
		</div>
	{/if}
</div>

<style>
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

	.live-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background-color: #ff3e3e;
		animation: pulse 1.5s infinite;
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

	@keyframes pulse {
		0% {
			opacity: 1;
			box-shadow: 0 0 0 0 rgba(255, 62, 62, 0.7);
		}
		70% {
			opacity: 0.7;
			box-shadow: 0 0 0 8px rgba(255, 62, 62, 0);
		}
		100% {
			opacity: 1;
			box-shadow: 0 0 0 0 rgba(255, 62, 62, 0);
		}
	}

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
	}

	.image-element {
		max-width: 100vw;
		max-height: 100vh;
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

	.hidden {
		display: none;
	}

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

	@media (min-width: 1600px) {
		.media-info {
			max-width: 550px;
		}
	}
</style>
