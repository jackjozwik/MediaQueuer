<!-- src/routes/display/+layout.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  
  // Import global CSS
  import '../../lib/global.css';
  import './display.css';
  
  onMount(() => {
    // Add display-page class to body when component mounts
    if (typeof document !== 'undefined') {
      document.body.classList.add('display-page');
    }
  });
  
  onDestroy(() => {
    // Remove display-page class when component unmounts
    if (typeof document !== 'undefined') {
      document.body.classList.remove('display-page');
      // Restore normal scrolling behavior
      document.body.style.overflow = 'auto';
    }
  });
</script>

<div class="display-layout">
  <slot></slot>
</div>

<style>
  .display-layout {
    height: 100vh;
    width: 100vw;
    background-color: #000;
    color: white;
    position: relative;
  }
</style>