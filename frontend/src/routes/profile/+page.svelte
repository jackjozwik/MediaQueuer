<!-- src/routes/profile/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { user, token, tokenValidated, isTokenValidating } from '$lib/auth';
  import { api } from '$lib/api';
  
  let loading = false;
  let error = null;
  let updateSuccess = false;
  
  // Profile data
  let firstName = $user?.firstName || '';
  let lastName = $user?.lastName || '';
  let preferredName = $user?.preferredName || '';
  let email = $user?.email || '';
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let profileImage = $user?.profileImage || null;
  
  // File upload state
  let imageLoading = false;
  let imageFile = null;
  let imageError = null;
  let imageSuccess = false;
  let imagePreview = null;
  
  // Modal states
  let showDeleteImageModal = false;
  
  // Password change mode
  let changePassword = false;
  
  // Refresh user data from the server
  async function fetchUserData() {
    // Only fetch if token is validated
    if (!$tokenValidated) {
      console.log('Waiting for token validation before fetching user data');
      return;
    }
    
    try {
      const result = await api.get('/api/users/profile');
      
      if (result.success) {
        // Update local variables
        firstName = result.data.user.firstName;
        lastName = result.data.user.lastName;
        preferredName = result.data.user.preferredName || '';
        email = result.data.user.email;
        profileImage = result.data.user.profileImage;
        
        // Update user store
        user.update(u => ({ 
          ...u, 
          firstName, 
          lastName, 
          preferredName, 
          email,
          profileImage
        }));
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }
  
  // Watch for token validation state and fetch data when validated
  $: if ($tokenValidated) {
    fetchUserData();
  }
  
  // Handle form submission
  async function handleSubmit() {
    // Basic validation
    if (!firstName || !lastName) {
      error = 'First and last name are required';
      return;
    }
    
    if (email && !email.includes('@')) {
      error = 'Please enter a valid email address';
      return;
    }
    
    if (changePassword) {
      if (!currentPassword) {
        error = 'Current password is required';
        return;
      }
      
      if (!newPassword) {
        error = 'New password is required';
        return;
      }
      
      if (newPassword !== confirmPassword) {
        error = 'New passwords do not match';
        return;
      }
    }
    
    loading = true;
    error = null;
    updateSuccess = false;
    
    try {
      const userData = {
        firstName,
        lastName,
        preferredName,
        email
      };
      
      // Add password data if changing password
      if (changePassword) {
        userData.currentPassword = currentPassword;
        userData.newPassword = newPassword;
      }
      
      const result = await api.put('/api/users/update', userData);
      
      if (result.success) {
        // Update user store with new data
        user.update(u => ({ 
          ...u, 
          firstName, 
          lastName, 
          preferredName, 
          email 
        }));
        
        updateSuccess = true;
        
        // Reset password fields if password was changed
        if (changePassword) {
          currentPassword = '';
          newPassword = '';
          confirmPassword = '';
          changePassword = false;
        }
      } else {
        error = result.message || 'Failed to update profile';
      }
    } catch (err) {
      console.error('Profile update error:', err);
      error = 'An unexpected error occurred. Please try again.';
    } finally {
      loading = false;
    }
  }
  
  // Handle image file selection and upload automatically
  async function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset states
    imageError = null;
    imageSuccess = false;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      imageError = 'Please select a valid image file (JPG, PNG, GIF)';
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      imageError = 'Image file size must be less than 5MB';
      return;
    }
    
    // Create preview immediately
    imagePreview = URL.createObjectURL(file);
    
    // Upload the file immediately
    await uploadProfileImage(file);
  }
  
  // Handle profile image upload
  async function uploadProfileImage(file) {
    if (!file) return;
    
    imageLoading = true;
    imageError = null;
    
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      
      // For FormData, we need to use fetch directly with proper headers
      const response = await fetch('/api/users/update-profile-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        profileImage = result.data.profileImage;
        imageSuccess = true;
        
        // Update user store
        user.update(u => ({
          ...u,
          profileImage
        }));
        
        // Release the object URL to avoid memory leaks
        URL.revokeObjectURL(imagePreview);
        imagePreview = null;
        
        // After 3 seconds, hide success message
        setTimeout(() => {
          imageSuccess = false;
        }, 3000);
      } else {
        imageError = result.message || 'Failed to upload profile image';
        // Reset preview on error
        URL.revokeObjectURL(imagePreview);
        imagePreview = null;
      }
    } catch (err) {
      console.error('Profile image upload error:', err);
      imageError = 'An unexpected error occurred. Please try again.';
      // Reset preview on error
      URL.revokeObjectURL(imagePreview);
      imagePreview = null;
    } finally {
      imageLoading = false;
      imageFile = null;
    }
  }
  
  // Open delete image confirmation modal
  function openDeleteImageModal() {
    showDeleteImageModal = true;
  }
  
  // Close delete image confirmation modal
  function closeDeleteImageModal() {
    showDeleteImageModal = false;
  }
  
  // Handle profile image deletion
  async function deleteProfileImage() {
    if (!profileImage) return;
    
    closeDeleteImageModal();
    imageLoading = true;
    imageError = null;
    
    try {
      const response = await fetch('/api/users/delete-profile-image', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        profileImage = null;
        imagePreview = null;
        
        // Update user store
        user.update(u => ({
          ...u,
          profileImage: null
        }));
        
        imageSuccess = true;
        
        // After 3 seconds, hide success message
        setTimeout(() => {
          imageSuccess = false;
        }, 3000);
      } else {
        imageError = result.message || 'Failed to delete profile image';
      }
    } catch (err) {
      console.error('Profile image delete error:', err);
      imageError = 'An unexpected error occurred. Please try again.';
    } finally {
      imageLoading = false;
    }
  }
