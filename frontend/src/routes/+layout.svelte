<!-- src/routes/+layout.svelte -->
<script>
    import { onMount, afterUpdate } from 'svelte';
    import { initAuth, isAuthenticated, user, authInitialized, isTokenValidating, tokenValidated } from '$lib/auth';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import AppShell from '../components/AppShell.svelte';
    import '../lib/global.css';
  
    // Initialize auth on mount
    onMount(() => {
      initAuth();
      
      // Add a global event listener for auth errors
      window.addEventListener('unauthorized', (event) => {
        console.log('Unauthorized event received:', event.detail);
        // If we're not already on the login page, redirect there
        if (!isPublicRoute && $page.url.pathname !== '/login') {
          goto('/login');
        }
      });
      
      return () => {
        window.removeEventListener('unauthorized', () => {});
      };
    });
  
    // Get the current path from the page store and determine the active page
    $: currentPath = $page.url.pathname;
    $: activePage = currentPath === '/' ? 'home' 
                   : currentPath.startsWith('/upload') ? 'upload'
                   : currentPath.startsWith('/display') ? 'display'
                   : currentPath.startsWith('/admin') ? 'admin'
                   : '';
    
    // Determine if the current route is public
    $: isPublicRoute = ['/', '/login', '/register', '/display', '/logout'].includes(currentPath) || 
                      currentPath.startsWith('/display/');
    
    // Determine if the current page is a display page
    $: isDisplayPage = currentPath === '/display' || currentPath.startsWith('/display/');
    
    // Show loading indicator during authentication
    let isLoading = false;
    
    $: {
      // Set loading state based on initialization and validation status
      isLoading = !$authInitialized || $isTokenValidating;
      
      console.log('Auth state updated:', {
        isLoading,
        authInitialized: $authInitialized,
        isAuthenticated: $isAuthenticated,
        isTokenValidating: $isTokenValidating,
        tokenValidated: $tokenValidated
      });
      
      // Redirect if not authenticated and not on a public route
      // Only redirect after auth initialization and token validation is complete
      if (typeof window !== 'undefined' && 
          $authInitialized && 
          !$isTokenValidating && 
          !$isAuthenticated && 
          !isPublicRoute) {
        console.log('Redirecting to login due to auth state');
        goto('/login');
      }
    }
    
    // Cleanup display mode when navigating away
    $: if (typeof document !== 'undefined') {
      if (isDisplayPage) {
        document.body.classList.add('display-page');
      } else {
        document.body.classList.remove('display-page');
        // If coming from display page, ensure body has scrolling
        document.body.style.overflow = 'auto';
      }
    }
  </script>
  
  {#if isLoading && !isPublicRoute}
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>Authenticating...</p>
    </div>
  {/if}
  
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
    
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(255, 255, 255, 0.8);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }
    
    .spinner {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 4px solid #f3f3f3;
      border-top: 4px solid var(--color-primary);
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>