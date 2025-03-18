<!-- src/routes/+layout.svelte -->
<script>
    import { onMount } from 'svelte';
    import { initAuth, isAuthenticated, user, logout } from '$lib/auth';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
  
    // Initialize auth on mount
    onMount(() => {
      initAuth();
    });
  
    // Reactive declarations for user state
    $: isAdmin = $user && $user.role === 'admin';
    $: isFaculty = $user && $user.role === 'faculty';
    $: userName = $user ? ($user.preferredName || $user.firstName) : 'Guest';
    
    // Handle logout
    function handleLogout() {
      logout();
      goto('/');
    }
  
    // Get the current path from the page store
    $: currentPath = $page.url.pathname;
    
    // Determine if the current route is public
    $: isPublicRoute = ['/', '/register', '/display'].includes(currentPath);
    
    // Redirect if not authenticated and not on a public route
    $: {
      if (typeof window !== 'undefined' && !$isAuthenticated && !isPublicRoute) {
        goto('/');
      }
    }
  </script>
  
  <div class="app">
    <!-- Navigation bar - only show if authenticated and not on display route -->
    {#if $isAuthenticated && currentPath !== '/display'}
      <nav class="navbar">
        <div class="navbar-left">
          <a href="/home" class="navbar-brand">TV Media Queuer</a>
        </div>
        <div class="navbar-right">
          <div class="user-info">Welcome, {userName}!</div>
          <div class="nav-links">
            <a href="/home" class:active={currentPath === '/home'}>Home</a>
            <a href="/upload" class:active={currentPath === '/upload'}>Upload</a>
            {#if isAdmin || isFaculty}
              <a href="/admin" class:active={currentPath === '/admin'}>Admin Panel</a>
            {/if}
            <a href="/display" target="_blank">View Display</a>
            <a href="/settings" class:active={currentPath === '/settings'}>Settings</a>
            <button class="logout-btn" on:click={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>
    {/if}
  
    <!-- Main content area -->
    <main class="content">
      <slot />
    </main>
  </div>
  
  <style>
    .app {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    
    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #333;
      color: white;
      padding: 0.5rem 1rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .navbar-brand {
      font-size: 1.5rem;
      font-weight: bold;
      color: white;
      text-decoration: none;
    }
    
    .navbar-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .nav-links {
      display: flex;
      gap: 1rem;
    }
    
    .nav-links a {
      color: white;
      text-decoration: none;
      padding: 0.5rem;
      border-radius: 4px;
    }
    
    .nav-links a:hover, .nav-links a.active {
      background-color: #555;
    }
    
    .logout-btn {
      background-color: #d32f2f;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .logout-btn:hover {
      background-color: #b71c1c;
    }
    
    .content {
      flex: 1;
      padding: 1rem;
    }
    
    .user-info {
      font-size: 0.9rem;
    }
  </style>