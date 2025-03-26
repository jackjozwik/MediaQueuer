<!-- src/routes/profile/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { user, token } from '$lib/auth';
  
  let loading = false;
  let error = null;
  let updateSuccess = false;
  let displayName = $user?.displayName || '';
  let email = $user?.email || '';
  
  // Handle form submission
  async function handleSubmit() {
    if (!displayName) {
      error = 'Display name cannot be empty';
      return;
    }
    
    loading = true;
    error = null;
    updateSuccess = false;
    
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${$token}`
        },
        body: JSON.stringify({
          displayName,
          email
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update user store with new data
        user.update(u => ({ ...u, displayName, email }));
        updateSuccess = true;
      } else {
        error = result.message || 'Failed to update profile';
      }
    } catch (err) {
      console.error('Profile update error:', err);
      error = 'An unexpected error occurred. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="profile-page">
  <h1>Profile</h1>
  
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">User Information</h2>
    </div>
    
    <div class="card-body">
      {#if error}
        <div class="alert alert-error">
          {error}
        </div>
      {/if}
      
      {#if updateSuccess}
        <div class="alert alert-success">
          Profile updated successfully!
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label for="username" class="form-label">Username</label>
          <input
            type="text"
            id="username"
            class="form-control"
            value={$user?.username || ''}
            disabled
          />
          <div class="form-hint">Username cannot be changed</div>
        </div>
        
        <div class="form-group">
          <label for="displayName" class="form-label">Display Name</label>
          <input
            type="text"
            id="displayName"
            class="form-control"
            bind:value={displayName}
            disabled={loading}
          />
        </div>
        
        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input
            type="email"
            id="email"
            class="form-control"
            bind:value={email}
            disabled={loading}
          />
        </div>
        
        <div class="form-group">
          <label for="role" class="form-label">Role</label>
          <input
            type="text"
            id="role"
            class="form-control"
            value={$user?.role || ''}
            disabled
          />
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<style>
  .profile-page {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .form-actions {
    margin-top: var(--space-4);
  }
</style> 