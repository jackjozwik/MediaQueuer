<!-- src/routes/+page.svelte (Login Page) -->
<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { login, isAuthenticated } from '$lib/auth';
  
  // Form data
  let username = '';
  let password = '';
  let loading = false;
  let error = '';
  
  // Check if already logged in
  onMount(() => {
    // If already authenticated, go to home
    if ($isAuthenticated) {
      goto('/home');
    }
  });
  
  // Monitor auth state changes
  $: if ($isAuthenticated) {
    goto('/home');
  }
  
  // Submit login form
  async function submitLogin() {
    loading = true;
    error = '';
    
    try {
      const result = await login(username, password);
      
      if (!result.success) {
        error = result.message;
        loading = false;
        return;
      }
      
      // Navigate will happen automatically via the reactive statement
    } catch (err) {
      error = 'Server error. Please try again.';
      console.error('Login error:', err);
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login | TV Media Queuer</title>
</svelte:head>

<div class="login-container">
  <div class="login-card">
    <h2>TV Media Queuer</h2>
    <form on:submit|preventDefault={submitLogin}>
      {#if error}
        <div class="error">{error}</div>
      {/if}
      
      <div class="form-group">
        <label for="username">Username</label>
        <input 
          type="text" 
          id="username" 
          bind:value={username} 
          required 
          disabled={loading}
        />
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input 
          type="password" 
          id="password" 
          bind:value={password} 
          required 
          disabled={loading}
        />
      </div>
      
      <div class="form-actions">
        <a href="/register" class="register-link">Need an account? Register</a>
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
  }
  
  .login-card {
    width: 100%;
    max-width: 400px;
    padding: 2rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    background-color: white;
  }
  
  h2 {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  
  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1.5rem;
  }
  
  .register-link {
    color: #3182ce;
    text-decoration: none;
  }
  
  .register-link:hover {
    text-decoration: underline;
  }
  
  button {
    padding: 0.75rem 1.5rem;
    background-color: #3182ce;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }
  
  button:disabled {
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
</style>