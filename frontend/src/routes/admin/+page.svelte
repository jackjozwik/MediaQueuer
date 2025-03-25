<!-- src/routes/admin/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { token } from '$lib/auth';
  
  // State variables
  let activeTab = 'approval';
  let viewMode = 'list'; // 'list' or 'grid'
  let pendingMedia = [];
  let approvedMedia = [];
  let archivedMedia = [];
  let users = []; // Added users array
  let totalPlaybackDuration = 0; // Total duration in seconds
  let settings = {};
  let loading = {
    pending: true,
    approved: true,
    settings: true,
    archived: true,
    users: true // Added loading state for users
  };
  let error = {
    pending: null,
    approved: null,
    settings: null,
    archived: null,
    users: null // Added error state for users
  };
  
  // Drag and drop state
  let dragIndex = -1;
  let dragOverIndex = -1;
  
  // Media being edited
  let editingMedia = null;
  let editForm = {
    title: '',
    description: '',
    duration: 10,
    hide_info: false,
    hide_title: false,
    hide_description: false,
    hide_creator: false
  };
  
  // Confirmation dialogs
  let showDeleteConfirm = false;
  let mediaToDelete = null;
  
  // Media being viewed in modal
  let viewingMedia = null;
  
  // Toast notification
  let toast = {
    show: false,
    message: '',
    type: 'success', // 'success', 'error', 'info'
    timeoutId: null
  };
  
  // Show toast notification
  function showToast(message, type = 'success', duration = 3000) {
    // Clear any existing timeout
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    
    // Set toast properties
    toast = {
      show: true,
      message,
      type,
      timeoutId: null
    };
    
    // Hide toast after duration
    toast.timeoutId = setTimeout(() => {
      toast = {...toast, show: false};
    }, duration);
  }
  
  // Fetch pending media
  async function fetchPendingMedia() {
    loading.pending = true;
    error.pending = null;
    
    try {
      const response = await fetch('/api/media/pending', {
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.data && result.data.media) {
        pendingMedia = result.data.media;
      } else {
        error.pending = result.message || 'Failed to load pending media';
      }
    } catch (err) {
      console.error('Error fetching pending media:', err);
      error.pending = 'Error loading pending media';
    } finally {
      loading.pending = false;
    }
  }
  
  // Fetch approved media
  async function fetchApprovedMedia() {
    loading.approved = true;
    error.approved = null;
    
    try {
      const response = await fetch('/api/media/approved', {
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        error.approved = data.message || 'Failed to load approved media';
        return;
      }
      
      approvedMedia = data.data.media;
      calculateTotalDuration();
    } catch (err) {
      console.error('Error fetching approved media:', err);
      error.approved = 'Error loading approved media';
    } finally {
      loading.approved = false;
    }
  }
  
  // Fetch archived media
  async function fetchArchivedMedia() {
    loading.archived = true;
    error.archived = null;
    
    try {
      const response = await fetch('/api/media/archived', {
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.data && result.data.media) {
        archivedMedia = result.data.media;
      } else {
        error.archived = result.message || 'Failed to load archived media';
      }
    } catch (err) {
      console.error('Error fetching archived media:', err);
      error.archived = 'Error loading archived media';
    } finally {
      loading.archived = false;
    }
  }
  
  // Fetch settings
  async function fetchSettings() {
    loading.settings = true;
    error.settings = null;
    
    try {
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.data && result.data.settings) {
        settings = result.data.settings.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});
      } else {
        error.settings = result.message || 'Failed to load settings';
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      error.settings = 'Error loading settings';
    } finally {
      loading.settings = false;
    }
  }
  
  // Save settings
  async function saveSettings() {
    try {
      // Get elements from the form
      const autoApproveValue = document.getElementById('auto_approve').value;
      const defaultImageDurationValue = document.getElementById('default_image_duration').value;
      const autoArchiveDaysValue = document.getElementById('auto_archive_days').value;
      
      // Update settings one by one
      const settingsToUpdate = [
        { key: 'auto_approve', value: autoApproveValue },
        { key: 'default_image_duration', value: defaultImageDurationValue },
        { key: 'auto_archive_days', value: autoArchiveDaysValue }
      ];
      
      for (const setting of settingsToUpdate) {
        const response = await fetch(`/api/admin/settings/${setting.key}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${$token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ value: setting.value })
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(`Failed to update ${setting.key}: ${result.message}`);
        }
      }
      
      // Show success toast instead of alert
      showToast('Settings saved successfully', 'success');
      
      // Refresh settings
      fetchSettings();
    } catch (err) {
      console.error('Error saving settings:', err);
      // Show error toast instead of alert
      showToast(`Error saving settings: ${err.message}`, 'error');
    }
  }
  
  // Approve media item
  async function approveMedia(id) {
    try {
      const response = await fetch(`/api/media/approve/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh media lists
        fetchPendingMedia();
        fetchApprovedMedia();
      } else {
        alert(result.message || 'Failed to approve media');
      }
    } catch (err) {
      console.error('Error approving media:', err);
      alert('Error approving media');
    }
  }
  
  // Reject media item
  async function rejectMedia(id) {
    try {
      const response = await fetch(`/api/media/reject/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh pending media list
        fetchPendingMedia();
      } else {
        alert(result.message || 'Failed to reject media');
      }
    } catch (err) {
      console.error('Error rejecting media:', err);
      alert('Error rejecting media');
    }
  }
  
  // Delete media item
  async function deleteMedia(id) {
    try {
      const response = await fetch(`/api/media/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Close delete confirmation
        showDeleteConfirm = false;
        mediaToDelete = null;
        
        // Refresh media lists
        fetchApprovedMedia();
      } else {
        alert(result.message || 'Failed to delete media');
      }
    } catch (err) {
      console.error('Error deleting media:', err);
      alert('Error deleting media');
    }
  }
  
  // Show edit form for media item
  function showEditForm(media) {
    editingMedia = media;
    
    // Parse metadata if it exists
    let metadata = {};
    if (media.metadata) {
      try {
        if (typeof media.metadata === 'string') {
          metadata = JSON.parse(media.metadata);
        } else {
          metadata = media.metadata;
        }
      } catch (e) {
        console.error('Error parsing metadata:', e);
      }
    }
    
    editForm = {
      title: media.title || '',
      description: media.description || '',
      duration: media.duration || 10,
      hide_info: metadata.hide_info || false,
      hide_title: metadata.hide_title || false,
      hide_description: metadata.hide_description || false,
      hide_creator: metadata.hide_creator || false
    };
    
    console.log('Editing media with form:', editForm);
  }
  
  // Submit edit form
  async function submitEditForm() {
    if (!editingMedia) return;
    
    try {
      // Convert checkbox values to JSON metadata
      const metadata = {
        hide_info: editForm.hide_info,
        hide_title: editForm.hide_title,
        hide_description: editForm.hide_description,
        hide_creator: editForm.hide_creator
      };
      
      // Prepare data to send
      const dataToSend = {
        title: editForm.title,
        description: editForm.description,
        duration: editForm.duration,
        metadata: JSON.stringify(metadata)
      };
      
      const response = await fetch(`/api/media/update/${editingMedia.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${$token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Close edit form
        editingMedia = null;
        
        // Refresh media lists
        fetchApprovedMedia();
      } else {
        alert(result.message || 'Failed to update media');
      }
    } catch (err) {
      console.error('Error updating media:', err);
      alert('Error updating media');
    }
  }
  
  // Drag and drop handlers for reordering
  function handleDragStart(event, index) {
    dragIndex = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
    
    // Add a delay before adding the dragging class to avoid flickering
    setTimeout(() => {
      document.querySelectorAll('.media-item')[index].classList.add('dragging');
    }, 0);
  }
  
  function handleDragOver(event, index) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    if (dragIndex !== index) {
      dragOverIndex = index;
    }
  }
  
  function handleDragEnter(event, index) {
    if (dragIndex !== index) {
      dragOverIndex = index;
    }
  }
  
  function handleDragLeave(event) {
    // Only clear dragOverIndex if we're leaving the target element
    if (event.target.classList.contains('media-item')) {
      dragOverIndex = -1;
    }
  }
  
  function handleDrop(event, index) {
    event.preventDefault();
    
    // Get the source index
    const sourceIndex = dragIndex;
    
    if (sourceIndex !== index) {
      // Reorder the array
      const item = approvedMedia[sourceIndex];
      approvedMedia = [
        ...approvedMedia.slice(0, sourceIndex),
        ...approvedMedia.slice(sourceIndex + 1)
      ];
      approvedMedia = [
        ...approvedMedia.slice(0, index),
        item,
        ...approvedMedia.slice(index)
      ];
      
      // Update the display order in the database
      updateDisplayOrder();
    }
    
    // Reset state
    dragIndex = -1;
    dragOverIndex = -1;
  }
  
  function handleDragEnd(event) {
    // Reset state
    dragIndex = -1;
    dragOverIndex = -1;
  }
  
  // Update display order
  async function updateDisplayOrder() {
    try {
      const items = approvedMedia.map((item, index) => ({
        id: item.id,
        display_order: index + 1
      }));
      
      const response = await fetch('/api/media/order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        alert(result.message || 'Failed to update display order');
      }
    } catch (err) {
      console.error('Error updating display order:', err);
      alert('Error updating display order');
    }
  }
  
  // Show delete confirmation dialog
  function confirmDelete(media) {
    mediaToDelete = media;
    showDeleteConfirm = true;
  }
  
  // Archive media item
  async function archiveMediaItem(id) {
    try {
      const response = await fetch(`/api/media/archive/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show success toast
        showToast('Media archived successfully', 'success');
        
        // Refresh media lists
        fetchApprovedMedia();
        fetchArchivedMedia();
      } else {
        showToast(result.message || 'Failed to archive media', 'error');
      }
    } catch (err) {
      console.error('Error archiving media:', err);
      showToast('Error archiving media', 'error');
    }
  }
  
  // Restore media item from archive
  async function restoreMedia(id) {
    try {
      const response = await fetch(`/api/media/restore/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show success toast
        showToast('Media restored successfully', 'success');
        
        // Refresh media lists
        fetchApprovedMedia();
        fetchArchivedMedia();
      } else {
        showToast(result.message || 'Failed to restore media', 'error');
      }
    } catch (err) {
      console.error('Error restoring media:', err);
      showToast('Error restoring media', 'error');
    }
  }
  
  // Calculate total playback duration
  function calculateTotalDuration() {
    totalPlaybackDuration = approvedMedia.reduce((total, item) => {
      return total + (Number(item.duration) || 0);
    }, 0);
  }
  
  // Fetch users for role management
  async function fetchUsers() {
    loading.users = true;
    error.users = null;
    
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${$token}`
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        error.users = data.message || 'Failed to load users';
        return;
      }
      
      users = data.data.users;
    } catch (err) {
      console.error('Error fetching users:', err);
      error.users = 'Error loading users';
    } finally {
      loading.users = false;
    }
  }
  
  // Update user role
  async function updateUserRole(userId, newRole) {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${$token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        showToast(data.message || 'Failed to update user role', 'error');
        return false;
      }
      
      // Update local user data
      users = users.map(user => {
        if (user.id === userId) {
          return { ...user, role: newRole };
        }
        return user;
      });
      
      showToast('User role updated successfully', 'success');
      return true;
    } catch (err) {
      console.error('Error updating user role:', err);
      showToast('Error updating user role', 'error');
      return false;
    }
  }
  
  // Initialize component
  onMount(() => {
    fetchPendingMedia();
    fetchApprovedMedia();
    fetchArchivedMedia();
    fetchSettings();
    fetchUsers();
    
    // Add ESC key handler to close modals
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        // Close any open modals
        if (editingMedia) {
          editingMedia = null;
        } else if (showDeleteConfirm) {
          showDeleteConfirm = false;
        } else if (viewingMedia) {
          viewingMedia = null;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });
</script>

<svelte:head>
  <title>Admin Panel - TV Media Queuer</title>
</svelte:head>

<div class="admin-container">
  <h1>Admin Panel</h1>
  
  <div class="tabs">
    <button 
      class="tab-btn" 
      class:active={activeTab === 'approval'} 
      on:click={() => activeTab = 'approval'}
    >
      Approval Queue
    </button>
    <button 
      class="tab-btn" 
      class:active={activeTab === 'content'} 
      on:click={() => activeTab = 'content'}
    >
      Content Management
    </button>
    <button 
      class="tab-btn" 
      class:active={activeTab === 'archives'} 
      on:click={() => activeTab = 'archives'}
    >
      Archives
    </button>
    <button 
      class="tab-btn" 
      class:active={activeTab === 'settings'} 
      on:click={() => activeTab = 'settings'}
    >
      System Settings
    </button>
    <button 
      class="tab-btn" 
      class:active={activeTab === 'users'} 
      on:click={() => activeTab = 'users'}
    >
      Users
    </button>
  </div>
  
  <div class="tab-content">
    <!-- Approval Queue Tab -->
    {#if activeTab === 'approval'}
      <div class="panel">
        <div class="panel-header">
          <h2>Media Approval Queue</h2>
          <button class="refresh-btn" on:click={fetchPendingMedia}>Refresh</button>
        </div>
        
        {#if loading.pending}
          <div class="loading">Loading pending media...</div>
        {:else if error.pending}
          <div class="error">{error.pending}</div>
        {:else if pendingMedia.length === 0}
          <div class="empty">No pending media to approve.</div>
        {:else}
          <div class="media-list">
            {#each pendingMedia as media (media.id)}
              <div class="media-item">
                <div class="media-preview">
                  {#if media.file_type === 'image' || media.file_type.startsWith('image/')}
                    <img src={media.file_url} alt={media.title} on:click={() => viewingMedia = media} />
                  {:else if media.file_type === 'video' || media.file_type.startsWith('video/')}
                    <video src={media.file_url} controls muted on:click={() => viewingMedia = media}></video>
                  {:else}
                    <div class="unknown-media">{media.file_type}</div>
                  {/if}
                </div>
                <div class="media-details">
                  <h3>{media.title || 'Untitled'}</h3>
                  <p class="description">{media.description || 'No description'}</p>
                  <p class="metadata">
                    <span class="type">Type: {media.file_type}</span>
                    {#if media.file_type === 'image' || media.file_type.startsWith('image/')}
                      <span class="duration">Duration: {media.duration || 10}s</span>
                    {/if}
                    <span class="uploader">By: {media.uploaded_by}</span>
                  </p>
                </div>
                <div class="media-actions">
                  <button class="approve-btn" on:click={() => approveMedia(media.id)}>Approve</button>
                  <button class="reject-btn" on:click={() => rejectMedia(media.id)}>Reject</button>
                  <button class="edit-btn" on:click={() => showEditForm(media)}>Edit</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
    
    <!-- Content Management Tab -->
    {#if activeTab === 'content'}
      <div class="panel">
        <div class="panel-header">
          <h2>Content Management</h2>
          <button class="refresh-btn" on:click={fetchApprovedMedia}>Refresh</button>
        </div>
        
        {#if loading.approved}
          <div class="loading">Loading approved media...</div>
        {:else if error.approved}
          <div class="error">{error.approved}</div>
        {:else if approvedMedia.length === 0}
          <div class="empty">No approved media available.</div>
        {:else}
          <!-- Total Playback Duration Display -->
          <div class="duration-info">
            <h3>Total Playback Duration:</h3>
            <p>
              <!-- Format duration in hours, minutes, seconds without decimals -->
              {Math.floor(totalPlaybackDuration / 3600)}h {Math.floor((totalPlaybackDuration % 3600) / 60)}m {Math.floor(totalPlaybackDuration % 60)}s
              ({Math.floor(totalPlaybackDuration)} seconds)
            </p>
          </div>
          
          <!-- Display mode toggle -->
          <div class="view-toggle">
            <button class="view-btn" class:active={viewMode === 'list'} on:click={() => viewMode = 'list'}>
              List View
            </button>
            <button class="view-btn" class:active={viewMode === 'grid'} on:click={() => viewMode = 'grid'}>
              Grid View
            </button>
          </div>
          
          <!-- List View (with drag & drop ordering) -->
          {#if viewMode === 'list'}
            <div class="instructions">
              <p>Drag and drop items to change the display order. Changes are saved automatically.</p>
            </div>
            <div class="media-list">
              {#each approvedMedia as media, index (media.id)}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div 
                  class="media-item order-item" 
                  draggable={true}
                  on:dragstart={(e) => handleDragStart(e, index)}
                  on:dragover={(e) => handleDragOver(e, index)}
                  on:dragenter={(e) => handleDragEnter(e, index)}
                  on:dragleave={(e) => handleDragLeave(e)}
                  on:drop={(e) => handleDrop(e, index)}
                  on:dragend={(e) => handleDragEnd(e)}
                  class:dragging={dragIndex === index}
                  class:drag-over={dragOverIndex === index}
                >
                  <div class="order-number">{index + 1}</div>
                  <div class="drag-handle">⋮⋮</div>
                  <div class="media-preview small">
                    {#if media.file_type === 'image' || media.file_type.startsWith('image/')}
                      <img src={media.file_url} alt={media.title} on:click={() => viewingMedia = media} />
                    {:else if media.file_type === 'video' || media.file_type.startsWith('video/')}
                      <video src={media.file_url} controls muted on:click={() => viewingMedia = media}></video>
                    {:else}
                      <div class="unknown-media">{media.file_type}</div>
                    {/if}
                  </div>
                  <div class="media-details">
                    <h3>{media.title || 'Untitled'}</h3>
                    <p class="description">{media.description || 'No description'}</p>
                    <p class="metadata">
                      <span class="type">Type: {media.file_type}</span>
                      {#if media.file_type === 'image' || media.file_type.startsWith('image/')}
                        <span class="duration">Duration: {media.duration || 10}s</span>
                      {:else if media.file_type === 'video' || media.file_type.startsWith('video/')}
                        <span class="duration">Duration: {media.duration ? `${media.duration.toFixed(0)}s` : 'Unknown'}</span>
                      {/if}
                      <span class="uploader">By: {media.uploaded_by}</span>
                      {#if media.approved_by_username}
                        <span class="approver">Approved by: {media.approved_by_username}</span>
                      {/if}
                    </p>
                  </div>
                  <div class="media-actions">
                    <button class="edit-btn" on:click={() => showEditForm(media)}>Edit</button>
                    <button class="delete-btn" on:click={() => confirmDelete(media)}>Delete</button>
                    <button class="archive-btn" on:click={() => archiveMediaItem(media.id)}>Archive</button>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <!-- Grid View -->
            <div class="media-list grid">
              {#each approvedMedia as media (media.id)}
                <div class="media-card">
                  <div class="order-badge">{media.display_order || '–'}</div>
                  <div class="media-preview">
                    {#if media.file_type === 'image' || media.file_type.startsWith('image/')}
                      <img src={media.file_url} alt={media.title} on:click={() => viewingMedia = media} />
                    {:else if media.file_type === 'video' || media.file_type.startsWith('video/')}
                      <video src={media.file_url} controls muted on:click={() => viewingMedia = media}></video>
                    {:else}
                      <div class="unknown-media">{media.file_type}</div>
                    {/if}
                  </div>
                  <div class="media-details">
                    <h3>{media.title || 'Untitled'}</h3>
                    <p class="description">{media.description || 'No description'}</p>
                    <p class="metadata">
                      <span class="type">Type: {media.file_type}</span>
                      {#if media.file_type === 'image' || media.file_type.startsWith('image/')}
                        <span class="duration">Duration: {media.duration || 10}s</span>
                      {:else if media.file_type === 'video' || media.file_type.startsWith('video/')}
                        <span class="duration">Duration: {media.duration ? `${media.duration}s` : 'Unknown'}</span>
                      {/if}
                      <span class="uploader">By: {media.uploaded_by}</span>
                      {#if media.approved_by_username}
                        <span class="approver">Approved by: {media.approved_by_username}</span>
                      {/if}
                    </p>
                  </div>
                  <div class="media-actions">
                    <button class="edit-btn" on:click={() => showEditForm(media)}>Edit</button>
                    <button class="delete-btn" on:click={() => confirmDelete(media)}>Delete</button>
                    <button class="archive-btn" on:click={() => archiveMediaItem(media.id)}>Archive</button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/if}
    
    <!-- Archives Tab -->
    {#if activeTab === 'archives'}
      <div class="panel">
        <div class="panel-header">
          <h2>Archives</h2>
          <button class="refresh-btn" on:click={fetchArchivedMedia}>Refresh</button>
        </div>
        
        {#if loading.archived}
          <div class="loading">Loading archived media...</div>
        {:else if error.archived}
          <div class="error">{error.archived}</div>
        {:else if archivedMedia.length === 0}
          <div class="empty">No archived media available.</div>
        {:else}
          <div class="media-list">
            {#each archivedMedia as media (media.id)}
              <div class="media-item">
                <div class="media-preview">
                  {#if media.file_type === 'image' || media.file_type.startsWith('image/')}
                    <img src={media.file_url} alt={media.title} on:click={() => viewingMedia = media} />
                  {:else if media.file_type === 'video' || media.file_type.startsWith('video/')}
                    <video src={media.file_url} controls muted on:click={() => viewingMedia = media}></video>
                  {:else}
                    <div class="unknown-media">{media.file_type}</div>
                  {/if}
                </div>
                <div class="media-details">
                  <h3>{media.title || 'Untitled'}</h3>
                  <p class="description">{media.description || 'No description'}</p>
                  <p class="metadata">
                    <span class="type">Type: {media.file_type}</span>
                    {#if media.file_type === 'image' || media.file_type.startsWith('image/')}
                      <span class="duration">Duration: {media.duration || 10}s</span>
                    {/if}
                    <span class="uploader">By: {media.uploaded_by}</span>
                    {#if media.approved_by_username}
                      <span class="approver">Approved by: {media.approved_by_username}</span>
                    {/if}
                    {#if media.archived_by_username}
                      <span class="archiver">Archived by: {media.archived_by_username}</span>
                    {/if}
                    {#if media.archived_at}
                      <span class="archive-date">
                        Archived on: {new Date(media.archived_at).toLocaleString()}
                      </span>
                    {/if}
                  </p>
                </div>
                <div class="media-actions">
                  <button class="restore-btn" on:click={() => restoreMedia(media.id)}>Restore</button>
                  <button class="delete-btn" on:click={() => confirmDelete(media)}>Delete</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
    
    <!-- System Settings Tab -->
    {#if activeTab === 'settings'}
      <div class="panel">
        <div class="panel-header">
          <h2>System Settings</h2>
          <button class="refresh-btn" on:click={fetchSettings}>Refresh</button>
        </div>
        
        {#if loading.settings}
          <div class="loading">Loading settings...</div>
        {:else if error.settings}
          <div class="error">{error.settings}</div>
        {:else}
          <div class="settings-form">
            <div class="setting-item">
              <label for="auto_approve">Auto Approve Uploads</label>
              <select id="auto_approve">
                <option value="true" selected={settings.auto_approve === 'true'}>Yes</option>
                <option value="false" selected={settings.auto_approve === 'false'}>No</option>
              </select>
              <p class="help-text">Automatically approve all uploaded media</p>
            </div>
            
            <div class="setting-item">
              <label for="default_image_duration">Default Image Duration (seconds)</label>
              <input 
                type="number" 
                id="default_image_duration" 
                value={settings.default_image_duration || 10} 
                min="1" 
                max="60"
              />
              <p class="help-text">Default duration to display images if not specified</p>
            </div>
            
            <div class="setting-item">
              <label for="auto_archive_days">Auto-Archive Content (days)</label>
              <input 
                type="number" 
                id="auto_archive_days" 
                value={settings.auto_archive_days || 0} 
                min="0" 
                max="365"
              />
              <p class="help-text">Number of days after which content is automatically archived. Set to 0 to disable.</p>
            </div>
            
            <button class="save-btn" on:click={saveSettings}>Save Settings</button>
          </div>
        {/if}
      </div>
    {/if}
    
    <!-- USERS TAB -->
    {#if activeTab === 'users'}
      <div class="panel-content">
        <h2>User Role Management</h2>
        <p class="panel-description">
          Manage user roles and permissions. Only administrators can change user roles.
        </p>
        
        {#if error.users}
          <div class="error-message">{error.users}</div>
        {/if}
        
        {#if loading.users}
          <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading users...</p>
          </div>
        {:else if users.length === 0}
          <div class="empty-state">
            <p>No users found.</p>
          </div>
        {:else}
          <div class="users-table-container">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each users as user (user.id)}
                  <tr>
                    <td>{user.username}</td>
                    <td>
                      {#if user.preferred_name}
                        {user.preferred_name} {user.last_name}
                      {:else if user.first_name && user.last_name}
                        {user.first_name} {user.last_name}
                      {:else}
                        -
                      {/if}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span class="role-badge role-{user.role}">
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div class="role-actions">
                        <select 
                          class="role-select"
                          value={user.role}
                          on:change={(e) => updateUserRole(user.id, e.target.value)}
                        >
                          <option value="student">Student</option>
                          <option value="faculty">Faculty</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  
  <!-- Edit Media Modal -->
  {#if editingMedia}
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2>Edit Media</h2>
          <button class="close-btn" on:click={() => editingMedia = null}>×</button>
        </div>
        <div class="modal-body">
          <form on:submit|preventDefault={submitEditForm}>
            <div class="form-group">
              <label for="title">Title:</label>
              <input type="text" id="title" bind:value={editForm.title} required />
            </div>
            
            <div class="form-group">
              <label for="description">Description:</label>
              <textarea id="description" bind:value={editForm.description} rows="3"></textarea>
            </div>
            
            {#if editingMedia.file_type === 'image' || editingMedia.file_type.startsWith('image/')}
              <div class="form-group">
                <label for="duration">Display Duration (seconds):</label>
                <input type="number" id="duration" bind:value={editForm.duration} min="1" max="60" />
              </div>
            {/if}
            
            <div class="form-group">
              <h4>Display Options</h4>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" bind:checked={editForm.hide_info} />
                  Hide all information
                </label>
                
                <label class="checkbox-label">
                  <input type="checkbox" bind:checked={editForm.hide_title} />
                  Hide title
                </label>
                
                <label class="checkbox-label">
                  <input type="checkbox" bind:checked={editForm.hide_description} />
                  Hide description
                </label>
                
                <label class="checkbox-label">
                  <input type="checkbox" bind:checked={editForm.hide_creator} />
                  Hide creator information
                </label>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="save-btn">Save Changes</button>
              <button type="button" class="cancel-btn" on:click={() => editingMedia = null}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Delete Confirmation Modal -->
  {#if showDeleteConfirm}
    <div class="modal-overlay">
      <div class="modal confirmation">
        <div class="modal-header">
          <h2>Confirm Delete</h2>
          <button class="close-btn" on:click={() => showDeleteConfirm = false}>×</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete "{mediaToDelete?.title || 'this media'}"?</p>
          <p class="warning">This action cannot be undone.</p>
          
          <div class="form-actions">
            <button class="delete-btn" on:click={() => deleteMedia(mediaToDelete.id)}>Delete</button>
            <button class="cancel-btn" on:click={() => showDeleteConfirm = false}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- View Media Modal -->
  {#if viewingMedia}
    <div class="modal-overlay fullscreen">
      <div class="modal-fullscreen">
        <div class="modal-header">
          <h2>{viewingMedia.title || 'Untitled'}</h2>
          <button class="close-btn" on:click={() => viewingMedia = null}>×</button>
        </div>
        <div class="modal-body">
          <div class="fullscreen-preview">
            {#if viewingMedia.file_type === 'image' || viewingMedia.file_type.startsWith('image/')}
              <img src={viewingMedia.file_url} alt={viewingMedia.title} />
            {:else if viewingMedia.file_type === 'video' || viewingMedia.file_type.startsWith('video/')}
              <video src={viewingMedia.file_url} controls autoplay></video>
            {:else}
              <div class="unknown-media">{viewingMedia.file_type}</div>
            {/if}
          </div>
          
          <div class="media-info">
            <h3>{viewingMedia.title || 'Untitled'}</h3>
            <p class="description">{viewingMedia.description || 'No description'}</p>
            <p class="metadata">
              <span class="type">Type: {viewingMedia.file_type}</span>
              {#if viewingMedia.file_type === 'image' || viewingMedia.file_type.startsWith('image/')}
                <span class="duration">Duration: {viewingMedia.duration || 10}s</span>
              {:else if viewingMedia.file_type === 'video' || viewingMedia.file_type.startsWith('video/')}
                <span class="duration">Duration: {viewingMedia.duration ? `${viewingMedia.duration}s` : 'Unknown'}</span>
              {/if}
              <span class="uploader">By: {viewingMedia.uploaded_by}</span>
              {#if viewingMedia.approved_by_username}
                <span class="approver">Approved by: {viewingMedia.approved_by_username}</span>
              {/if}
            </p>
            
            <div class="modal-actions">
              {#if viewingMedia.status === 'pending'}
                <button class="approve-btn" on:click={() => { approveMedia(viewingMedia.id); viewingMedia = null; }}>Approve</button>
                <button class="reject-btn" on:click={() => { rejectMedia(viewingMedia.id); viewingMedia = null; }}>Reject</button>
              {/if}
              <button class="edit-btn" on:click={() => { showEditForm(viewingMedia); viewingMedia = null; }}>Edit</button>
              {#if viewingMedia.status === 'approved'}
                <button class="delete-btn" on:click={() => { confirmDelete(viewingMedia); viewingMedia = null; }}>Delete</button>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Toast Notification Component -->
{#if toast.show}
  <div 
    class="toast-notification" 
    class:success={toast.type === 'success'} 
    class:error={toast.type === 'error'}
    class:info={toast.type === 'info'}
  >
    <div class="toast-content">
      <span class="toast-message">{toast.message}</span>
      <button class="toast-close" on:click={() => toast = {...toast, show: false}}>×</button>
    </div>
  </div>
{/if}

<style>
  .admin-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    position: relative;
  }
  
  h1 {
    margin-bottom: 1.5rem;
  }
  
  .tabs {
    display: flex;
    border-bottom: 1px solid #ddd;
    margin-bottom: 1.5rem;
  }
  
  .tab-btn {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    color: #555;
    position: relative;
  }
  
  .tab-btn:hover {
    color: #1976d2;
  }
  
  .tab-btn.active {
    color: #1976d2;
  }
  
  .tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: #1976d2;
  }
  
  .panel {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .panel-header h2 {
    margin: 0;
  }
  
  .refresh-btn {
    padding: 0.5rem 1rem;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .refresh-btn:hover {
    background-color: #e0e0e0;
  }
  
  .loading, .error, .empty {
    padding: 2rem;
    text-align: center;
  }
  
  .error {
    color: #c62828;
  }
  
  .media-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .media-list.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .media-item {
    display: flex;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
    cursor: grab;
    transition: box-shadow 0.3s, transform 0.3s, background-color 0.3s;
  }
  
  .media-item:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .media-item.dragging {
    opacity: 0.6;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
  
  .media-item.drag-over {
    border: 2px dashed #1976d2;
    background-color: rgba(25, 118, 210, 0.05);
  }
  
  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    background-color: #eee;
    color: #666;
    font-size: 1.2rem;
    cursor: grab;
  }
  
  .order-item {
    align-items: center;
  }
  
  .media-card {
    display: flex;
    flex-direction: column;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  }
  
  .order-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
  }
  
  .media-preview {
    width: 200px;
    height: 120px;
    overflow: hidden;
    background-color: #000;
    flex-shrink: 0;
  }
  
  .media-preview.small {
    width: 100px;
    height: 60px;
  }
  
  .media-card .media-preview {
    width: 100%;
    height: 180px;
  }
  
  .media-preview img, .media-preview video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .unknown-media {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: white;
    font-size: 0.9rem;
  }
  
  .media-details {
    flex: 1;
    padding: 1rem;
    overflow: hidden;
  }
  
  .media-details h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.2rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .description {
    margin: 0.5rem 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 0.9rem;
  }
  
  .metadata {
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: #666;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .media-actions {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    background-color: #f5f5f5;
    border-left: 1px solid #ddd;
  }
  
  /* View toggle styles */
  .view-toggle {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
  }
  
  .view-btn {
    padding: 0.5rem 1rem;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    cursor: pointer;
  }
  
  .view-btn:first-child {
    border-radius: 4px 0 0 4px;
  }
  
  .view-btn:last-child {
    border-radius: 0 4px 4px 0;
  }
  
  .view-btn.active {
    background-color: #1976d2;
    color: white;
    border-color: #1976d2;
  }
  
  .instructions {
    background-color: #e8f5e9;
    border: 1px solid #a5d6a7;
    border-radius: 4px;
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .instructions p {
    margin: 0;
    color: #2e7d32;
    font-size: 0.9rem;
  }
  
  .approve-btn, .reject-btn, .edit-btn, .delete-btn, .save-btn, .cancel-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    text-align: center;
    width: 100%;
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
  
  .save-btn {
    background-color: #43a047;
    color: white;
    padding: 0.75rem 1.5rem;
    width: auto;
  }
  
  .cancel-btn {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }
  
  /* Settings styles */
  .settings-form {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .setting-item {
    margin-bottom: 1.5rem;
  }
  
  .setting-item label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .setting-item input, .setting-item select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  .help-text {
    font-size: 0.85rem;
    color: #666;
    margin-top: 0.25rem;
  }
  
  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }
  
  .modal {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal.confirmation {
    max-width: 400px;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #ddd;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #777;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .form-group input, .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  /* Checkbox styles */
  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  
  .checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
  }
  
  .warning {
    color: #c62828;
    font-weight: 500;
  }
  
  .fullscreen-preview {
    display: flex;
    justify-content: center;
    align-items: center;
    max-height: 70vh;
    margin-bottom: 1rem;
    overflow: hidden;
  }
  
  .fullscreen-preview img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
  }
  
  .fullscreen-preview video {
    max-width: 100%;
    max-height: 70vh;
  }
  
  .modal-fullscreen {
    width: 90%;
    max-width: 1200px;
    max-height: 90vh;
    background: white;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    overflow-y: auto;
  }
  
  .media-info {
    padding: 1rem;
  }
  
  .modal-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  
  /* Make images and videos clickable */
  .media-preview img,
  .media-preview video {
    cursor: pointer;
  }
  
  .duration-info {
    background-color: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .duration-info h3 {
    margin: 0 0 0.5rem 0;
    color: #1976d2;
  }
  
  .duration-info p {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 500;
  }
  
  .approver {
    margin-left: 0.5rem;
    padding: 0.1rem 0.5rem;
    background-color: #e3f2fd;
    border-radius: 3px;
    font-size: 0.85rem;
    color: #0d47a1;
  }
  
  /* Toast Notification Styles */
  .toast-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    min-width: 200px;
    max-width: 400px;
    animation: slideIn 0.3s ease-out forwards;
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  .toast-notification.success {
    background-color: #43a047;
    color: white;
  }
  
  .toast-notification.error {
    background-color: #e53935;
    color: white;
  }
  
  .toast-notification.info {
    background-color: #1976d2;
    color: white;
  }
  
  .toast-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .toast-message {
    flex: 1;
  }
  
  .toast-close {
    background: none;
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    margin-left: 0.5rem;
    opacity: 0.8;
  }
  
  .toast-close:hover {
    opacity: 1;
  }
  
  .archive-btn {
    background-color: #ff9800;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    text-align: center;
    width: 100%;
  }
  
  .restore-btn {
    background-color: #8bc34a;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    text-align: center;
    width: 100%;
  }
  
  .archiver {
    margin-left: 0.5rem;
    padding: 0.1rem 0.5rem;
    background-color: #fff3e0;
    border-radius: 3px;
    font-size: 0.85rem;
    color: #e65100;
  }
  
  .archive-date {
    margin-left: 0.5rem;
    padding: 0.1rem 0.5rem;
    background-color: #f1f1f1;
    border-radius: 3px;
    font-size: 0.85rem;
    color: #616161;
  }
  
  .users-table-container {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .users-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .users-table th, .users-table td {
    padding: 0.75rem;
    text-align: left;
  }
  
  .users-table th {
    background-color: #f5f5f5;
  }
  
  .role-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }
  
  .role-badge.role-student {
    background-color: #e3f2fd;
    color: #0d47a1;
  }
  
  .role-badge.role-faculty {
    background-color: #fff9c4;
    color: #f57f17;
  }
  
  .role-badge.role-admin {
    background-color: #ffebee;
    color: #c62828;
  }
  
  .role-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .role-select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-top: 4px solid #1976d2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .empty-state {
    padding: 2rem;
    text-align: center;
  }

  .order-number {
    color: #616161;
    font-weight: bold;
    padding: 0.0rem 0.5rem;
  }
</style>