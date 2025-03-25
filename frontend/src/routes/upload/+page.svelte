<!-- src/routes/upload/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { token, user } from '$lib/auth';
  
  let file = null;
  let title = '';
  let description = '';
  let uploading = false;
  let error = null;
  let success = null;
  let previewUrl = null;
  
  // Character limits
  const TITLE_MAX_LENGTH = 50;
  const DESCRIPTION_MAX_LENGTH = 100;
  
  // QR Code variables
  let qrCodeFile = null;
  let qrCodePreviewUrl = null;
  let uploadingQRCode = false;
  
  // Derived values
  $: titleCharactersLeft = TITLE_MAX_LENGTH - title.length;
  $: descriptionCharactersLeft = DESCRIPTION_MAX_LENGTH - description.length;
  $: titleExceeded = titleCharactersLeft < 0;
  $: descriptionExceeded = descriptionCharactersLeft < 0;
  
  // Check if user is admin or faculty
  $: isAdminOrFaculty = $user && ($user.role === 'admin' || $user.role === 'faculty');
  
  // Clear form
  function resetForm() {
    file = null;
    title = '';
    description = '';
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
    
    if (titleExceeded) {
      error = `Title exceeds maximum length of ${TITLE_MAX_LENGTH} characters`;
      return;
    }
    
    if (descriptionExceeded) {
      error = `Description exceeds maximum length of ${DESCRIPTION_MAX_LENGTH} characters`;
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
  <div class="card upload-card">
    <div class="card-header">
      <h1>Upload Media</h1>
      <p class="subtitle">Upload content to be displayed on the hallway TVs</p>
    </div>
    
    {#if error}
      <div class="alert alert-error">
        {error}
      </div>
    {/if}
    
    {#if success}
      <div class="alert alert-success">
        {success}
      </div>
    {/if}
    
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="file">Select or Drop File</label>
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
            <div class="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
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
        <label for="title">Title</label>
        <input 
          type="text" 
          id="title" 
          bind:value={title}
          disabled={uploading}
          maxlength={TITLE_MAX_LENGTH}
          required
        />
        <div class="character-counter {titleExceeded ? 'exceeded' : ''}">
          {titleCharactersLeft} characters left
        </div>
      </div>
      
      <div class="form-group">
        <label for="description">Description (optional)</label>
        <textarea 
          id="description" 
          bind:value={description}
          rows="3"
          disabled={uploading}
          maxlength={DESCRIPTION_MAX_LENGTH}
        ></textarea>
        <div class="character-counter {descriptionExceeded ? 'exceeded' : ''}">
          {descriptionCharactersLeft} characters left
        </div>
      </div>
      
      <!-- QR Code Section -->
      <div class="form-group qr-code-section">
        <h2 class="section-title">QR Code (Optional)</h2>
        <div class="qr-code-container">
          <div class="qr-code-preview-area">
            {#if qrCodePreviewUrl}
              <img src={qrCodePreviewUrl} alt="QR Code Preview" class="qr-code-preview" />
            {:else}
              <div class="qr-code-placeholder">
                <div class="icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <rect x="7" y="7" width="3" height="3"></rect>
                    <rect x="14" y="7" width="3" height="3"></rect>
                    <rect x="7" y="14" width="3" height="3"></rect>
                    <rect x="14" y="14" width="3" height="3"></rect>
                  </svg>
                </div>
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
              class="btn-secondary qr-button" 
              on:click={() => document.getElementById('qrCode').click()} 
              disabled={uploading}
            >
              Select QR Code
            </button>
            
            {#if qrCodeFile}
              <button 
                type="button" 
                class="btn-outline btn-danger" 
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
        <button type="submit" class="btn-primary" disabled={uploading}>
          {#if uploading}
            <span class="loading-spinner"></span>
            Uploading...
          {:else}
            Upload Media
          {/if}
        </button>
        <button type="button" class="btn-secondary" on:click={resetForm} disabled={uploading}>
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
  }
  
  .upload-card {
    padding: var(--space-6);
  }
  
  .card-header {
    margin-bottom: var(--space-6);
  }
  
  h1 {
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
  }
  
  .subtitle {
    color: var(--color-text-secondary);
  }
  
  .form-group {
    margin-bottom: var(--space-5);
  }
  
  label {
    display: block;
    margin-bottom: var(--space-2);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }
  
  input[type="text"],
  input[type="number"],
  textarea {
    width: 100%;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    background-color: var(--color-background);
    color: var(--color-text-primary);
    transition: var(--transition-all);
  }
  
  input[type="text"]:focus,
  input[type="number"]:focus,
  textarea:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  }
  
  .drop-zone {
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-8);
    text-align: center;
    cursor: pointer;
    transition: var(--transition-all);
    position: relative;
    background-color: var(--color-surface);
  }
  
  .drop-zone:hover {
    border-color: var(--color-primary);
    background-color: var(--color-surface-hover);
  }
  
  .drop-zone.dragover {
    border-color: var(--color-primary);
    background-color: var(--color-surface-hover);
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
    margin-bottom: var(--space-2);
    color: var(--color-text-tertiary);
  }
  
  .drop-message p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
  }
  
  .help-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-tertiary);
    margin-top: var(--space-1);
  }
  
  .preview {
    margin: var(--space-4) 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    background-color: var(--color-surface);
    display: flex;
    justify-content: center;
  }
  
  .preview img, .preview video {
    max-width: 100%;
    max-height: 300px;
    border-radius: var(--radius-sm);
  }
  
  .section-title {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-3);
    color: var(--color-text-primary);
  }
  
  /* QR Code styles */
  .qr-code-section {
    margin-top: var(--space-6);
    padding-top: var(--space-5);
    border-top: 1px solid var(--color-border);
  }
  
  .qr-code-container {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    margin-bottom: var(--space-2);
  }
  
  .qr-code-preview-area {
    width: 120px;
    height: 120px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-background);
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
    background-color: var(--color-surface);
    color: var(--color-text-tertiary);
  }
  
  .qr-code-placeholder .icon {
    margin-bottom: var(--space-1);
  }
  
  .qr-code-placeholder p {
    margin: 0;
    font-size: var(--font-size-xs);
    text-align: center;
  }
  
  .qr-code-controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  
  .qr-button {
    white-space: nowrap;
  }
  
  .character-counter {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    text-align: right;
    margin-top: var(--space-1);
  }
  
  .character-counter.exceeded {
    color: var(--color-error);
    font-weight: var(--font-weight-medium);
  }

  .form-actions {
    display: flex;
    gap: var(--space-4);
    margin-top: var(--space-6);
  }
  
  .btn-primary, .btn-secondary, .btn-outline, .btn-danger {
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    font-size: var(--font-size-base);
    transition: var(--transition-colors);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
  }
  
  .btn-primary {
    background-color: var(--color-primary);
    color: var(--color-text-on-primary);
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: var(--color-primary-hover);
  }
  
  .btn-secondary {
    background-color: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: var(--color-surface-hover);
  }
  
  .btn-outline {
    background-color: transparent;
    border: 1px solid currentColor;
  }
  
  .btn-danger {
    color: var(--color-error);
  }
  
  .btn-danger:hover:not(:disabled) {
    background-color: var(--color-error-bg);
  }
  
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .loading-spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    margin-right: var(--space-2);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Responsive adjustments */
  @media (max-width: 640px) {
    .qr-code-container {
      flex-direction: column;
      align-items: center;
    }
    
    .qr-code-controls {
      flex-direction: row;
      margin-top: var(--space-2);
    }
    
    .upload-card {
      padding: var(--space-4);
    }
    
    .form-actions {
      flex-direction: column;
    }
  }
</style>