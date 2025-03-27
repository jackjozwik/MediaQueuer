<!-- 
  MediaModal.svelte - A reusable modal component for displaying media
  Usage:
    <MediaModal 
      bind:show={modalIsVisible}
      media={mediaObject} 
      on:approve={() => handleApprove(media.id)}
      on:reject={() => handleReject(media.id)}
      on:edit={() => handleEdit(media)}
      on:archive={() => handleArchive(media.id)}
      on:restore={() => handleRestore(media.id)}
      on:delete={() => handleDelete(media)}
    />
-->
<script>
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let show = false; // Whether the modal is visible
  export let media = null; // The media object to display
  export let showActions = true; // Whether to show action buttons
  
  // Create event dispatcher
  const dispatch = createEventDispatcher();
  
  // Function to check if media has a QR code
  function hasQrCode(media) {
    if (!media) return false;
    
    // Look for QR code field at the top level
    if (media.qr_code_url && media.qr_code_url.trim() !== '') return true;
    if (media.qr_code && media.qr_code.trim() !== '') return true;
    if (media.qrcode_url && media.qrcode_url.trim() !== '') return true;
    if (media.qrcode && media.qrcode.trim() !== '') return true;
    if (media.qr_code_path && media.qr_code_path.trim() !== '') return true;
    
    // Check all properties for QR code related fields
    for (const key in media) {
      if (typeof media[key] === 'string' && 
          (key.includes('qr') || key.includes('qr_code')) && 
          media[key].trim() !== '') {
        console.log(`Found QR code in property: ${key} = ${media[key]}`);
        return true;
      }
    }
    
    // Check if the QR code is in a nested property
    if (media.metadata) {
      let metadata = media.metadata;
      
      // If metadata is a string, try to parse it as JSON
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.error('Error parsing metadata:', e);
        }
      }
      
      // Check QR fields in metadata
      if (metadata.qr_code_url && metadata.qr_code_url.trim() !== '') return true;
      if (metadata.qr_code && metadata.qr_code.trim() !== '') return true;
      if (metadata.qrcode_url && metadata.qrcode_url.trim() !== '') return true;
      if (metadata.qrcode && metadata.qrcode.trim() !== '') return true;
      
      // Check all properties in metadata
      for (const key in metadata) {
        if (typeof metadata[key] === 'string' && 
            (key.includes('qr') || key.includes('qr_code')) && 
            metadata[key].trim() !== '') {
          console.log(`Found QR code in metadata property: ${key} = ${metadata[key]}`);
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Function to get QR code URL from media object
  function getQrCodeUrl(media) {
    if (!media) return '';
    
    // Look for QR code field at the top level
    if (media.qr_code_url && media.qr_code_url.trim() !== '') return media.qr_code_url;
    if (media.qr_code && media.qr_code.trim() !== '') return media.qr_code;
    if (media.qrcode_url && media.qrcode_url.trim() !== '') return media.qrcode_url;
    if (media.qrcode && media.qrcode.trim() !== '') return media.qrcode;
    if (media.qr_code_path && media.qr_code_path.trim() !== '') return media.qr_code_path;
    
    // Check all properties for QR code related fields
    for (const key in media) {
      if (typeof media[key] === 'string' && 
          (key.includes('qr') || key.includes('qr_code')) && 
          media[key].trim() !== '') {
        return media[key];
      }
    }
    
    // Check if the QR code is in a nested property
    if (media.metadata) {
      let metadata = media.metadata;
      
      // If metadata is a string, try to parse it as JSON
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.error('Error parsing metadata:', e);
          return '';
        }
      }
      
      // Check QR fields in metadata
      if (metadata.qr_code_url && metadata.qr_code_url.trim() !== '') return metadata.qr_code_url;
      if (metadata.qr_code && metadata.qr_code.trim() !== '') return metadata.qr_code;
      if (metadata.qrcode_url && metadata.qrcode_url.trim() !== '') return metadata.qrcode_url;
      if (metadata.qrcode && metadata.qrcode.trim() !== '') return metadata.qrcode;
      
      // Check all properties in metadata
      for (const key in metadata) {
        if (typeof metadata[key] === 'string' && 
            (key.includes('qr') || key.includes('qr_code')) && 
            metadata[key].trim() !== '') {
          return metadata[key];
        }
      }
    }
    
    return '';
  }
  
  // Handle closing the modal
  function closeModal() {
    show = false;
    dispatch('close');
  }
  
  // Handle keyboard events (Escape to close)
  function handleKeydown(event) {
    if (event && event.key === 'Escape' && show) {
      closeModal();
    }
  }
  
  // Add and remove keyboard event listener
  $: if (show) {
    window.addEventListener('keydown', handleKeydown);
  } else {
    window.removeEventListener('keydown', handleKeydown);
  }
</script>

<!-- Svelte component bindings -->
<svelte:window on:keydown={handleKeydown} />

