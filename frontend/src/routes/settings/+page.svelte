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
	let uploading = false;
	let success = null;
	let error = null;
	let passwordError = null;

	// Initialize form with user data
	$: if ($user) {
		userForm = {
			...userForm,
			firstName: $user.firstName || '',
			lastName: $user.lastName || '',
			preferredName: $user.preferredName || '',
			email: $user.email || ''
		};
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
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			previewUrl = URL.createObjectURL(selectedFile);
		}
	}

	// Save user profile
	async function saveProfile() {
		// Reset status
		error = null;
		success = null;
		passwordError = null;
		saving = true;

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

		try {
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

	// Upload profile image
	async function uploadProfileImage() {
		if (!profileImage) {
			error = 'Please select an image to upload';
			return;
		}

		error = null;
		success = null;
		uploading = true;

		try {
			// Create form data
			const formData = new FormData();
			formData.append('profileImage', profileImage);

			const response = await fetch('/api/users/update-profile-image', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${$token}`
				},
				body: formData
			});

			const result = await response.json();

			if (result.success) {
				success = 'Profile image updated successfully';

				// Update user store with new profile image
				user.update((u) => ({
					...u,
					profileImage: result.data.profileImage
				}));

				// Clean up preview URL
				if (previewUrl) {
					URL.revokeObjectURL(previewUrl);
					previewUrl = null;
				}

				profileImage = null;
			} else {
				error = result.message || 'Upload failed';
			}
		} catch (err) {
			console.error('Upload error:', err);
			error = 'Error uploading file. Please try again.';
		} finally {
			uploading = false;
		}
	}

	// Clean up preview URL on unmount
	onMount(() => {
		// Fetch current user data to ensure we have the latest
		const fetchUserProfile = async () => {
			try {
				const response = await fetch('/api/users/profile', {
					headers: {
						Authorization: `Bearer ${$token}`
					}
				});

				const result = await response.json();

				if (result.success && result.data && result.data.user) {
					// Update the user store
					user.set(result.data.user);
				}
			} catch (err) {
				console.error('Error fetching user profile:', err);
			}
		};

		fetchUserProfile();

		return () => {
			if (previewUrl) {
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
							bind:value={userForm.firstName}
							type="text"
							placeholder="First Name"
							class="your-existing-class"
						/>
					</div>

					<div class="form-group">
						<label for="lastName">Last Name</label>
						<input type="text" id="lastName" bind:value={userForm.lastName} required />
					</div>

					<div class="form-group">
						<label for="preferredName">Preferred Name (Optional)</label>
						<input type="text" id="preferredName" bind:value={userForm.preferredName} />
						<div class="help-text">
							If provided, this will be displayed instead of your first name
						</div>
					</div>

					<div class="form-group">
						<label for="email">Email</label>
						<input type="email" id="email" bind:value={userForm.email} required />
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
						<input type="password" id="currentPassword" bind:value={userForm.currentPassword} />
						<div class="help-text">Required only if changing password</div>
					</div>

					<div class="form-group">
						<label for="newPassword">New Password</label>
						<input type="password" id="newPassword" bind:value={userForm.newPassword} />
					</div>

					<div class="form-group">
						<label for="confirmPassword">Confirm New Password</label>
						<input type="password" id="confirmPassword" bind:value={userForm.confirmPassword} />
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

			{#if error}
				<div class="alert error">
					{error}
				</div>
			{/if}

			{#if success}
				<div class="alert success">
					{success}
				</div>
			{/if}

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
						disabled={uploading}
						class="hidden-input"
					/>
				</label>

				{#if previewUrl}
					<button
						type="button"
						class="btn text"
						on:click={() => {
							profileImage = null;
							URL.revokeObjectURL(previewUrl);
							previewUrl = null;
						}}
						disabled={uploading}
					>
						Clear
					</button>
				{/if}
			</div>

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
