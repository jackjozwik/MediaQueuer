<!-- src/routes/logout/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { logout } from '$lib/auth';
  
  onMount(() => {
    // Execute logout and redirect to home page
    logout();
    goto('/');
  });
</script>

<div class="logout-page">
  <div class="card">
    <div class="card-body">
      <p>Logging you out...</p>
    </div>
  </div>
</div>

<style>
  .logout-page {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 200px);
  }
</style> 