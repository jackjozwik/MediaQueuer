<!-- src/lib/components/ProfileUpload.svelte -->
<script>
    import { onMount } from 'svelte';
    import { user, token } from '$lib/auth';
    
    let profileImage = null;
    let previewUrl = null;
    let uploading = false;
    let error = null;
    let success = null;
    
    // Initialize with user's existing profile image
    $: currentProfileImage = $user && $user.profileImage ? $user.profileImage : null;
    
    // Handle file selection
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
    
    // Handle form submission
    async function handleSubmit() {
      if (!profileImage) {
        error = 'Please select an image to upload';
        return;
      }
      
      error = null;
      success = null;
      uploading = true;
      
      // Create form data
      const formData = new FormData();
      formData.append('profileImage', profileImage);
      
      try {
        // Upload the file
        const response = await fetch('/api/auth/update-profile-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${$token}`
          },
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          success = 'Profile image updated successfully';
          
          // Update user store with new profile image
          user.update(u => ({
            ...u,
            profileImage: result.data.profileImage
          }));
          
          // Update current profile image
          currentProfileImage = result.data.profileImage;
          
          // Clear selected file
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
      return () => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    });
  </script>
  
  <div class="profile-upload-container">
    <h3>Profile Photo</h3>
    
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
      {:else if currentProfileImage}
        <img src={currentProfileImage} alt="Current profile" class="preview-image" />
      {:else}
        <div class="placeholder-image">
          <span>{$user ? ($user.firstName ? $user.firstName.charAt(0) : 'U') : 'U'}</span>
        </div>
      {/if}
    </div>
    
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="profile-image">Select Image:</label>
        <input 
          type="file" 
          id="profile-image" 
          accept="image/*" 
          on:change={handleFileChange}
          disabled={uploading}
        />
        <div class="help-text">Recommended: Square image, 500x500 pixels</div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn primary" disabled={uploading || !profileImage}>
          {#if uploading}
            Uploading...
          {:else}
            Upload Photo
          {/if}
        </button>
        
        {#if previewUrl}
          <button 
            type="button" 
            class="btn secondary" 
            on:click={() => { 
              profileImage = null; 
              URL.revokeObjectURL(previewUrl);
              previewUrl = null;
            }}
            disabled={uploading}
          >
            Cancel
          </button>
        {/if}
      </div>
    </form>
  </div>
  
  <style>
    .profile-upload-container {
      max-width: 400px;
      padding: 1rem;
      background-color: #f9f9f9;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    
    h3 {
      margin-top: 0;
      margin-bottom: 1rem;
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
    
    .profile-preview {
      width: 150px;
      height: 150px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid #ddd;
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
      font-size: 4rem;
      font-weight: bold;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    .help-text {
      font-size: 0.85rem;
      color: #666;
      margin-top: 0.25rem;
    }
    
    .form-actions {
      display: flex;
      gap: 1rem;
    }
    
    .btn {
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
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
  </style>