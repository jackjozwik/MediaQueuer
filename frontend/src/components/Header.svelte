<script>
  import { user } from '$lib/auth';
  import ThemeToggle from './ThemeToggle.svelte';

  export let activePage = '';
</script>

<header class="header">
  <div class="container">
    <div class="header-content">
      <a href="/" class="logo">
        <span class="logo-text">TV Media Queuer</span>
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
            <a href="/profile" class="profile-link">Profile</a>
            <a href="/logout" class="logout-link">Logout</a>
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
    background: linear-gradient(90deg, var(--color-primary) 0%, #4f46e5 100%);
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
    gap: var(--space-4);
  }

  .user-name {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .profile-link, .logout-link {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    text-decoration: none;
    transition: var(--transition-colors);
  }

  .profile-link:hover, .logout-link:hover {
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