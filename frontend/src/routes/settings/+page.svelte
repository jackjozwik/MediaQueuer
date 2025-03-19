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

	// Initialize on mount
	onMount(() => {
		loadUserProfile();
		
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

	<div class="settings-grid">
		<!-- User Info Form -->
		<div class="user-info-form settings-card">
			<h2>Personal Information</h2>

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

			<form on:submit|preventDefault={saveProfile}>
				<div class="form-grid">
					<div class="form-group">
						<label for="firstName">First Name</label>
						<input
							type="text"
							id="firstName"
							bind:value={userForm.firstName}
							required
						/>
					</div>

					<div class="form-group">
						<label for="lastName">Last Name</label>
						<input 
                            type="text" 
                            id="lastName" 
                            bind:value={userForm.lastName} 
                            required 
                        />
					</div>

					<div class="form-group">
						<label for="preferredName">Preferred Name (Optional)</label>
						<input 
                            type="text" 
                            id="preferredName" 
                            bind:value={userForm.preferredName} 
                        />
						<div class="help-text">
							If provided, this will be displayed instead of your first name
						</div>
					</div>

					<div class="form-group">
						<label for="email">Email</label>
						<input 
                            type="email" 
                            id="email" 
                            bind:value={userForm.email} 
                            required 
                        />
					</div>
				</div>

				<h3>Change Password</h3>
				{#if passwordError}
					<div class="alert error">
						{passwordError}
					</div>
				{/if}

				<div class="form-grid">
					<div class="form-group">
						<label for="currentPassword">Current Password</label>
						<input 
                            type="password" 
                            id="currentPassword" 
                            bind:value={userForm.currentPassword} 
                        />
						<div class="help-text">Required only if changing password</div>
					</div>

					<div class="form-group">
						<label for="newPassword">New Password</label>
						<input 
                            type="password" 
                            id="newPassword" 
                            bind:value={userForm.newPassword} 
                        />
					</div>

					<div class="form-group">
						<label for="confirmPassword">Confirm New Password</label>
						<input 
                            type="password" 
                            id="confirmPassword" 
                            bind:value={userForm.confirmPassword} 
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

		<!-- Profile Image -->
		<div class="profile-image-section settings-card">
			<h2>Profile Photo</h2>

			<div class="profile-preview">
				{#if previewUrl}
					<img src={previewUrl} alt="Preview" class="preview-image" />
				{:else if $user && $user.profileImage}
					<img src={$user.profileImage} alt="Current profile" class="preview-image" />
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
			</div>

			<p class="help-text">Profile image will be uploaded when you click "Save Changes"</p>
			<p class="help-text">Recommended: Square image, 500x500 pixels</p>
		</div>
	</div>
</div>

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
	input[type='password'] {
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

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.settings-grid {
			grid-template-columns: 1fr;
		}

		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>