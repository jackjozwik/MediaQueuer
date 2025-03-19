<!-- Add this to your media edit component where users can manage their media -->
<script>
    import { onMount } from 'svelte';
    import { token } from '$lib/auth';
    
    export let mediaId; // The ID of the media item being edited
    
    let media = null;
    let loading = true;
    let qrCodeFile = null;
    let uploadingQRCode = false;
    let message = '';
    let messageType = 'info';
    
    onMount(async () => {
      await loadMediaDetails();
    });
    
    async function loadMediaDetails() {
      try {
        loading = true;
        const response = await fetch(`/api/media/${mediaId}`);
        const data = await response.json();
        
        if (data.success) {
          media = data.data.media;
        } else {
          showMessage('Failed to load media details', 'error');
        }
      } catch (error) {
        console.error('Error loading media details:', error);
        showMessage('Error loading media details', 'error');
      } finally {
        loading = false;
      }
    }
    
    function handleQRCodeChange(event) {
      const file = event.target.files[0];
      if (file) {
        qrCodeFile = file;
      }
    }
    
    async function uploadQRCode() {
      if (!qrCodeFile) return;
      
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
        
        const data = await response.json();
        
        if (data.success) {
          showMessage('QR code uploaded successfully', 'success');
          // Update media object with new QR code
          media = { ...media, qr_code: data.data.qrCode };
          qrCodeFile = null;
        } else {
          showMessage(data.message || 'Failed to upload QR code', 'error');
        }
      } catch (error) {
        console.error('Error uploading QR code:', error);
        showMessage('An error occurred while uploading QR code', 'error');
      } finally {
        uploadingQRCode = false;
      }
    }
    
    async function deleteQRCode() {
      if (!media.qr_code) return;
      
      try {
        uploadingQRCode = true;
        
        const response = await fetch(`/api/media/${mediaId}/qrcode`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${$token}`
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          showMessage('QR code deleted successfully', 'success');
          // Update media object
          media = { ...media, qr_code: null };
        } else {
          showMessage(data.message || 'Failed to delete QR code', 'error');
        }
      } catch (error) {
        console.error('Error deleting QR code:', error);
        showMessage('An error occurred while deleting QR code', 'error');
      } finally {
        uploadingQRCode = false;
      }
    }
    
    function showMessage(text, type = 'info') {
      message = text;
      messageType = type;
      setTimeout(() => {
        message = '';
      }, 5000);
    }
  </script>
  
  <!-- QR Code Section for Media Item -->
  <div class="qr-code-section card">
    <h3>Media QR Code</h3>
    
    {#if message}
      <div class="message {messageType}">
        {message}
      </div>
    {/if}
    
    <div class="qr-code-container">
      {#if media?.qr_code}
        <img src={media.qr_code} alt="QR Code" class="qr-code-image" />
      {:else}
        <div class="qr-code-placeholder">
          <span>No QR Code</span>
        </div>
      {/if}
    </div>
    
    <div class="upload-controls">
      <label for="qrCodeUpload" class="file-upload-button">
        Choose QR Code
      </label>
      <input 
        type="file" 
        id="qrCodeUpload" 
        accept="image/*" 
        on:change={handleQRCodeChange} 
        style="display: none;"
      />
      
      {#if qrCodeFile}
        <button 
          class="primary-button" 
          on:click={uploadQRCode} 
          disabled={uploadingQRCode}
        >
          {uploadingQRCode ? 'Uploading...' : 'Upload QR Code'}
        </button>
      {/if}
      
      {#if media?.qr_code}
        <button 
          class="danger-button" 
          on:click={deleteQRCode} 
          disabled={uploadingQRCode}
        >
          Remove QR Code
        </button>
      {/if}
    </div>
    
    <div class="help-text">
      <p>Upload a QR code to link to your portfolio, website, or social media.</p>
      <p>This QR code will be shown alongside this specific media item in the display view.</p>
    </div>
  </div>
  
  <style>
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .message {
      padding: 10px 15px;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    
    .info {
      background-color: #e7f3fe;
      color: #0c5460;
    }
    
    .success {
      background-color: #d4edda;
      color: #155724;
    }
    
    .error {
      background-color: #f8d7da;
      color: #721c24;
    }
    
    .qr-code-container {
      width: 120px;
      height: 120px;
      margin-bottom: 15px;
      border: 1px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: white;
    }
    
    .qr-code-image {
      max-width: 100%;
      max-height: 100%;
    }
    
    .qr-code-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f8f9fa;
      color: #6c757d;
    }
    
    .upload-controls {
      margin-bottom: 15px;
    }
    
    .file-upload-button {
      display: inline-block;
      padding: 8px 15px;
      background-color: #6c757d;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    }
    
    .primary-button, .danger-button {
      padding: 8px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    
    .primary-button {
      background-color: #007bff;
      color: white;
    }
    
    .danger-button {
      background-color: #dc3545;
      color: white;
      margin-left: 10px;
    }
    
    button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .help-text {
      margin-top: 15px;
      color: #6c757d;
      font-size: 14px;
    }
    
    .help-text p {
      margin: 5px 0;
    }
  </style>