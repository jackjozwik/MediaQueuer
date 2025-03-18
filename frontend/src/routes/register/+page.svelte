<!-- src/routes/register/+page.svelte -->
<script>
    import { goto } from '$app/navigation';
    
    // Form data
    let username = '';
    let password = '';
    let firstName = '';
    let lastName = '';
    let preferredName = '';
    let email = '';
    let role = 'student'; // Default role
    let loading = false;
    let error = '';
    let success = '';
    
    // Submit registration form
    async function submitRegistration() {
      loading = true;
      error = '';
      success = '';
      
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            username, 
            password, 
            firstName,
            lastName,
            preferredName: preferredName || firstName,
            email,
            role
          })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          error = data.message || 'Registration failed';
          loading = false;
          return;
        }
        
        success = 'Registration successful! You may now log in.';
        
        // Clear form
        username = '';
        password = '';
        firstName = '';
        lastName = '';
        preferredName = '';
        email = '';
        
        // Redirect to login after a delay
        setTimeout(() => {
          goto('/');
        }, 2000);
      } catch (err) {
        error = 'Server error. Please try again.';
        console.error('Registration error:', err);
      } finally {
        loading = false;
      }
    }
  </script>
  
  <svelte:head>
    <title>Register | TV Media Queuer</title>
  </svelte:head>
  
  <div class="register-container">
    <div class="register-card">
      <h2>Register New Account</h2>
      
      <form on:submit|preventDefault={submitRegistration}>
        {#if error}
          <div class="error">{error}</div>
        {/if}
        
        {#if success}
          <div class="success">{success}</div>
        {/if}
        
        <div class="form-row">
          <div class="form-group">
            <label for="firstName">First Name *</label>
            <input 
              type="text" 
              id="firstName" 
              bind:value={firstName} 
              required 
              disabled={loading}
            />
          </div>
          
          <div class="form-group">
            <label for="lastName">Last Name *</label>
            <input 
              type="text" 
              id="lastName" 
              bind:value={lastName} 
              required 
              disabled={loading}
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="preferredName">Preferred Name (if different)</label>
          <input 
            type="text" 
            id="preferredName" 
            bind:value={preferredName} 
            placeholder="How you want to be credited in displays"
            disabled={loading}
          />
        </div>
        
        <div class="form-group">
          <label for="email">Email *</label>
          <input 
            type="email" 
            id="email" 
            bind:value={email} 
            required 
            disabled={loading}
          />
        </div>
        
        <div class="form-group">
          <label for="username">Username *</label>
          <input 
            type="text" 
            id="username" 
            bind:value={username} 
            required 
            disabled={loading}
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password *</label>
          <input 
            type="password" 
            id="password" 
            bind:value={password} 
            required 
            disabled={loading}
          />
        </div>
        
        <div class="form-group">
          <label for="role">Role *</label>
          <select 
            id="role" 
            bind:value={role} 
            required 
            disabled={loading}
          >
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <div class="form-actions">
          <a href="/" class="login-link">Already have an account? Log in</a>
          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </div>
      </form>
    </div>
  </div>
  
  <style>
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
    }
    
    .register-card {
      width: 100%;
      max-width: 600px;
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
    
    .form-row {
      display: flex;
      gap: 1rem;
    }
    
    .form-row .form-group {
      flex: 1;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: bold;
    }
    
    input, select {
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
    
    .login-link {
      color: #3182ce;
      text-decoration: none;
    }
    
    .login-link:hover {
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
    
    .success {
      background-color: #c6f6d5;
      color: #2f855a;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
    
    @media (max-width: 640px) {
      .form-row {
        flex-direction: column;
        gap: 0;
      }
      
      .register-card {
        padding: 1.5rem;
      }
    }
  </style>