<script>
  import { user } from '$lib/auth';
  import ThemeToggle from './ThemeToggle.svelte';

  export let activePage = '';
</script>

<header class="header">
  <div class="container">
    <div class="header-content">
      <a href="/" class="logo">
        <span class="logo-text">MediaQueuer</span>
        
      </a>
      
      <nav class="nav">
        <ul class="nav-list">
          <li class="nav-item">
            <a href="/" class="nav-link" class:active={activePage === 'home'}>Home</a>
          </li>
          <li class="nav-item">
            <a href="/upload" class="nav-link" class:active={activePage === 'upload'}>Upload</a>
          </li>
          {#if $user && ($user.role === 'admin' || $user.role === 'faculty')}
            <li class="nav-item">
              <a href="/admin" class="nav-link" class:active={activePage === 'admin'}>Admin</a>
            </li>
          {/if}
          <li class="nav-item">
            <a href="/display" class="nav-link" class:active={activePage === 'display'}>Display</a>
          </li>
        </ul>
      </nav>
      
      <div class="actions">
        <ThemeToggle />
        
        {#if $user}
          <div class="user-menu">
            <span class="user-name">{$user.name || $user.username}</span>
            <div class="user-dropdown">
              <a href="/profile" class="dropdown-link">Profile</a>
              <a href="/profile/uploads" class="dropdown-link">My Uploads</a>
              <a href="/logout" class="dropdown-link">Logout</a>
            </div>
          </div>
        {:else}
          <a href="/login" class="btn btn-primary login-btn">Login</a>
        {/if}
      </div>
    </div>
  </div>
</header>

<style>
  .header {
    background-color: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: var(--z-30);
    width: 100%;
    transition: var(--transition-colors);
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    padding: 0 var(--space-4);
  }

  .logo {
    display: flex;
    align-items: center;
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    font-size: var(--font-size-xl);
    text-decoration: none;
  }

  .logo-text {
    background: linear-gradient(90deg, #423cbf 0%, #2481dd 50%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-fill-color: transparent;
  }

  .nav-list {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: var(--space-5);
  }

  .nav-link {
    display: inline-flex;
    align-items: center;
    height: 64px;
    padding: 0 var(--space-2);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
    text-decoration: none;
    transition: var(--transition-colors);
    position: relative;
  }

  .nav-link:hover {
    color: var(--color-text-primary);
  }

  .nav-link.active {
    color: var(--color-primary);
  }

  .nav-link.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--color-primary);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .user-menu {
    display: flex;
    align-items: center;
    position: relative;
  }

  .user-name {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: background-color 0.2s;
  }

  .user-name:hover {
    background-color: var(--color-hover);
  }

  .user-dropdown {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 100%;
    right: 0;
    min-width: 150px;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    opacity: 0;
    visibility: hidden;
    transform: translateY(10px);
    transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
    z-index: var(--z-40);
  }

  .user-menu:hover .user-dropdown {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .dropdown-link {
    padding: var(--space-2) var(--space-3);
    color: var(--color-text-secondary);
    text-decoration: none;
    transition: background-color 0.2s, color 0.2s;
    white-space: nowrap;
  }

  .dropdown-link:hover {
    background-color: var(--color-hover);
    color: var(--color-primary);
  }

  .login-btn {
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-primary);
    color: var(--color-text-on-primary);
    border-radius: var(--radius-md);
    font-weight: var(--font-weight-medium);
    transition: var(--transition-colors);
  }

  .login-btn:hover {
    background-color: var(--color-primary-hover);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .nav {
      display: none;
    }

    .header-content {
      justify-content: space-between;
    }
  }
</style> 