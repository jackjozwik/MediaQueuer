<!-- src/components/DebugHelper.svelte -->
<script>
  import { user, isAuthenticated } from '$lib/auth';
</script>

<div class="debug-panel">
  <h4>Debug Info</h4>
  <p>Auth state: {$isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}</p>
  <p>User: {$user ? $user.username : 'None'}</p>
  {#if $user}
    <p>Role: {$user.role}</p>
  {/if}
  <button on:click={() => console.log('Auth state:', { auth: $isAuthenticated, user: $user })}>
    Log Auth State
  </button>
</div>

<style>
  .debug-panel {
    position: fixed;
    bottom: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.8);
    color: lime;
    padding: 10px;
    border-top-left-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    max-width: 300px;
  }
  
  h4 {
    margin-top: 0;
    margin-bottom: 5px;
  }
  
  p {
    margin: 2px 0;
  }
  
  button {
    background: #333;
    color: white;
    border: 1px solid #666;
    padding: 4px 8px;
    margin-top: 5px;
    cursor: pointer;
    font-size: 10px;
  }
</style>