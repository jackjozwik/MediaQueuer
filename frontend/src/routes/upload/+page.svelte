<!-- src/routes/upload/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { token, user } from '$lib/auth';
  
  let file = null;
  let title = '';
  let description = '';
  let duration = 10; // Default duration for images in seconds
  let uploading = false;
  let error = null;
  let success = null;
  let previewUrl = null;
  
  // QR Code variables
  let qrCodeFile = null;
  let qrCodePreviewUrl = null;
  let uploadingQRCode = false;
  
  // Check if user is admin or faculty
  $: isAdminOrFaculty = $user && ($user.role === 'admin' || $user.role === 'faculty');
  
  // Clear form
  function resetForm() {
    file = null;
    title = '';
    description = '';
    duration = 10;
    previewUrl = null;
    qrCodeFile = null;
    qrCodePreviewUrl = null;
  }
  
  // Handle file selection from input
  function handleFileChange(event) {
    const selectedFile = event.target.files[0];
    processFile(selectedFile);
  }
  
  // Handle QR code selection from input
  function handleQRCodeChange(event) {
    const selectedFile = event.target.files[0];
    processQRCode(selectedFile);
  }
  
  // Process the selected QR code
  function processQRCode(selectedFile) {
    if (selectedFile) {
      qrCodeFile = selectedFile;
      
      // Create preview URL
      qrCodePreviewUrl = URL.createObjectURL(selectedFile);
    }
  }
  
  // Process the selected file
  function processFile(selectedFile) {
    if (selectedFile) {
      file = selectedFile;
      
      // Create preview URL
      previewUrl = URL.createObjectURL(selectedFile);
      
      // Auto-fill title from filename (without extension)
      if (!title) {
        const fileName = selectedFile.name;
        title = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      }
    }
  }
  
  // Handle drag over
  function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
  }
  
  // Handle drag leave
  function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
  }
  
  // Handle drop
  function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFile(droppedFiles[0]);
    }
  }
  
  // Upload QR code for media item
  async function uploadQRCode(mediaId) {
    if (!qrCodeFile) return true; // Return true if no QR code to upload
    
    try {
      uploadingQRCode = true;
      
      const formData = new FormData();
      formData.append('qrCode', qrCodeFile);
      
      const response = await fetch(`/api/media/${mediaId}/qrcode`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('QR code upload failed:', result.message);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('QR code upload error:', err);
      return false;
    } finally {
      uploadingQRCode = false;
    }
  }
  
  // Handle form submission
  async function handleSubmit() {
    if (!file) {
      error = 'Please select a file to upload';
      return;
    }
    
    if (!title) {
      error = 'Please enter a title';
      return;
    }
    
    error = null;
    success = null;
    uploading = true;
    
    // Create form data
    const formData = new FormData();
    formData.append('media', file);
    formData.append('title', title);
    formData.append('description', description);
    
    // Only append duration for images
    if (file.type.startsWith('image/')) {
      formData.append('duration', duration);
    }
    
    try {
      // Upload the file
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        // If media upload successful and QR code was provided, upload that too
        if (qrCodeFile && result.data && result.data.id) {
          const qrSuccess = await uploadQRCode(result.data.id);
          
          if (qrSuccess) {
            success = 'Media and QR code uploaded successfully';
          } else {
            success = 'Media uploaded but QR code failed to upload';
          }
        } else {
          success = result.message || 'Media uploaded successfully';
        }
        
        resetForm();
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
  
  // Clear QR code
  function clearQRCode() {
    qrCodeFile = null;
    if (qrCodePreviewUrl) {
      URL.revokeObjectURL(qrCodePreviewUrl);
      qrCodePreviewUrl = null;
    }
  }
  
  // Clean up preview URLs on unmount
  onMount(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (qrCodePreviewUrl) {
        URL.revokeObjectURL(qrCodePreviewUrl);
      }
    };
  });
  
  // Derived values
  $: isImage = file && file.type.startsWith('image/');
  $: isVideo = file && file.type.startsWith('video/');
</script>

<svelte:head>
  <title>Upload Media - TV Media Queuer</title>
</svelte:head>

<div class="upload-container">
  <div class="upload-card">
    <h1>Upload Media</h1>
    <p class="subtitle">Upload content to be displayed on the hallway TVs</p>
    
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
    
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="file">Select or Drop File:</label>
        <div 
          class="drop-zone" 
          on:dragover={handleDragOver} 
          on:dragleave={handleDragLeave} 
          on:drop={handleDrop}
        >
          <input 
            type="file" 
            id="file" 
            accept="image/*,video/*" 
            on:change={handleFileChange}
            disabled={uploading}
            class="file-input"
          />
          <div class="drop-message">
            <div class="icon">📁</div>
            <p>Drag and drop your file here or click to select</p>
          </div>
        </div>
        <div class="help-text">Supported formats: Images (JPG, PNG, GIF) and Videos (MP4, WebM)</div>
      </div>
      
      {#if previewUrl}
        <div class="preview">
          {#if isImage}
            <img src={previewUrl} alt="Preview" />
          {:else if isVideo}
            <video src={previewUrl} controls muted></video>
          {/if}
        </div>
      {/if}
      
      <div class="form-group">
        <label for="title">Title:</label>
        <input 
          type="text" 
          id="title" 
          bind:value={title} 
          required
          disabled={uploading}
        />
      </div>
      
      <div class="form-group">
        <label for="description">Description (optional):</label>
        <textarea 
          id="description" 
          bind:value={description}
          rows="3"
          disabled={uploading}
        ></textarea>
      </div>
      
      {#if isImage && isAdminOrFaculty}
        <div class="form-group">
          <label for="duration">Display Duration (seconds):</label>
          <input 
            type="number" 
            id="duration" 
            bind:value={duration} 
            min="1" 
            max="60"
            disabled={uploading}
          />
          <div class="help-text">How long to display this image before moving to the next item</div>
        </div>
      {/if}
      
      <!-- QR Code Section -->
      <div class="form-group qr-code-section">
        <label for="qrCode">QR Code (Optional):</label>
        <div class="qr-code-container">
          <div class="qr-code-preview-area">
            {#if qrCodePreviewUrl}
              <img src={qrCodePreviewUrl} alt="QR Code Preview" class="qr-code-preview" />
            {:else}
              <div class="qr-code-placeholder">
                <div class="icon">🔗</div>
                <p>No QR code selected</p>
              </div>
            {/if}
          </div>
          
          <div class="qr-code-controls">
            <input 
              type="file" 
              id="qrCode" 
              accept="image/*" 
              on:change={handleQRCodeChange}
              disabled={uploading}
              class="qr-file-input"
              style="display: none;"
            />
            <button 
              type="button" 
              class="btn secondary qr-button" 
              on:click={() => document.getElementById('qrCode').click()} 
              disabled={uploading}
            >
              Select QR Code
            </button>
            
            {#if qrCodeFile}
              <button 
                type="button" 
                class="btn clear-button" 
                on:click={clearQRCode} 
                disabled={uploading}
              >
                Clear
              </button>
            {/if}
          </div>
        </div>
        <div class="help-text">
          Upload a QR code to link to your portfolio, website, or social media. This will be displayed alongside your content.
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn primary" disabled={uploading}>
          {#if uploading}
            Uploading...
          {:else}
            Upload Media
          {/if}
        </button>
        <button type="button" class="btn secondary" on:click={resetForm} disabled={uploading}>
          Clear Form
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .upload-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }
  
  .upload-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 2rem;
  }
  
  h1 {
    margin-top: 0;
    color: #333;
  }
  
  .subtitle {
    color: #666;
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  input[type="text"],
  input[type="number"],
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  .drop-zone {
    border: 2px dashed #ddd;
    border-radius: 4px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.3s, background-color 0.3s;
    position: relative;
  }
  
  .drop-zone:hover {
    border-color: #1976d2;
    background-color: rgba(25, 118, 210, 0.05);
  }
  
  .drop-zone.dragover {
    border-color: #1976d2;
    background-color: rgba(25, 118, 210, 0.1);
  }
  
  .file-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  
  .drop-message {
    pointer-events: none;
  }
  
  .drop-message .icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: #777;
  }
  
  .drop-message p {
    margin: 0;
    color: #666;
    font-size: 1rem;
  }
  
  .help-text {
    font-size: 0.85rem;
    color: #666;
    margin-top: 0.25rem;
  }
  
  .preview {
    margin: 1rem 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1rem;
    background-color: #f9f9f9;
    display: flex;
    justify-content: center;
  }
  
  .preview img, .preview video {
    max-width: 100%;
    max-height: 300px;
  }
  
  .alert {
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
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
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
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
  
  .clear-button {
    background-color: transparent;
    color: #d32f2f;
    border: 1px solid #d32f2f;
  }
  
  .clear-button:hover:not(:disabled) {
    background-color: rgba(211, 47, 47, 0.1);
  }
  
  /* QR Code styles */
  .qr-code-section {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #eee;
  }
  
  .qr-code-container {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  .qr-code-preview-area {
    width: 120px;
    height: 120px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  
  .qr-code-preview {
    max-width: 100%;
    max-height: 100%;
  }
  
  .qr-code-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #f9f9f9;
    color: #666;
  }
  
  .qr-code-placeholder .icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  
  .qr-code-placeholder p {
    margin: 0;
    font-size: 0.8rem;
    text-align: center;
  }
  
  .qr-code-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .qr-button {
    white-space: nowrap;
  }
</style>