<!-- src/routes/display/+layout.svelte -->
<script>
  // This is a minimal layout for the display route
  // It doesn't include any navigation or headers
  
  // Import a global CSS file instead of using :global in the component
  import './display.css';
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