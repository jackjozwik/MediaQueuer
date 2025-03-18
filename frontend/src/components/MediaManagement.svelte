<!-- src/components/MediaManagement.svelte -->
<script>
    import { onMount } from 'svelte';
    
    // Props
    export let token;
    
    // State
    let approvedMedia = [];
    let loading = true;
    let error = '';
    let success = '';
    
    // Load approved media
    onMount(async () => {
      await loadApprovedMedia();
    });
    
    async function loadApprovedMedia() {
      loading = true;
      error = '';
      
      try {
        const response = await fetch('/api/media/approved');
        const data = await response.json();
        
        if (!data.success) {
          error = data.message || 'Failed to load media';
          return;
        }
        
        approvedMedia = data.data.media;
      } catch (err) {
        error = 'Server error. Please try again.';
        console.error('Load error:', err);
      } finally {
        loading = false;
      }
    }
    
    // Delete media
    async function deleteMedia(id) {
      if (!confirm('Are you sure you want to delete this media? This cannot be undone.')) {
        return;
      }
      
      error = '';
      success = '';
      
      try {
        const response = await fetch(`/api/media/delete/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (!data.success) {
          error = data.message || 'Failed to delete media';
          return;
        }
        
        success = 'Media deleted successfully';
        
        // Remove from list
        approvedMedia = approvedMedia.filter(item => item.id !== id);
      } catch (err) {
        error = 'Server error. Please try again.';
        console.error('Delete error:', err);
      }
    }
    
    // Update media duration
    async function updateMediaDuration(id, duration) {
      if (!duration || isNaN(duration) || parseInt(duration) <= 0) {
        alert('Please enter a valid duration');
        return;
      }
      
      error = '';
      success = '';
      
      try {
        const response = await fetch(`/api/media/update/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ duration: parseInt(duration) })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          error = data.message || 'Failed to update media';
          return;
        }
        
        success = 'Media updated successfully';
        
        // Update local state
        approvedMedia = approvedMedia.map(item => {
          if (item.id === id) {
            return { ...item, duration: parseInt(duration) };
          }
          return item;
        });
      } catch (err) {
        error = 'Server error. Please try again.';
        console.error('Update error:', err);
      }
    }
  </script>
  
  <div class="media-management">
    <h2>Approved Content Management</h2>
    
    <button class="refresh" on:click={loadApprovedMedia} disabled={loading}>
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
    {:else if approvedMedia.length === 0}
      <div class="empty">No approved media found.</div>
    {:else}
      <div class="media-table-container">
        <table class="media-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Title</th>
              <th>Type</th>
              <th>Uploaded By</th>
              <th>Approval Date</th>
              <th>Settings</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each approvedMedia as media (media.id)}
              <tr>
                <td class="preview-cell">
                  {#if media.file_type === 'image'}
                    <img src={media.file_url} alt={media.title} />
                  {:else if media.file_type === 'video'}
                    <video src={media.file_url} muted></video>
                  {/if}
                </td>
                <td>{media.title}</td>
                <td>{media.file_type}</td>
                <td>{media.uploaded_by}</td>
                <td>{new Date(media.approved_at).toLocaleString()}</td>
                <td>
                  {#if media.file_type === 'image'}
                    <div class="duration-control">
                      <input 
                        type="number" 
                        value={media.duration || 10} 
                        min="1" 
                        max="60"
                        id={`duration-${media.id}`}
                      />
                      <button 
                        on:click={() => updateMediaDuration(
                          media.id, 
                          document.getElementById(`duration-${media.id}`).value
                        )}
                      >
                        Update
                      </button>
                    </div>
                  {:else}
                    <span>N/A</span>
                  {/if}
                </td>
                <td>
                  <button class="delete" on:click={() => deleteMedia(media.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
  
  <style>
    .media-management {
      margin-top: 2rem;
      padding: 1rem;
      background-color: white;
      border-radius: 8px;
      border: 1px solid #ddd;
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
    
    .media-table-container {
      overflow-x: auto;
    }
    
    .media-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    
    .media-table th, .media-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    .media-table th {
      background-color: #f9fafb;
      font-weight: bold;
    }
    
    .preview-cell {
      width: 100px;
    }
    
    .preview-cell img, .preview-cell video {
      width: 100px;
      height: 60px;
      object-fit: cover;
      border-radius: 4px;
    }
    
    .duration-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .duration-control input {
      width: 60px;
      padding: 0.25rem;
    }
    
    .duration-control button {
      background-color: #4b5563;
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      cursor: pointer;
    }
    
    button.delete {
      background-color: #ef4444;
      color: white;
      border: none;
      padding: 0.5rem;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>