<!-- src/routes/profile/uploads/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { user, token } from '$lib/auth';
  
  let uploads = [];
  let loading = true;
  let error = null;
  let successMessage = null;
  
  // Edit modal state
  let showEditModal = false;
  let editingMedia = null;
  let editTitle = '';
  let editDescription = '';
  
  // Delete confirmation modal state  
  let showDeleteModal = false;
  let deleteMediaId = null;
  
  // Fetch all uploads for the current user
  async function fetchUserUploads() {
    loading = true;
    error = null;
    
    try {
      const response = await fetch('/api/media/user-uploads', {
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        uploads = result.data.media;
      } else {
        error = result.message || 'Failed to fetch uploads';
      }
    } catch (err) {
      console.error('Error fetching user uploads:', err);
      error = 'An unexpected error occurred. Please try again.';
    } finally {
      loading = false;
    }
  }
  
  onMount(fetchUserUploads);
  
  // Open edit modal for a media item
  function openEditModal(media) {
    editingMedia = media;
    editTitle = media.title;
    editDescription = media.description || '';
    showEditModal = true;
  }
  
  // Close edit modal
  function closeEditModal() {
    showEditModal = false;
    editingMedia = null;
    editTitle = '';
    editDescription = '';
  }
  
  // Handle media update
  async function handleUpdateMedia() {
    if (!editTitle) {
      error = 'Title is required';
      return;
    }
    
    error = null;
    successMessage = null;
    
    try {
      const response = await fetch(`/api/media/${editingMedia.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${$token}`
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update the media in the local list
        uploads = uploads.map(item => 
          item.id === editingMedia.id ? result.data.media : item
        );
        
        successMessage = result.message;
        closeEditModal();
      } else {
        error = result.message || 'Failed to update media';
      }
    } catch (err) {
      console.error('Error updating media:', err);
      error = 'An unexpected error occurred. Please try again.';
    }
  }
  
  // Open delete confirmation modal
  function openDeleteModal(mediaId) {
    deleteMediaId = mediaId;
    showDeleteModal = true;
  }
  
  // Close delete confirmation modal
  function closeDeleteModal() {
    showDeleteModal = false;
    deleteMediaId = null;
  }
  
  // Handle media deletion
  async function handleDeleteMedia() {
    error = null;
    successMessage = null;
    
    try {
      const response = await fetch(`/api/media/${deleteMediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Remove the deleted media from the local list
        uploads = uploads.filter(item => item.id !== deleteMediaId);
        
        successMessage = result.message;
        closeDeleteModal();
      } else {
        error = result.message || 'Failed to delete media';
      }
    } catch (err) {
      console.error('Error deleting media:', err);
      error = 'An unexpected error occurred. Please try again.';
    }
  }
  
  // Helper function to format date
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
  
  // Get status badge class
  function getStatusClass(status) {
    switch (status) {
      case 'approved': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'rejected': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }
</script>

<div class="uploads-page">
  <div class="profile-header">
    <h1>My Profile</h1>
    <div class="profile-tabs">
      <a href="/profile" class="tab">Profile Information</a>
      <a href="/profile/uploads" class="tab active">My Uploads</a>
    </div>
  </div>
  
  <div class="page-header">
    <h2>My Uploads</h2>
    <a href="/upload" class="btn btn-primary">Upload New Media</a>
  </div>
  
  {#if error}
    <div class="alert alert-error">
      {error}
    </div>
  {/if}
  
  {#if successMessage}
    <div class="alert alert-success">
      {successMessage}
    </div>
  {/if}
  
  {#if loading}
    <div class="loading">Loading your uploads...</div>
  {:else if uploads.length === 0}
    <div class="empty-state">
      <p>You haven't uploaded any media yet.</p>
      <a href="/upload" class="btn btn-primary">Upload Your First Media</a>
    </div>
  {:else}
    <div class="uploads-list">
      {#each uploads as media (media.id)}
        <div class="media-item">
          <div class="media-preview">
            {#if media.file_path.endsWith('.mp4') || media.file_path.endsWith('.mov')}
              <video src={media.file_url} controls></video>
            {:else if media.file_path.endsWith('.jpg') || media.file_path.endsWith('.jpeg') || media.file_path.endsWith('.png')}
              <img src={media.file_url} alt={media.title} />
            {:else}
              <div class="file-icon">
                <span class="file-extension">{media.file_path.split('.').pop()}</span>
              </div>
            {/if}
          </div>
          
          <div class="media-info">
            <h3 class="media-title">{media.title}</h3>
            <div class="media-meta">
              <span class={`status-badge ${getStatusClass(media.status)}`}>
                {media.status.charAt(0).toUpperCase() + media.status.slice(1)}
              </span>
              <span class="upload-date">Uploaded: {formatDate(media.created_at)}</span>
            </div>
            
            {#if media.description}
              <p class="media-description">{media.description}</p>
            {/if}
            
            <div class="media-actions">
              <button class="btn btn-secondary" on:click={() => openEditModal(media)}>
                Edit
              </button>
              <button class="btn btn-danger" on:click={() => openDeleteModal(media.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <!-- Edit Modal -->
  {#if showEditModal}
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2>Edit Media</h2>
          <button class="close-btn" on:click={closeEditModal}>&times;</button>
        </div>
        
        <div class="modal-body">
          {#if error}
            <div class="alert alert-error">
              {error}
            </div>
          {/if}
          
          <form on:submit|preventDefault={handleUpdateMedia}>
            <div class="form-group">
              <label for="edit-title" class="form-label">Title</label>
              <input 
                type="text" 
                id="edit-title" 
                class="form-control" 
                bind:value={editTitle} 
                required
              />
            </div>
            
            <div class="form-group">
              <label for="edit-description" class="form-label">Description</label>
              <textarea 
                id="edit-description" 
                class="form-control" 
                bind:value={editDescription}
                rows="4"
              ></textarea>
            </div>
            
            <div class="modal-note">
              <strong>Note:</strong> Editing your media will require re-approval before it appears in the display rotation.
            </div>
            
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" on:click={closeEditModal}>
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Delete Confirmation Modal -->
  {#if showDeleteModal}
    <div class="modal-overlay">
      <div class="modal modal-small">
        <div class="modal-header">
          <h2>Confirm Deletion</h2>
          <button class="close-btn" on:click={closeDeleteModal}>&times;</button>
        </div>
        
        <div class="modal-body">
          <p>Are you sure you want to delete this media? This action cannot be undone.</p>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" on:click={closeDeleteModal}>
              Cancel
            </button>
            <button type="button" class="btn btn-danger" on:click={handleDeleteMedia}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .uploads-page {
    max-width: 1200px;
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
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .page-header h2 {
    margin: 0;
  }
  
  .uploads-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .media-item {
    display: flex;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .media-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .media-preview {
    width: 200px;
    height: 150px;
    min-width: 200px;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  
  .media-preview img, 
  .media-preview video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .file-icon {
    width: 80px;
    height: 100px;
    background: #e9ecef;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    position: relative;
  }
  
  .file-extension {
    position: absolute;
    bottom: 10px;
    font-size: 14px;
    font-weight: bold;
    text-transform: uppercase;
  }
  
  .media-info {
    flex: 1;
    padding: 1rem;
    display: flex;
    flex-direction: column;
  }
  
  .media-title {
    margin: 0 0 0.5rem;
    font-size: 1.2rem;
  }
  
  .media-meta {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
  }
  
  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .badge-success {
    background-color: #d4edda;
    color: #155724;
  }
  
  .badge-warning {
    background-color: #fff3cd;
    color: #856404;
  }
  
  .badge-danger {
    background-color: #f8d7da;
    color: #721c24;
  }
  
  .badge-secondary {
    background-color: #e9ecef;
    color: #6c757d;
  }
  
  .media-description {
    margin: 0.75rem 0;
    font-size: 0.9rem;
    color: #666;
    flex-grow: 1;
  }
  
  .media-actions {
    align-self: flex-start;
    display: flex;
    gap: 0.5rem;
    margin-top: auto;
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    background: #f9f9f9;
    border-radius: 8px;
  }
  
  .empty-state p {
    margin-bottom: 1.5rem;
    color: #666;
  }
  
  .loading {
    text-align: center;
    padding: 2rem;
    color: #666;
  }
  
  /* Modal styles */
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
  
  .modal-note {
    background: #fff3cd;
    padding: 0.75rem;
    border-radius: 4px;
    margin: 1rem 0;
    font-size: 0.9rem;
  }
  
  /* Button and form styles */
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }
  
  .btn-primary {
    background-color: #007bff;
    color: white;
  }
  
  .btn-secondary {
    background-color: #6c757d;
    color: white;
  }
  
  .btn-danger {
    background-color: #dc3545;
    color: white;
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
</style> 