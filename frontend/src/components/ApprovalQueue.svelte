<!-- src/components/ApprovalQueue.svelte -->
<script>
  import { onMount } from 'svelte';
  
  // Props
  export let token;
  
  // State
  let pendingMedia = [];
  let loading = true;
  let error = '';
  let success = '';
  
  // Load pending media
  onMount(async () => {
    await loadPendingMedia();
  });
  
  async function loadPendingMedia() {
    loading = true;
    error = '';
    
    try {
      const response = await fetch('/api/media/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        error = data.message || 'Failed to load pending media';
        return;
      }
      
      pendingMedia = data.data.media;
    } catch (err) {
      error = 'Server error. Please try again.';
      console.error('Load error:', err);
    } finally {
      loading = false;
    }
  }
  
  // Approve media
  async function approveMedia(id) {
    error = '';
    success = '';
    
    try {
      const response = await fetch(`/api/media/approve/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        error = data.message || 'Failed to approve media';
        return;
      }
      
      success = 'Media approved successfully';
      
      // Remove from list
      pendingMedia = pendingMedia.filter(item => item.id !== id);
    } catch (err) {
      error = 'Server error. Please try again.';
      console.error('Approval error:', err);
    }
  }
  
  // Reject media
  async function rejectMedia(id) {
    if (!confirm('Are you sure you want to reject this media? This will delete the file.')) {
      return;
    }
    
    error = '';
    success = '';
    
    try {
      const response = await fetch(`/api/media/reject/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        error = data.message || 'Failed to reject media';
        return;
      }
      
      success = 'Media rejected successfully';
      
      // Remove from list
      pendingMedia = pendingMedia.filter(item => item.id !== id);
    } catch (err) {
      error = 'Server error. Please try again.';
      console.error('Rejection error:', err);
    }
  }
</script>

<div class="approval-queue">
  <h2>Approval Queue</h2>
  
  <button class="refresh" on:click={loadPendingMedia} disabled={loading}>
    Refresh
  </button>
  
  {#if error}
    <div class="error">{error}</div>
  {/if}
  
  {#if success}
    <div class="success">{success}</div>
  {/if}
  
  {#if loading}
    <div class="loading">Loading...</div>
  {:else if pendingMedia.length === 0}
    <div class="empty">No pending media to approve.</div>
  {:else}
    <div class="media-grid">
      {#each pendingMedia as media (media.id)}
        <div class="media-card">
          <div class="preview">
            {#if media.file_type === 'image'}
              <img src={media.file_url} alt={media.title} />
            {:else if media.file_type === 'video'}
              <video src={media.file_url} controls></video>
            {/if}
          </div>
          
          <div class="details">
            <h3>{media.title}</h3>
            {#if media.description}
              <p>{media.description}</p>
            {/if}
            <p class="small">
              Uploaded by {media.uploaded_by} 
              on {new Date(media.created_at).toLocaleString()}
            </p>
            {#if media.file_type === 'image'}
              <p class="small">
                Duration: {media.duration || 10} seconds
              </p>
            {/if}
          </div>
          
          <div class="actions">
            <button 
              class="approve" 
              on:click={() => approveMedia(media.id)}
            >
              Approve
            </button>
            <button 
              class="reject" 
              on:click={() => rejectMedia(media.id)}
            >
              Reject
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .approval-queue {
    padding: 1rem;
  }
  
  h2 {
    margin-top: 0;
    display: inline-block;
  }
  
  .refresh {
    float: right;
    background-color: #3182ce;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .error {
    background-color: #fed7d7;
    color: #c53030;
    padding: 0.75rem;
    border-radius: 4px;
    margin: 1rem 0;
  }
  
  .success {
    background-color: #c6f6d5;
    color: #2f855a;
    padding: 0.75rem;
    border-radius: 4px;
    margin: 1rem 0;
  }
  
  .loading, .empty {
    padding: 2rem;
    text-align: center;
    color: #666;
  }
  
  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .media-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    background-color: white;
  }
  
  .preview {
    width: 100%;
    height: 200px;
    overflow: hidden;
    background-color: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .preview img, .preview video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  
  .details {
    padding: 1rem;
  }
  
  .details h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
  }
  
  .details p {
    margin: 0.5rem 0;
  }
  
  .small {
    font-size: 0.8rem;
    color: #666;
  }
  
  .actions {
    display: flex;
    border-top: 1px solid #ddd;
  }
  
  .actions button {
    flex: 1;
    padding: 0.75rem;
    border: none;
    font-weight: bold;
    cursor: pointer;
  }
  
  .actions button.approve {
    background-color: #48bb78;
    color: white;
  }
  
  .actions button.reject {
    background-color: #f56565;
    color: white;
  }
</style>