<script>
  import { page } from '$app/stores';
  import { user } from '$lib/auth';
  import Header from './Header.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  
  export let activePage = '';
  
  // Determine if the current page is a display page
  $: isDisplayPage = $page.url.pathname === '/display' || 
                     $page.url.pathname.startsWith('/display/');
</script>

<div class="app-shell" class:display-page={isDisplayPage}>
  {#if !isDisplayPage}
    <Header {activePage} />
    
    <div class="content-wrapper">
      <main class="main-content">
        <slot />
      </main>
      
      <footer class="footer">
        <div class="container">
          <div class="footer-content">
            <div class="copyright">
              © {new Date().getFullYear()} TV Media Queuer
            </div>
            <!-- <div class="theme-toggle-wrapper">
              <ThemeToggle />
            </div> -->
          </div>
        </div>
      </footer>
    </div>
  {:else}
    <!-- For display pages, just render the content without any shell -->
    <slot />
  {/if}
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--color-background);
    color: var(--color-text-primary);
    width: 100%;
  }
  
  .content-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    width: 100%;
  }
  
  .main-content {
    flex: 1;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-6) var(--space-4);
  }
  
  .footer {
    border-top: 1px solid var(--color-border);
    padding: var(--space-4) 0;
    margin-top: var(--space-8);
    background-color: var(--color-surface);
  }
  
  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .copyright {
    font-size: var(--font-size-sm);
    color: var(--color-text-tertiary);
  }
  
  .theme-toggle-wrapper {
    display: flex;
    align-items: center;
  }
  
  /* For display pages */
  .app-shell.display-page {
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .main-content {
      padding: var(--space-4) var(--space-3);
    }
    
    .footer-content {
      flex-direction: column;
      gap: var(--space-3);
      text-align: center;
    }
  }
</style> 