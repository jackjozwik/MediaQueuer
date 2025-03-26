<!-- src/routes/login/+page.svelte -->
<script>
  import { login } from '$lib/auth';
  import { goto } from '$app/navigation';
  
  let username = '';
  let password = '';
  let loading = false;
  let error = null;
  
  async function handleSubmit() {
    if (!username || !password) {
      error = 'Please enter both username and password';
      return;
    }
    
    loading = true;
    error = null;
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        // Redirect to home page on successful login
        goto('/');
      } else {
        error = result.message || 'Login failed';
      }
    } catch (err) {
      console.error('Login error:', err);
      error = 'An unexpected error occurred. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-page">
  <div class="card login-card">
    <div class="card-header">
      <h1 class="card-title">Login</h1>
    </div>
    
    <div class="card-body">
      {#if error}
        <div class="alert alert-error">
          {error}
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label for="username" class="form-label">Username</label>
          <input
            type="text"
            id="username"
            class="form-control"
            bind:value={username}
            disabled={loading}
            autocomplete="username"
          />
        </div>
        
        <div class="form-group">
          <label for="password" class="form-label">Password</label>
          <input
            type="password"
            id="password"
            class="form-control"
            bind:value={password}
            disabled={loading}
            autocomplete="current-password"
          />
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>
      
      <div class="register-link">
        <p>Don't have an account? <a href="/register">Register</a></p>
      </div>
    </div>
  </div>
</div>

<style>
  .login-page {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 200px);
  }
  
  .login-card {
    width: 100%;
    max-width: 400px;
  }
  
  .form-actions {
    margin-top: var(--space-4);
  }
  
  .register-link {
    margin-top: var(--space-4);
    text-align: center;
    font-size: var(--font-size-sm);
  }
</style> 