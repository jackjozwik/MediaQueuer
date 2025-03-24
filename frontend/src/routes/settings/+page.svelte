<!-- src/routes/settings/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	import { user, token } from '$lib/auth';

	// User form data
	let userForm = {
		firstName: '',
		lastName: '',
		preferredName: '',
		email: '',
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	};

	// Profile image state
	let profileImage = null;
	let previewUrl = null;

	// Status flags
	let saving = false;
	let success = null;
	let error = null;
	let passwordError = null;
	let userFormInitialized = false;

	// User uploads state
	let userUploads = [];
	let loadingUploads = false;
	let uploadsError = null;
	let editingMedia = null;
	let showDeleteConfirm = false;
	let mediaToDelete = null;
	
	// Tab state
	let activeTab = 'profile';

	// Initialize form with user data - only once
	$: if ($user && !userFormInitialized) {
		userForm = {
			firstName: $user.firstName || '',
			lastName: $user.lastName || '',
			preferredName: $user.preferredName || '',
			email: $user.email || '',
			currentPassword: '',
			newPassword: '',
			confirmPassword: ''
		};
		userFormInitialized = true;
	}

	// Handle profile image selection
	function handleFileChange(event) {
		const selectedFile = event.target.files[0];

		if (selectedFile) {
			if (!selectedFile.type.startsWith('image/')) {
				error = 'Please select an image file.';
				return;
			}

			profileImage = selectedFile;

			// Create preview URL
			if (previewUrl && previewUrl.startsWith('blob:')) {
				URL.revokeObjectURL(previewUrl);
			}
			previewUrl = URL.createObjectURL(selectedFile);
		}
	}
	
	// Delete profile image
	async function deleteProfileImage() {
		try {
			const response = await fetch('/api/users/delete-profile-image', {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${$token}`
				}
			});
			
			const result = await response.json();
			
			if (result.success) {
				// Update user store to remove profile image
				user.update((u) => ({
					...u,
					profileImage: null
				}));
				
				// Clear preview URL
				if (previewUrl && previewUrl.startsWith('blob:')) {
					URL.revokeObjectURL(previewUrl);
				}
				previewUrl = null;
				profileImage = null;
				
				success = 'Profile image removed successfully';
				setTimeout(() => success = null, 3000);
			} else {
				error = result.message || 'Failed to remove profile image';
				setTimeout(() => error = null, 3000);
			}
		} catch (err) {
			console.error('Error deleting profile image:', err);
			error = 'Error removing profile image';
			setTimeout(() => error = null, 3000);
		}
	}

	// Save user profile (now includes image upload)
	async function saveProfile() {
		// Reset status
		error = null;
		success = null;
		passwordError = null;
		saving = true;

		try {
			// First, upload profile image if one is selected
			if (profileImage) {
				const formData = new FormData();
				formData.append('profileImage', profileImage);

				const imageResponse = await fetch('/api/users/update-profile-image', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${$token}`
					},
					body: formData
				});

				const imageResult = await imageResponse.json();

				if (imageResult.success) {
					// Update user store with new profile image
					user.update((u) => ({
						...u,
						profileImage: imageResult.data.profileImage
					}));

					// Clean up preview URL
					if (previewUrl && previewUrl.startsWith('blob:')) {
						URL.revokeObjectURL(previewUrl);
					}
					profileImage = null;
				} else {
					error = imageResult.message || 'Profile image upload failed';
					saving = false;
					return;
				}
			}

			// Validate password fields
			if (userForm.newPassword || userForm.confirmPassword || userForm.currentPassword) {
				if (!userForm.currentPassword) {
					passwordError = 'Current password is required to change password';
					saving = false;
					return;
				}

				if (userForm.newPassword !== userForm.confirmPassword) {
					passwordError = 'New passwords do not match';
					saving = false;
					return;
				}

				if (userForm.newPassword.length < 6) {
					passwordError = 'New password must be at least 6 characters';
					saving = false;
					return;
				}
			}

			// Update user info
			const userData = {
				firstName: userForm.firstName,
				lastName: userForm.lastName,
				preferredName: userForm.preferredName,
				email: userForm.email
			};

			// Add password fields if changing password
			if (userForm.newPassword && userForm.currentPassword) {
				userData.currentPassword = userForm.currentPassword;
				userData.newPassword = userForm.newPassword;
			}

			// Send update request
			const response = await fetch('/api/users/update', {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${$token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(userData)
			});

			const result = await response.json();

			if (!result.success) {
				error = result.message || 'Failed to update profile';
				saving = false;
				return;
			}

			// Update user in store if successful
			user.update((u) => ({
				...u,
				firstName: userForm.firstName,
				lastName: userForm.lastName,
				preferredName: userForm.preferredName,
				email: userForm.email
			}));

			// Clear password fields
			userForm.currentPassword = '';
			userForm.newPassword = '';
			userForm.confirmPassword = '';

			success = 'Profile updated successfully';
		} catch (err) {
			console.error('Error updating profile:', err);
			error = 'Failed to update profile. Please try again.';
		} finally {
			saving = false;
		}
	}

	// Load user profile data from API
	async function loadUserProfile() {
		try {
			const response = await fetch('/api/users/profile', {
				headers: { Authorization: `Bearer ${$token}` }
			});

			const data = await response.json();
			if (data.success) {
				// Update form with retrieved data
				userForm = {
					firstName: data.data.user.firstName || '',
					lastName: data.data.user.lastName || '',
					preferredName: data.data.user.preferredName || '',
					email: data.data.user.email || '',
					currentPassword: '',
					newPassword: '',
					confirmPassword: ''
				};
				
				// Check if profile image exists
				if (data.data.user.profileImage) {
					previewUrl = data.data.user.profileImage;
				}
				
				userFormInitialized = true;
			}
		} catch (error) {
			console.error('Failed to load user profile:', error);
		}
	}

	// Fetch user uploads
	async function fetchUserUploads() {
		loadingUploads = true;
		uploadsError = null;

		try {
			const response = await fetch('/api/media/user-uploads', {
				headers: { Authorization: `Bearer ${$token}` }
			});

			const result = await response.json();
			
			if (result.success) {
				userUploads = result.data.media;
			} else {
				uploadsError = result.message || 'Failed to load your uploads';
			}
		} catch (err) {
			console.error('Error fetching user uploads:', err);
			uploadsError = 'Error loading your uploads';
		} finally {
			loadingUploads = false;
		}
	}

	// Show edit form for a media item
	function showEditForm(media) {
		editingMedia = {
			...media,
			title: media.title || '',
			description: media.description || ''
		};
	}

	// Handle form submission for editing media
	async function handleEditSubmit(event) {
		event.preventDefault();
		
		try {
			const response = await fetch(`/api/media/${editingMedia.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${$token}`
				},
				body: JSON.stringify({
					title: editingMedia.title,
					description: editingMedia.description
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				// Update local list
				userUploads = userUploads.map(item => 
					item.id === editingMedia.id ? { ...item, ...result.data.media } : item
				);
				
				// Close edit form
				editingMedia = null;
				
				// Show success message
				success = 'Your upload has been updated and will require re-approval';
				setTimeout(() => success = null, 3000);
			} else {
				error = result.message || 'Failed to update your upload';
				setTimeout(() => error = null, 3000);
			}
		} catch (err) {
			console.error('Error updating media:', err);
			error = 'Error updating your upload';
			setTimeout(() => error = null, 3000);
		}
	}

	// Confirm delete
	function confirmDelete(media) {
		mediaToDelete = media;
		showDeleteConfirm = true;
	}

	// Delete media item
	async function deleteMedia(id) {
		try {
			const response = await fetch(`/api/media/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${$token}` }
			});
			
			const result = await response.json();
			
			if (result.success) {
				// Remove from local list
				userUploads = userUploads.filter(item => item.id !== id);
				
				// Close dialog
				showDeleteConfirm = false;
				mediaToDelete = null;
				
				// Show success message
				success = 'Your upload has been deleted';
				setTimeout(() => success = null, 3000);
			} else {
				error = result.message || 'Failed to delete your upload';
				setTimeout(() => error = null, 3000);
			}
		} catch (err) {
			console.error('Error deleting media:', err);
			error = 'Error deleting your upload';
			setTimeout(() => error = null, 3000);
		}
	}

	// Get status badge class
	function getStatusClass(status) {
		switch (status) {
			case 'approved': return 'badge-success';
			case 'rejected': return 'badge-danger';
			case 'pending': return 'badge-warning';
			case 'archived': return 'badge-info';
			default: return 'badge-secondary';
		}
	}

	// Format date
	function formatDate(dateString) {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	// Initialize on mount
	onMount(() => {
		loadUserProfile();
		fetchUserUploads();
		
		// Clean up on unmount
		return () => {
			if (previewUrl && previewUrl.startsWith('blob:')) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});
</script>

<svelte:head>
	<title>User Settings</title>
</svelte:head>

<div class="settings-container">
	<h1>User Settings</h1>
	
	{#if success}
		<div class="alert success">
			{success}
		</div>
	{/if}

	{#if error}
		<div class="alert error">
			{error}
		</div>
	{/if}
	
	<!-- Tabs navigation -->
	<div class="tabs-container">
		<button 
			class="tab-button" 
			class:active={activeTab === 'profile'} 
			on:click={() => activeTab = 'profile'}
		>
			<i class="fas fa-user"></i>
			Profile Settings
		</button>
		<button 
			class="tab-button" 
			class:active={activeTab === 'uploads'} 
			on:click={() => activeTab = 'uploads'}
		>
			<i class="fas fa-upload"></i>
			My Uploads
		</button>
	</div>

	<!-- Profile Tab -->
	{#if activeTab === 'profile'}
		<div class="settings-grid">
			<!-- User Info Form -->
			<div class="user-info-form settings-card">
				<h2>Personal Information</h2>

				<form on:submit|preventDefault={saveProfile}>
					<div class="form-grid">
						<div class="form-group">
							<label for="firstName">First Name</label>
							<input
								type="text"
								id="firstName"
								bind:value={userForm.firstName}
								required
								disabled={saving}
							/>
						</div>

						<div class="form-group">
							<label for="lastName">Last Name</label>
							<input
								type="text"
								id="lastName"
								bind:value={userForm.lastName}
								required
								disabled={saving}
							/>
						</div>
					</div>

					<div class="form-group">
						<label for="preferredName">Preferred Name (Optional)</label>
						<input
							type="text"
							id="preferredName"
							bind:value={userForm.preferredName}
							disabled={saving}
						/>
						<p class="help-text">This name will be shown with your uploads</p>
					</div>

					<div class="form-group">
						<label for="email">Email Address</label>
						<input
							type="email"
							id="email"
							bind:value={userForm.email}
							required
							disabled={saving}
						/>
					</div>

					<h3>Change Password</h3>

					{#if passwordError}
						<div class="alert error">
							{passwordError}
						</div>
					{/if}

					<div class="form-group">
						<label for="currentPassword">Current Password</label>
						<input
							type="password"
							id="currentPassword"
							bind:value={userForm.currentPassword}
							disabled={saving}
						/>
					</div>

					<div class="form-grid">
						<div class="form-group">
							<label for="newPassword">New Password</label>
							<input
								type="password"
								id="newPassword"
								bind:value={userForm.newPassword}
								disabled={saving}
							/>
						</div>

						<div class="form-group">
							<label for="confirmPassword">Confirm New Password</label>
							<input
								type="password"
								id="confirmPassword"
								bind:value={userForm.confirmPassword}
								disabled={saving}
							/>
						</div>
					</div>

					<div class="form-actions">
						<button type="submit" class="btn primary" disabled={saving}>
							{saving ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</form>
			</div>

			<!-- Profile Image Section -->
			<div class="profile-image-section settings-card">
				<h2>Profile Image</h2>

				<div class="profile-preview">
					{#if previewUrl}
						<img src={previewUrl} alt="Profile Preview" class="preview-image" />
					{:else}
						<div class="placeholder-image">
							<span>{$user ? ($user.firstName ? $user.firstName.charAt(0) : 'U') : 'U'}</span>
						</div>
					{/if}
				</div>

				<div class="upload-controls">
					<label for="profile-image" class="btn secondary upload-btn">
						Select Image
						<input
							type="file"
							id="profile-image"
							accept="image/*"
							on:change={handleFileChange}
							disabled={saving}
							class="hidden-input"
						/>
					</label>

					{#if previewUrl && profileImage}
						<button
							type="button"
							class="btn text"
							on:click={() => {
								profileImage = null;
								if (previewUrl.startsWith('blob:')) {
									URL.revokeObjectURL(previewUrl);
								}
								previewUrl = $user?.profileImage || null;
							}}
							disabled={saving}
						>
							Clear
						</button>
					{/if}
					
					{#if previewUrl && !profileImage}
						<button
							type="button"
							class="btn danger"
							on:click={deleteProfileImage}
							disabled={saving}
						>
							Delete Profile Image
						</button>
					{/if}
				</div>

				<p class="help-text">Profile image will be uploaded when you click "Save Changes"</p>
				<p class="help-text">Recommended: Square image, 500x500 pixels</p>
			</div>
		</div>
	{:else if activeTab === 'uploads'}
		<!-- My Uploads Tab -->
		<div class="user-uploads settings-card">
			<h2>My Uploads</h2>
			<button class="btn secondary refresh-btn" on:click={fetchUserUploads}>
				Refresh
			</button>
			
			{#if loadingUploads}
				<div class="loading">Loading your uploads...</div>
			{:else if uploadsError}
				<div class="alert error">{uploadsError}</div>
			{:else if userUploads.length === 0}
				<div class="empty-state">
					<p>You haven't uploaded any media yet.</p>
					<a href="/upload" class="btn primary">Upload Media</a>
				</div>
			{:else}
				<div class="uploads-list">
					{#each userUploads as media}
						<div class="media-card">
							<div class="media-preview">
								{#if media.file_type?.startsWith('image')}
									<img src={media.file_url} alt={media.title} class="media-thumbnail" />
								{:else if media.file_type?.startsWith('video')}
									<video src={media.file_url} muted controls class="media-thumbnail"></video>
								{:else}
									<div class="generic-thumbnail">
										<span class="file-icon">📄</span>
									</div>
								{/if}
							</div>
							
							<div class="media-info">
								<h3>{media.title || 'Untitled'}</h3>
								<p class="description">{media.description || 'No description'}</p>
								
								<div class="media-meta">
									<span class={`status-badge ${getStatusClass(media.status)}`}>
										{media.status?.charAt(0).toUpperCase() + media.status?.slice(1)}
									</span>
									<span class="upload-date">Uploaded: {formatDate(media.created_at)}</span>
								</div>
								
								<div class="media-actions">
									<button class="btn secondary sm" on:click={() => showEditForm(media)}>
										Edit
									</button>
									<button class="btn danger sm" on:click={() => confirmDelete(media)}>
										Delete
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Edit Media Modal -->
{#if editingMedia}
	<div class="modal-backdrop">
		<div class="modal-content">
			<button class="close-btn" on:click={() => editingMedia = null}>×</button>
			
			<h2>Edit Upload</h2>
			
			<form on:submit={handleEditSubmit}>
				<div class="form-group">
					<label for="media-title">Title</label>
					<input 
						type="text" 
						id="media-title" 
						bind:value={editingMedia.title} 
						required
					/>
				</div>
				
				<div class="form-group">
					<label for="media-description">Description</label>
					<textarea 
						id="media-description" 
						bind:value={editingMedia.description}
						rows="5"
					></textarea>
				</div>
				
				<p class="help-text">Note: Editing media will require re-approval by admin.</p>
				
				<div class="modal-actions">
					<button type="submit" class="btn primary">Save Changes</button>
					<button type="button" class="btn secondary" on:click={() => editingMedia = null}>Cancel</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<div class="modal-backdrop">
		<div class="modal-content">
			<button class="close-btn" on:click={() => showDeleteConfirm = false}>×</button>
			
			<h2>Confirm Delete</h2>
			
			<p>Are you sure you want to delete "{mediaToDelete?.title || 'this media'}"?</p>
			<p>This action cannot be undone.</p>
			
			<div class="modal-actions">
				<button class="btn danger" on:click={() => deleteMedia(mediaToDelete.id)}>Delete</button>
				<button class="btn secondary" on:click={() => showDeleteConfirm = false}>Cancel</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 2rem;
	}

	.settings-card {
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 2rem;
		margin-bottom: 2rem;
		position: relative;
	}
	
	/* Tabs styling */
	.tabs-container {
		display: flex;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
		overflow-x: auto;
		white-space: nowrap;
	}
	
	.tab-button {
		padding: 1rem 1.5rem;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
		color: #757575;
		border-bottom: 3px solid transparent;
		transition: all 0.2s ease;
	}
	
	.tab-button.active {
		color: #1976d2;
		border-bottom-color: #1976d2;
	}
	
	.tab-button:hover:not(.active) {
		background-color: #f5f5f5;
		color: #424242;
	}
	
	.tab-button i {
		margin-right: 0.5rem;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	h1 {
		margin-bottom: 1.5rem;
	}

	h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		color: #333;
	}

	h3 {
		margin-top: 2rem;
		margin-bottom: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #eee;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	input[type='text'],
	input[type='email'],
	input[type='password'],
	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
	}

	.help-text {
		font-size: 0.85rem;
		color: #666;
		margin-top: 0.25rem;
	}

	.alert {
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.error {
		background-color: #ffebee;
		color: #c62828;
		border: 1px solid #ef9a9a;
	}

	.success {
		background-color: #e8f5e9;
		color: #2e7d32;
		border: 1px solid #a5d6a7;
	}

	.form-actions {
		margin-top: 1.5rem;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
		transition: background-color 0.2s;
	}
	
	.btn.sm {
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
	}

	.btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.primary {
		background-color: #1976d2;
		color: white;
	}

	.primary:hover:not(:disabled) {
		background-color: #1565c0;
	}

	.secondary {
		background-color: #f5f5f5;
		color: #333;
		border: 1px solid #ddd;
	}

	.secondary:hover:not(:disabled) {
		background-color: #e0e0e0;
	}
	
	.danger {
		background-color: #e53935;
		color: white;
	}
	
	.danger:hover:not(:disabled) {
		background-color: #d32f2f;
	}

	.text {
		background: none;
		color: #1976d2;
		padding: 0.5rem;
	}

	.text:hover:not(:disabled) {
		text-decoration: underline;
	}

	.profile-preview {
		width: 180px;
		height: 180px;
		margin: 0 auto 1.5rem;
		border-radius: 50%;
		overflow: hidden;
		border: 3px solid #ddd;
		background-color: #eee;
	}

	.preview-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.placeholder-image {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #1976d2;
		color: white;
	}

	.placeholder-image span {
		font-size: 5rem;
		font-weight: bold;
	}

	.upload-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.hidden-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.upload-btn {
		position: relative;
		overflow: hidden;
		cursor: pointer;
	}
	
	/* Uploads List Styles */
	.uploads-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1.5rem;
	}
	
	.media-card {
		display: flex;
		border: 1px solid #eee;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	.media-preview {
		width: 120px;
		height: 120px;
		flex-shrink: 0;
		background-color: #f5f5f5;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		position: relative;
	}
	
	.media-thumbnail {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	
	video.media-thumbnail {
		object-fit: contain;
		background-color: #000;
	}
	
	.generic-thumbnail {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #1976d2;
		color: white;
	}
	
	.file-icon {
		font-size: 2rem;
	}
	
	.media-info {
		flex: 1;
		padding: 1rem;
		display: flex;
		flex-direction: column;
	}
	
	.media-info h3 {
		margin: 0 0 0.5rem 0;
		border-top: none;
		padding-top: 0;
	}
	
	.description {
		font-size: 0.9rem;
		color: #555;
		flex: 1;
		margin: 0 0 0.5rem 0;
	}
	
	.media-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	
	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 500;
	}
	
	.badge-success {
		background-color: #e8f5e9;
		color: #2e7d32;
	}
	
	.badge-danger {
		background-color: #ffebee;
		color: #c62828;
	}
	
	.badge-warning {
		background-color: #fff8e1;
		color: #f57f17;
	}
	
	.badge-info {
		background-color: #e3f2fd;
		color: #1565c0;
	}
	
	.badge-secondary {
		background-color: #f5f5f5;
		color: #616161;
	}
	
	.upload-date {
		font-size: 0.8rem;
		color: #757575;
	}
	
	.media-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
	
	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #757575;
	}
	
	.refresh-btn {
		position: absolute;
		top: 2rem;
		right: 2rem;
	}
	
	/* Modal Styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}
	
	.modal-content {
		background-color: white;
		border-radius: 8px;
		width: 90%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
		padding: 2rem;
		position: relative;
	}
	
	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #757575;
	}
	
	.modal-actions {
		margin-top: 1.5rem;
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}
	
	.loading {
		text-align: center;
		color: #757575;
		padding: 2rem 0;
	}
	
	textarea {
		resize: vertical;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.settings-grid {
			grid-template-columns: 1fr;
		}

		.form-grid {
			grid-template-columns: 1fr;
		}
		
		.media-card {
			flex-direction: column;
		}
		
		.media-preview {
			width: 100%;
			height: 180px;
		}
	}
</style>