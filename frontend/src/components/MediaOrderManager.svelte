<!-- src/components/MediaOrderManager.svelte -->
<script>
    import { onMount } from 'svelte';
    
    // Props
    export let token;
    
    // State
    let mediaItems = [];
    let loading = true;
    let error = '';
    let success = '';
    
    // Load approved media
    onMount(async () => {
      await loadMedia();
    });
    
    async function loadMedia() {
      loading = true;
      error = '';
      
      try {
        const response = await fetch('/api/media/approved');
        const data = await response.json();
        
        if (!data.success) {
          error = data.message || 'Failed to load media';
          return;
        }
        
        // Sort by display_order if available, otherwise by approved_at
        mediaItems = data.data.media.sort((a, b) => {
          if (a.display_order !== null && b.display_order !== null) {
            return a.display_order - b.display_order;
          }
          // Fall back to approval date
          return new Date(b.approved_at) - new Date(a.approved_at);
        });
      } catch (err) {
        error = 'Server error. Please try again.';
        console.error('Load error:', err);
      } finally {
        loading = false;
      }
    }
    
    // Move item up in order
    async function moveUp(index) {
      if (index === 0) return; // Already at the top
      
      // Swap with previous item
      const newItems = [...mediaItems];
      const temp = newItems[index];
      newItems[index] = newItems[index - 1];
      newItems[index - 1] = temp;
      
      // Update order
      await updateOrder(newItems);
    }
    
    // Move item down in order
    async function moveDown(index) {
      if (index === mediaItems.length - 1) return; // Already at the bottom
      
      // Swap with next item
      const newItems = [...mediaItems];
      const temp = newItems[index];
      newItems[index] = newItems[index + 1];
      newItems[index + 1] = temp;
      
      // Update order
      await updateOrder(newItems);
    }
    
    // Update media order
    async function updateOrder(items) {
      error = '';
      success = '';
      
      try {
        // Assign display_order to each item
        const orderUpdates = items.map((item, index) => ({
          id: item.id,
          display_order: index + 1
        }));
        
        // Send update to server
        const response = await fetch('/api/media/order', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ items: orderUpdates })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          error = data.message || 'Failed to update display order';
          return;
        }
        
        success = 'Display order updated';
        mediaItems = items;
      } catch (err) {
        error = 'Server error. Please try again.';
        console.error('Update order error:', err);
      }
    }
    
    // Edit media item
    async function saveEdit(item) {
      error = '';
      success = '';
      
      try {
        const response = await fetch(`/api/media/update/${item.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            title: item.title,
            description: item.description,
            duration: item.file_type === 'image' ? item.duration : null
          })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          error = data.message || 'Failed to update media';
          return;
        }
        
        success = 'Media updated successfully';
        
        // Update local state
        item.editing = false;
      } catch (err) {
        error = 'Server error. Please try again.';
        console.error('Edit error:', err);
      }
    }
    
    // Enable editing mode
    function startEdit(item) {
      // Create backup of original values
      item._original = {
        title: item.title,
        description: item.description,
        duration: item.duration
      };
      
      item.editing = true;
    }
    
    // Cancel editing
    function cancelEdit(item) {
      // Restore original values
      if (item._original) {
        item.title = item._original.title;
        item.description = item._original.description;
        item.duration = item._original.duration;
        delete item._original;
      }
      
      item.editing = false;
    }
  </script>
  
  <div class="media-order-manager">
    <h2>Media Display Order</h2>
    
    <button class="refresh" on:click={loadMedia} disabled={loading}>
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
    {:else if mediaItems.length === 0}
      <div class="empty">No approved media found.</div>
    {:else}
      <div class="order-list">
        {#each mediaItems as item, index (item.id)}
          <div class="media-item" class:editing={item.editing}>
            <div class="item-preview">
              {#if item.file_type === 'image'}
                <img src={item.file_url} alt={item.title} />
              {:else if item.file_type === 'video'}
                <video src={item.file_url} muted></video>
              {/if}
            </div>
            
            <div class="item-details">
              {#if item.editing}
                <div class="edit-form">
                  <div class="form-group">
                    <label for={`title-${item.id}`}>Title:</label>
                    <input 
                      type="text" 
                      class="edit-input"
                      id={`title-${item.id}`}
                      bind:value={item.title}
                      placeholder="Media title"
                      maxlength="50"
                    />
                    <div class="character-count">{item.title.length}/50 characters</div>
                  </div>
                  
                  <div class="form-group">
                    <label for={`desc-${item.id}`}>Description:</label>
                    <textarea 
                      class="edit-input"
                      id={`desc-${item.id}`}
                      bind:value={item.description}
                      placeholder="Media description"
                      rows="3"
                      maxlength="100"
                    ></textarea>
                    <div class="character-count">{item.description.length}/100 characters</div>
                  </div>
                  
                  {#if item.file_type === 'image'}
                    <div class="form-group">
                      <label for={`duration-${item.id}`}>Display Duration (seconds):</label>
                      <input 
                        type="number" 
                        id={`duration-${item.id}`}
                        bind:value={item.duration}
                        min="1"
                        max="60"
                      />
                    </div>
                  {/if}
                  
                  <div class="edit-actions">
                    <button class="cancel" on:click={() => cancelEdit(item)}>
                      Cancel
                    </button>
                    <button class="save" on:click={() => saveEdit(item)}>
                      Save
                    </button>
                  </div>
                </div>
              {:else}
                <div class="item-meta">
                  <h3>{item.title}</h3>
                  {#if item.description}
                    <p class="description">{item.description}</p>
                  {/if}
                  <p class="details">
                    Type: {item.file_type}
                    {#if item.file_type === 'image'}
                      <span>• Duration: {item.duration || 10}s</span>
                    {/if}
                    <span>• By: {item.uploaded_by}</span>
                  </p>
                </div>
                
                <div class="item-actions">
                  <button class="edit" on:click={() => startEdit(item)}>
                    Edit
                  </button>
                </div>
              {/if}
            </div>
            
            <div class="order-controls">
              <button 
                on:click={() => moveUp(index)}
                disabled={index === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <div class="order-number">{index + 1}</div>
              <button 
                on:click={() => moveDown(index)}
                disabled={index === mediaItems.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <style>
    .media-order-manager {
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
    
    .order-list {
      margin-top: 1rem;
    }
    
    .media-item {
      display: flex;
      align-items: center;
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      margin-bottom: 1rem;
      background-color: #f9fafb;
    }
    
    .media-item.editing {
      background-color: #e6f0fd;
    }
    
    .item-preview {
      width: 100px;
      height: 60px;
      overflow: hidden;
      border-radius: 4px;
      margin-right: 1rem;
      flex-shrink: 0;
    }
    
    .item-preview img, .item-preview video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .item-details {
      flex-grow: 1;
    }
    
    .item-meta h3 {
      margin-top: 0;
      margin-bottom: 0.5rem;
    }
    
    .description {
      margin: 0.25rem 0;
      color: #4b5563;
    }
    
    .details {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
      color: #6b7280;
    }
    
    .item-actions {
      margin-top: 0.5rem;
    }
    
    .order-controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-left: 1rem;
      flex-shrink: 0;
    }
    
    .order-controls button {
      background-color: #e5e7eb;
      border: none;
      width: 2rem;
      height: 2rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .order-controls button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .order-number {
      padding: 0.5rem 0;
      font-weight: bold;
    }
    
    .edit-form {
      padding: 0.5rem 0;
    }
    
    .form-group {
      margin-bottom: 0.75rem;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 0.25rem;
      font-weight: 500;
    }
    
    .form-group input, .form-group textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .form-group textarea {
      height: 4rem;
      resize: vertical;
    }
    
    .edit-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    
    button.edit {
      background-color: #3b82f6;
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
    }
    
    button.save {
      background-color: #10b981;
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button.cancel {
      background-color: #6b7280;
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
    }
    
    /* Add character count styles */
    .character-count {
      font-size: 0.8rem;
      color: #666;
      text-align: right;
      margin-top: 0.25rem;
    }
    
    .edit-input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 0.25rem;
    }
  </style>