</script>

<div class="profile-page">
  <div class="profile-header">
    <h1>My Profile</h1>
    <div class="profile-tabs">
      <a href="/profile" class="tab active">Profile Information</a>
      <a href="/profile/uploads" class="tab">My Uploads</a>
    </div>
  </div>
  
  <div class="profile-section">
    <div class="profile-image-container">
      <div class="profile-image-wrapper">
        {#if profileImage || imagePreview}
          <img 
            src={imagePreview || profileImage} 
            alt="Profile Image" 
            class="profile-image"
          />
        {:else}
          <div class="profile-placeholder">
            <span>{(firstName && lastName) ? `${firstName[0]}${lastName[0]}` : $user?.username?.[0]?.toUpperCase() || 'U'}</span>
          </div>
        {/if}
      </div>
      
      <div class="profile-image-actions">
        <div class="file-upload">
          <input 
            type="file" 
            id="profileImage" 
            accept="image/jpeg,image/png,image/gif" 
            on:change={handleImageSelect}
            class="file-input"
            disabled={imageLoading}
          />
          <label for="profileImage" class="btn btn-outline" class:disabled={imageLoading}>
            {imageLoading ? 'Uploading...' : (profileImage ? 'Change Picture' : 'Upload Picture')}
          </label>
        </div>
        
        {#if profileImage}
          <button class="btn btn-danger" on:click={openDeleteImageModal} disabled={imageLoading}>
            Remove
          </button>
        {/if}
      </div>
      
      {#if imageError}
        <div class="alert alert-error image-alert">
          {imageError}
        </div>
      {/if}
      
      {#if imageSuccess}
        <div class="alert alert-success image-alert">
          Profile image updated successfully!
        </div>
      {/if}
    </div>
    
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">User Information</h2>
      </div>
      
      <div class="card-body">
        {#if error}
          <div class="alert alert-error">
            {error}
          </div>
        {/if}
        
        {#if updateSuccess}
          <div class="alert alert-success">
            Profile updated successfully!
          </div>
        {/if}
        
        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-group">
            <label for="username" class="form-label">Username</label>
            <input
              type="text"
              id="username"
              class="form-control"
              value={$user?.username || ''}
              disabled
            />
            <div class="form-hint">Username cannot be changed</div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="firstName" class="form-label">First Name</label>
              <input
                type="text"
                id="firstName"
                class="form-control"
                bind:value={firstName}
                disabled={loading}
                required
              />
            </div>
            
            <div class="form-group">
              <label for="lastName" class="form-label">Last Name</label>
              <input
                type="text"
                id="lastName"
                class="form-control"
                bind:value={lastName}
                disabled={loading}
                required
              />
            </div>
          </div>
          
          <div class="form-group">
            <label for="preferredName" class="form-label">Preferred Name</label>
            <input
              type="text"
              id="preferredName"
              class="form-control"
              bind:value={preferredName}
              disabled={loading}
              placeholder="How you prefer to be addressed"
            />
            <div class="form-hint">Leave blank to use your full name</div>
          </div>
          
          <div class="form-group">
            <label for="email" class="form-label">Email</label>
            <input
              type="email"
              id="email"
              class="form-control"
              bind:value={email}
              disabled={loading}
              required
            />
          </div>
          
          <div class="form-group">
            <label for="role" class="form-label">Role</label>
            <input
              type="text"
              id="role"
              class="form-control"
              value={$user?.role || ''}
              disabled
            />
            <div class="form-hint">Role can only be changed by an administrator</div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
          <div class="password-section">
            <button 
              type="button"
              class="btn btn-secondary"
              on:click={() => changePassword = !changePassword}
            >
              {changePassword ? 'Cancel Password Change' : 'Change Password'}
            </button>
            
            {#if changePassword}
              <div class="form-group">
                <label for="currentPassword" class="form-label">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  class="form-control"
                  bind:value={currentPassword}
                  disabled={loading}
                />
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="newPassword" class="form-label">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    class="form-control"
                    bind:value={newPassword}
                    disabled={loading}
                  />
                </div>
                
                <div class="form-group">
                  <label for="confirmPassword" class="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    class="form-control"
                    bind:value={confirmPassword}
                    disabled={loading}
                  />
                </div>
              </div>
            {/if}
          </div>
        </form>
      </div>
    </div>
  </div>
  
  <!-- Delete Image Confirmation Modal -->
  {#if showDeleteImageModal}
    <div class="modal-overlay">
      <div class="modal modal-small">
        <div class="modal-header">
          <h2>Confirm Removal</h2>
          <button class="close-btn" on:click={closeDeleteImageModal}>&times;</button>
        </div>
        
        <div class="modal-body">
          <p>Are you sure you want to remove your profile picture?</p>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" on:click={closeDeleteImageModal}>
              Cancel
            </button>
            <button type="button" class="btn btn-danger" on:click={deleteProfileImage}>
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .profile-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }
  
  .profile-header {
    margin-bottom: 1.5rem;
  }
  
  .profile-tabs {
    display: flex;
    margin-top: 1rem;
    border-bottom: 1px solid #eee;
  }
  
  .tab {
    padding: 0.75rem 1.5rem;
    text-decoration: none;
    color: #666;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  
  .tab:hover {
    color: #333;
  }
  
  .tab.active {
    color: #007bff;
    border-bottom: 2px solid #007bff;
  }
  
  .profile-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .profile-image-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem;
    background: white;
    border: 1px solid #eee;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .profile-image-wrapper {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: 1rem;
    border: 3px solid #f0f0f0;
  }
  
  .profile-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .profile-placeholder {
    width: 100%;
    height: 100%;
    background: #e9ecef;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    font-weight: bold;
    color: #6c757d;
  }
  
  .profile-image-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .file-upload {
    position: relative;
  }
  
  .file-input {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    width: 0.1px;
    height: 0.1px;
    overflow: hidden;
  }
  
  .image-alert {
    margin-top: 1rem;
    width: 100%;
    max-width: 400px;
  }
  
  .card {
    border: 1px solid #eee;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .card-header {
    padding: 1rem;
    background: #f9f9f9;
    border-bottom: 1px solid #eee;
  }
  
  .card-title {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .card-body {
    padding: 1.5rem;
  }
  
  .form-row {
    display: flex;
    gap: 1rem;
  }
  
  .form-row .form-group {
    flex: 1;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .form-control {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .form-hint {
    font-size: 0.8rem;
    color: #666;
    margin-top: 0.25rem;
  }
  
  .form-actions {
    margin-top: 1.5rem;
  }
  
  .password-section {
    margin: 1.5rem 0;
    padding-top: 1rem;
    border-top: 1px solid #eee;
  }
  
  .alert {
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    border-radius: 4px;
  }
  
  .alert-error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  .alert-success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .btn-outline {
    background-color: transparent;
    border: 1px solid #6c757d;
    color: #6c757d;
  }
  
  .btn-outline:hover {
    background-color: #f8f9fa;
  }
  
  .btn-primary {
    background-color: #007bff;
    color: white;
  }
  
  .btn-primary:hover {
    background-color: #0069d9;
  }
  
  .btn-primary:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
  
  .btn-secondary {
    background-color: #6c757d;
    color: white;
  }
  
  .btn-secondary:hover {
    background-color: #5a6268;
  }
  
  .btn-danger {
    background-color: #dc3545;
    color: white;
  }
  
  .btn-danger:hover {
    background-color: #c82333;
  }
  
  @media (max-width: 576px) {
    .form-row {
      flex-direction: column;
      gap: 0;
    }
    
    .profile-image-wrapper {
      width: 120px;
      height: 120px;
    }
    
    .profile-image-actions {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
  
  /* Add modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal-small {
    max-width: 400px;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }
  
  /* Add a disabled class for file upload label */
  .disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style> 