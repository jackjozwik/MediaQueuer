<!-- src/+layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user, token, isAuthenticated, initAuth, logout } from '$lib/auth';
  import DebugHelper from './components/DebugHelper.svelte';
  
  // Props
  export let data;
  
  // Debug flag - set to false in production
  const showDebug = true;
  
  // Initialize auth on mount
  onMount(() => {
    initAuth();
  });
  
  // Handle logout
  function handleLogout() {
    logout();
    goto('/');
  }
</script>

<div class="app-container">
  <!-- Always render the navigation, but conditionally style it -->
  <header class:hidden={!$isAuthenticated}>
    <nav>
      <div class="logo">TV Media Queuer</div>
      <ul>
        <li class:active={$page.url.pathname === '/' || $page.url.pathname === '/home'}>
          <a href="/home">Home</a>
        </li>
        <li class:active={$page.url.pathname === '/upload'}>
          <a href="/upload">Upload Media</a>
        </li>
        {#if $user && ($user.role === 'admin' || $user.role === 'faculty')}
          <li class:active={$page.url.pathname === '/admin'}>
            <a href="/admin">Admin Panel</a>
          </li>
        {/if}
        <li>
          <a href="/display" target="_blank" class="display-link">Open Display</a>
        </li>
        <li>
          <button on:click={handleLogout}>Logout</button>
        </li>
      </ul>
    </nav>
  </header>

  <main>
    <slot />
  </main>
  
  {#if showDebug}
    <DebugHelper />
  {/if}
</div>

<style>
  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background-color: #f9fafb;
  }
  
  header {
    background-color: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  header.hidden {
    display: none;
  }
  
  nav {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .logo {
    font-weight: bold;
    font-size: 1.25rem;
  }
  
  nav ul {
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  nav li {
    margin-left: 1.5rem;
    position: relative;
  }
  
  nav a {
    color: #374151;
    text-decoration: none;
    padding: 0.5rem 0;
    display: block;
  }
  
  nav li.active a {
    color: #2563eb;
    font-weight: bold;
  }
  
  nav li.active::after {
    content: '';
    position: absolute;
    bottom: -1rem;
    left: 0;
    right: 0;
    height: 3px;
    background-color: #2563eb;
  }
  
  .display-link {
    background-color: #3b82f6;
    color: white !important;
    padding: 0.5rem 1rem !important;
    border-radius: 0.25rem;
  }
  
  nav button {
    background: none;
    border: none;
    padding: 0.5rem 0;
    cursor: pointer;
    color: #374151;
    font-size: 1rem;
  }
  
  nav button:hover {
    color: #1d4ed8;
  }
  
  main {
    flex: 1;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
    width: 100%;
  }

  :global(h1, h2, h3) {
    color: #1f2937;
  }
</style>