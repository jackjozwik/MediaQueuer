<!-- components/MediaUploader.svelte -->
<script>
    import { onMount, createEventDispatcher } from 'svelte';
    
    // Props
    export let token;
    export let uploadEndpoint = '/api/media/upload';
    export let categories = [];
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // State
    let dragActive = false;
    let uploading = false;
    let progress = 0;
    let error = '';
    let success = '';
    
    // Form data
    let title = '';
    let description = '';
    let duration = 10;
    let file = null;
    let filePreview = null;
    
    // Character limits
    const TITLE_MAX_LENGTH = 80;
    const DESCRIPTION_MAX_LENGTH = 250;
    
    // Derived values
    $: titleCharactersLeft = TITLE_MAX_LENGTH - title.length;
    $: descriptionCharactersLeft = DESCRIPTION_MAX_LENGTH - description.length;
    $: titleExceeded = titleCharactersLeft < 0;
    $: descriptionExceeded = descriptionCharactersLeft < 0;
    
    // Handle file selection
    function handleFileSelect(e) {
      if (e.target.files && e.target.files[0]) {
        handleFiles(e.target.files[0]);
      }
    }
    
    // Handle drag events
    function handleDrag(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.type === 'dragenter' || e.type === 'dragover') {
        dragActive = true;
      } else if (e.type === 'dragleave') {
        dragActive = false;
      }
    }
    
    // Handle drop
    function handleDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      dragActive = false;
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files[0]);
      }
    }
    
    // Create file preview
    function handleFiles(selectedFile) {
      file = selectedFile;
      
      // Generate preview
      const fileType = selectedFile.type.startsWith('image/') 
        ? 'image' 
        : selectedFile.type.startsWith('video/') 
          ? 'video' 
          : null;
          
      if (fileType) {
        filePreview = {
          type: fileType,
          url: URL.createObjectURL(selectedFile)
        };
      }
      
      // Auto-suggest title from filename
      if (!title) {
        title = selectedFile.name.split('.')[0];
        if (title.length > TITLE_MAX_LENGTH) {
          title = title.substring(0, TITLE_MAX_LENGTH);
        }
      }
    }
    
    // Upload file
    async function uploadFile() {
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
      
      uploading = true;
      error = '';
      success = '';
      progress = 0;
      
      try {
        const formData = new FormData();
        formData.append('media', file);
        formData.append('title', title);
        formData.append('description', description);
        
        if (file.type.startsWith('image/')) {
          formData.append('duration', duration.toString());
        }
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            progress = Math.round((e.loaded / e.total) * 100);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 201) {
            const response = JSON.parse(xhr.responseText);
            success = response.message;
            resetForm();
            dispatch('uploaded', response.data);
          } else {
            try {
              const response = JSON.parse(xhr.responseText);
              error = response.message || 'Upload failed';
            } catch (err) {
              error = 'Upload failed';
            }
          }
          uploading = false;
        };
        
        xhr.onerror = () => {
          error = 'Network error, please try again';
          uploading = false;
        };
        
        xhr.open('POST', uploadEndpoint);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      } catch (err) {
        error = 'Upload failed';
        uploading = false;
        console.error('Upload error:', err);
      }
    }
    
    // Reset form
    function resetForm() {
      title = '';
      description = '';
      duration = 10;
      file = null;
      filePreview = null;
    }
  </script>
  
  <div class="card uploader">
    <h2>Upload Media</h2>
    
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
    
    <form on:submit|preventDefault={uploadFile}>
      <div class="form-group">
        <label for="title">Title *</label>
        <input 
          type="text" 
          id="title" 
          bind:value={title} 
          required 
          disabled={uploading}
          maxlength={TITLE_MAX_LENGTH}
        />
        <div class="character-counter {titleExceeded ? 'exceeded' : ''}">
          {titleCharactersLeft} characters left
        </div>
      </div>
      
      <div class="form-group">
        <label for="description">Description</label>
        <textarea 
          id="description" 
          bind:value={description} 
          disabled={uploading}
          maxlength={DESCRIPTION_MAX_LENGTH}
        ></textarea>
        <div class="character-counter {descriptionExceeded ? 'exceeded' : ''}">
          {descriptionCharactersLeft} characters left
        </div>
      </div>
      
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="dropzone" 
        class:active={dragActive}
        on:dragenter={handleDrag}
        on:dragover={handleDrag}
        on:dragleave={handleDrag}
        on:drop={handleDrop}
      >
        <input 
          type="file" 
          id="file" 
          accept="image/*,video/*" 
          on:change={handleFileSelect} 
          style="display: none;" 
          disabled={uploading}
        />
        
        {#if filePreview}
          <div class="preview">
            {#if filePreview.type === 'image'}
              <img src={filePreview.url} alt="Preview" />
            {:else if filePreview.type === 'video'}
              <!-- svelte-ignore a11y_media_has_caption -->
              <video src={filePreview.url} controls></video>
            {/if}
            <p class="file-name">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
          </div>
        {:else}
          <div class="placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p>Drag and drop a file here, or</p>
            <button 
              type="button" 
              class="btn-secondary upload-btn"
              on:click={() => document.getElementById('file').click()} 
              disabled={uploading}
            >
              Select a file
            </button>
            <p class="small">Accepted file types: images, videos</p>
          </div>
        {/if}
      </div>
      
      {#if filePreview && filePreview.type === 'image'}
        <div class="form-group">
          <label for="duration">Display Duration (seconds)</label>
          <input 
            type="number" 
            id="duration" 
            bind:value={duration} 
            min="1" 
            max="60" 
            disabled={uploading}
          />
          <div class="help-text">How long this image should be displayed on screen</div>
        </div>
      {/if}
      
      {#if uploading}
        <div class="progress-container">
          <div class="progress-bar" style="width: {progress}%"></div>
          <span class="progress-text">{progress}%</span>
        </div>
      {/if}
      
      <div class="buttons">
        {#if filePreview}
          <button 
            type="button" 
            class="btn-secondary" 
            on:click={resetForm} 
            disabled={uploading}
          >
            Clear
          </button>
        {/if}
        
        <button 
          type="submit" 
          class="btn-primary"
          disabled={uploading || !file}
        >
          {#if uploading}
            <span class="loading-spinner"></span>
            Uploading...
          {:else}
            Upload Media
          {/if}
        </button>
      </div>
    </form>
  </div>
  
  <style>
    .uploader {
      padding: var(--space-5);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background-color: var(--color-surface);
    }
    
    h2 {
      margin-top: 0;
      margin-bottom: var(--space-4);
      color: var(--color-text-primary);
      font-weight: var(--font-weight-semibold);
    }
    
    .form-group {
      margin-bottom: var(--space-4);
    }
    
    label {
      display: block;
      margin-bottom: var(--space-2);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }
    
    input, textarea {
      width: 100%;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background-color: var(--color-background);
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      font-size: var(--font-size-base);
      transition: var(--transition-all);
    }
    
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }
    
    textarea {
      height: 120px;
      resize: vertical;
    }
    
    .dropzone {
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-6);
      text-align: center;
      margin-bottom: var(--space-4);
      background-color: var(--color-surface-hover);
      cursor: pointer;
      transition: var(--transition-all);
    }
    
    .dropzone.active {
      border-color: var(--color-primary);
      background-color: var(--color-primary-hover);
      color: var(--color-text-on-primary);
    }
    
    .upload-btn {
      margin: var(--space-3) 0;
    }
    
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--color-text-secondary);
    }
    
    .placeholder svg {
      margin-bottom: var(--space-2);
      color: var(--color-text-tertiary);
    }
    
    .placeholder p {
      margin: var(--space-1) 0;
    }
    
    .placeholder .small {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
    }
    
    .preview {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .preview img, .preview video {
      max-width: 100%;
      max-height: 200px;
      margin-bottom: var(--space-3);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
    }
    
    .file-name {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
    
    .progress-container {
      width: 100%;
      height: 8px;
      background-color: var(--color-surface-hover);
      border-radius: var(--radius-full);
      margin: var(--space-4) 0;
      position: relative;
      overflow: hidden;
    }
    
    .progress-bar {
      height: 100%;
      background-color: var(--color-primary);
      border-radius: var(--radius-full);
      transition: width 0.3s ease;
    }
    
    .progress-text {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      text-align: center;
      color: var(--color-text-secondary);
      font-size: var(--font-size-xs);
      margin-top: var(--space-1);
    }
    
    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-4);
    }
    
    .btn-primary, .btn-secondary {
      padding: var(--space-2) var(--space-4);
      border: none;
      border-radius: var(--radius-md);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: var(--transition-colors);
      font-family: var(--font-sans);
      font-size: var(--font-size-base);
      display: inline-flex;
      align-items: center;
      justify-content: center;
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
    
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .alert {
      padding: var(--space-3);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-4);
      font-size: var(--font-size-sm);
    }
    
    .alert-error {
      background-color: var(--color-error-bg);
      color: var(--color-error);
      border: 1px solid var(--color-error);
    }
    
    .alert-success {
      background-color: var(--color-success-bg);
      color: var(--color-success);
      border: 1px solid var(--color-success);
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
    
    .help-text {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
      margin-top: var(--space-1);
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
  </style>