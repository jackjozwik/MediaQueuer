<script>
  import { onMount } from 'svelte';
  
  let theme = 'light';
  
  // Function to set theme and update localStorage
  function setTheme(newTheme) {
    theme = newTheme;
    
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }
  
  // Toggle between light and dark themes
  function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }
  
  // Initialize theme on mount
  onMount(() => {
    // Check for user preference in localStorage
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      // User has a saved preference
      setTheme(savedTheme);
    } else {
      // Check for system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  });
</script>

<button class="theme-toggle" on:click={toggleTheme} aria-label="Toggle theme">
  {#if theme === 'light'}
    <!-- Moon icon for dark mode -->
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
    </svg>
  {:else}
    <!-- Sun icon for light mode -->
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2"></path>
      <path d="M12 20v2"></path>
      <path d="m4.93 4.93 1.41 1.41"></path>
      <path d="m17.66 17.66 1.41 1.41"></path>
      <path d="M2 12h2"></path>
      <path d="M20 12h2"></path>
      <path d="m6.34 17.66-1.41 1.41"></path>
      <path d="m19.07 4.93-1.41 1.41"></path>
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    color: var(--color-text-secondary);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: var(--transition-all);
  }
  
  .theme-toggle:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-text-primary);
  }
  
  .theme-toggle:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-primary);
  }
</style> 