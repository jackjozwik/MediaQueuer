<!-- src/routes/+layout.svelte -->
<script>
    import { onMount } from 'svelte';
    import { initAuth, isAuthenticated, user } from '$lib/auth';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import AppShell from '../components/AppShell.svelte';
    import '../lib/global.css';
  
    // Initialize auth on mount
    onMount(() => {
      initAuth();
    });
  
    // Get the current path from the page store and determine the active page
    $: currentPath = $page.url.pathname;
    $: activePage = currentPath === '/' ? 'home' 
                   : currentPath.startsWith('/upload') ? 'upload'
                   : currentPath.startsWith('/display') ? 'display'
                   : currentPath.startsWith('/admin') ? 'admin'
                   : '';
    
    // Determine if the current route is public
    $: isPublicRoute = ['/', '/login', '/register', '/display'].includes(currentPath) || currentPath.startsWith('/display/');
    
    // Determine if the current page is a display page
    $: isDisplayPage = currentPath === '/display' || currentPath.startsWith('/display/');
    
    // Redirect if not authenticated and not on a public route
    $: {
      if (typeof window !== 'undefined' && !$isAuthenticated && !isPublicRoute) {
        goto('/login');
      }
    }
    
    // Set body class for display pages
    $: if (typeof document !== 'undefined') {
      if (isDisplayPage) {
        document.body.classList.add('display-page');
      } else {
        document.body.classList.remove('display-page');
      }
    }
  </script>
  
  <AppShell {activePage}>
    <slot />
  </AppShell>
  
  <style>
    .app {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background-color: var(--color-background);
      color: var(--color-text-primary);
    }
    
    .content {
      flex: 1;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--space-6) var(--space-4);
    }
    
    /* For display pages, content takes full screen */
    :global(body.display-page) .content {
      max-width: none;
      padding: 0;
      margin: 0;
      width: 100vw;
      height: 100vh;
    }
  </style>