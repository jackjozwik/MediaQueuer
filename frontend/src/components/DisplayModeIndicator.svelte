<script>
  // Component to show what display mode is active (normal or synchronized)
  export let mode = 'normal'; // 'normal' or 'sync'
  
  let visible = true;
  let timer;
  
  // Hide after 3 seconds
  function startHideTimer() {
    clearTimeout(timer);
    visible = true;
    
    timer = setTimeout(() => {
      visible = false;
    }, 3000);
  }
  
  // Show on hover
  function handleMouseEnter() {
    clearTimeout(timer);
    visible = true;
  }
  
  function handleMouseLeave() {
    startHideTimer();
  }
  
  // Show on component mount then hide
  import { onMount, onDestroy } from 'svelte';
  
  onMount(() => {
    startHideTimer();
  });
  
  onDestroy(() => {
    clearTimeout(timer);
  });
</script>

{#if visible}
<div 
  class="mode-indicator"
  class:sync-mode={mode === 'sync'}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
>
  <span class="mode-text">
    {#if mode === 'sync'}
      SYNC MODE
    {:else}
      INDIVIDUAL MODE
    {/if}
  </span>
</div>
{/if}

<style>
  .mode-indicator {
    position: fixed;
    top: 10px;
    left: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    z-index: 1000;
    user-select: none;
    opacity: 0.8;
    transition: opacity 0.2s ease, background-color 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .mode-indicator:hover {
    opacity: 1;
  }
  
  .sync-mode {
    background-color: rgba(44, 62, 80, 0.8);
  }
  
  .mode-text {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .mode-text::before {
    content: "";
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #2ecc71;
  }
  
  .sync-mode .mode-text::before {
    background-color: #3498db;
  }
</style> 