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
  
  <div class="uploader">
    <h2>Upload Media</h2>
    
    {#if error}
      <div class="error">{error}</div>
    {/if}
    
    {#if success}
      <div class="success">{success}</div>
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
            <p>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
          </div>
        {:else}
          <div class="placeholder">
            <p>Drag and drop a file here, or</p>
            <button 
              type="button" 
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
            class="secondary" 
            on:click={resetForm} 
            disabled={uploading}
          >
            Clear
          </button>
        {/if}
        
        <button 
          type="submit" 
          disabled={uploading || !file}
        >
          {uploading ? 'Uploading...' : 'Upload Media'}
        </button>
      </div>
    </form>
  </div>
  
  <style>
    .uploader {
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background-color: white;
    }
    
    h2 {
      margin-top: 0;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: bold;
    }
    
    input, textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    textarea {
      height: 100px;
      resize: vertical;
    }
    
    .dropzone {
      border: 2px dashed #ddd;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      margin-bottom: 1rem;
      background-color: #f9fafb;
      cursor: pointer;
    }
    
    .dropzone.active {
      border-color: #3182ce;
      background-color: #ebf8ff;
    }
    
    .dropzone button {
      background-color: #3182ce;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      margin: 0.5rem 0;
    }
    
    .placeholder .small {
      font-size: 0.8rem;
      color: #666;
    }
    
    .preview {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .preview img, .preview video {
      max-width: 100%;
      max-height: 200px;
      margin-bottom: 0.5rem;
    }
    
    .progress-container {
      width: 100%;
      height: 20px;
      background-color: #eee;
      border-radius: 10px;
      margin: 1rem 0;
      position: relative;
      overflow: hidden;
    }
    
    .progress-bar {
      height: 100%;
      background-color: #3182ce;
      transition: width 0.3s ease;
    }
    
    .progress-text {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      text-align: center;
      line-height: 20px;
      color: white;
      font-size: 0.8rem;
      font-weight: bold;
      text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
    }
    
    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    
    .buttons button {
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    
    .buttons button[type="submit"] {
      background-color: #3182ce;
      color: white;
    }
    
    .buttons button.secondary {
      background-color: #e2e8f0;
      color: #2d3748;
    }
    
    .buttons button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .error {
      background-color: #fed7d7;
      color: #c53030;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
    
    .success {
      background-color: #c6f6d5;
      color: #2f855a;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
    
    .character-counter {
      font-size: 0.8rem;
      color: #666;
      text-align: right;
      margin-top: 0.25rem;
    }
    
    .character-counter.exceeded {
      color: #c62828;
      font-weight: bold;
    }
  </style>