<!-- Modal -->
{#if show && media}
  <div class="modal-overlay" on:click|self={closeModal}>
    <div class="modal-container">
      <div class="modal-header">
        <h2>{media.title || 'Untitled'}</h2>
        <button class="close-btn" on:click={closeModal}>×</button>
      </div>
      
      <!-- Media Preview -->
      <div class="modal-preview">
        {#if media.file_type === 'image' || media.file_type.startsWith('image/')}
          <img src={media.file_url} alt={media.title} />
        {:else if media.file_type === 'video' || media.file_type.startsWith('video/')}
          <video src={media.file_url} controls autoplay></video>
        {:else}
          <div class="unknown-media">{media.file_type}</div>
        {/if}
      </div>
      
      <!-- Media Information -->
      <div class="media-details-container">
        <h3>{media.title || 'Untitled'}</h3>
        <p class="description">{media.description || 'No description'}</p>
        
        <div class="metadata">
          <div class="metadata-item">
            <span class="metadata-label">Type:</span> 
            <span class="metadata-value">{media.file_type}</span>
          </div>
          
          {#if media.file_type === 'image' || media.file_type.startsWith('image/')}
            <div class="metadata-item">
              <span class="metadata-label">Duration:</span> 
              <span class="metadata-value">{media.duration || 10}s</span>
            </div>
          {:else if media.file_type === 'video' || media.file_type.startsWith('video/')}
            <div class="metadata-item">
              <span class="metadata-label">Duration:</span> 
              <span class="metadata-value">{media.duration ? `${media.duration}s` : 'Unknown'}</span>
            </div>
          {/if}
          
          <div class="metadata-item">
            <span class="metadata-label">Uploaded by:</span> 
            <span class="metadata-value">{media.uploaded_by}</span>
          </div>
          
          {#if media.approved_by_username}
            <div class="metadata-item">
              <span class="metadata-label">Approved by:</span> 
              <span class="metadata-value">{media.approved_by_username}</span>
            </div>
          {/if}
          
          {#if media.archived_at}
            <div class="metadata-item">
              <span class="metadata-label">Archived:</span> 
              <span class="metadata-value">{new Date(media.archived_at).toLocaleString()}</span>
            </div>
          {/if}
        </div>
        
        <!-- QR Code Section (if available) -->
        {#if hasQrCode(media)}
          <div class="qr-code-section">
            <h4>QR Code</h4>
            <div class="qr-code-container">
              <img src={getQrCodeUrl(media)} alt="QR Code" class="qr-code-image" />
            </div>
          </div>
        {/if}
        
        <!-- Action Buttons -->
        {#if showActions}
          <div class="modal-actions">
            {#if media.status === 'pending'}
              <button class="approve-btn" on:click={() => dispatch('approve')}>Approve</button>
              <button class="reject-btn" on:click={() => dispatch('reject')}>Reject</button>
            {/if}
            
            <button class="edit-btn" on:click={() => dispatch('edit')}>Edit</button>
            
            {#if media.status === 'approved'}
              <button class="archive-btn" on:click={() => dispatch('archive')}>Archive</button>
              <button class="delete-btn" on:click={() => dispatch('delete')}>Delete</button>
            {/if}
            
            {#if media.status === 'archived'}
              <button class="restore-btn" on:click={() => dispatch('restore')}>Restore</button>
              <button class="delete-btn" on:click={() => dispatch('delete')}>Delete</button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }
  
  .modal-container {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    width: 95%;
    max-width: 1200px;
    max-height: 95vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 0 0 1.5rem 0;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #ddd;
    position: sticky;
    top: 0;
    background-color: white;
    z-index: 1;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #777;
    transition: color 0.2s;
  }
  
  .close-btn:hover {
    color: #333;
  }
  
  .modal-preview {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000;
    width: 100%;
    height: 70vh;
    min-height: 400px;
    margin-bottom: 1.5rem;
  }

  .modal-preview img,
  .modal-preview video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  
  .unknown-media {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    color: white;
    font-size: 1.2rem;
  }
  
  .media-details-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 1.5rem;
  }
  
  .media-details-container h3 {
    margin: 0;
    font-size: 1.4rem;
    color: #333;
  }
  
  .description {
    margin: 0.5rem 0;
    font-size: 1rem;
    line-height: 1.5;
  }
  
  .metadata {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background-color: #f5f5f5;
    padding: 1rem;
    border-radius: 6px;
  }
  
  .metadata-item {
    display: flex;
    font-size: 0.9rem;
  }
  
  .metadata-label {
    font-weight: 600;
    width: 100px;
    color: #555;
  }
  
  .metadata-value {
    color: #333;
  }
  
  .qr-code-section {
    margin-top: 1rem;
    background-color: #f0f4f8;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #d0d9e6;
  }
  
  .qr-code-section h4 {
    margin: 0 0 0.75rem 0;
    color: #2c3e50;
    font-size: 1.1rem;
  }
  
  .qr-code-container {
    display: flex;
    justify-content: center;
    background-color: white;
    padding: 0.75rem;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  
  .qr-code-image {
    max-width: 150px;
    max-height: 150px;
  }
  
  .modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  
  .modal-actions button {
    flex: 1;
    min-width: 100px;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .approve-btn {
    background-color: #43a047;
    color: white;
  }
  
  .reject-btn {
    background-color: #e53935;
    color: white;
  }
  
  .edit-btn {
    background-color: #1976d2;
    color: white;
  }
  
  .delete-btn {
    background-color: #e53935;
    color: white;
  }
  
  .archive-btn {
    background-color: #ff9800;
    color: white;
  }
  
  .restore-btn {
    background-color: #5e35b1;
    color: white;
  }
</style> 