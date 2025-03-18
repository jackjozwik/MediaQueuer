<!-- src/routes/home/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { user, isAuthenticated } from '$lib/auth';
  
  // Reactive declarations
  $: isAdmin = $user && $user.role === 'admin';
  $: isFaculty = $user && $user.role === 'faculty';
  $: userName = $user ? ($user.preferredName || $user.firstName) : 'User';
</script>

<svelte:head>
  <title>Home - TV Media Queuer</title>
</svelte:head>

<div class="home-container">
  <div class="welcome-card">
    <h1>Welcome, {userName}!</h1>
    <p>This application helps manage content for the hallway TVs to showcase student work.</p>
  </div>
  
  <div class="action-cards">
    <div class="card">
      <h2>Upload Media</h2>
      <p>
        Upload animations, VFX clips, turntables, or still images to be displayed on the hallway TVs.
      </p>
      <a href="/upload" class="button">Upload Media →</a>
    </div>
    
    {#if isAdmin || isFaculty}
      <div class="card">
        <h2>Approve Content</h2>
        <p>
          Review and approve content submitted by students before it appears on the displays.
        </p>
        <a href="/admin" class="button">Go to Admin Panel →</a>
      </div>
    {/if}
    
    <div class="card">
      <h2>View Display</h2>
      <p>
        See what's currently playing on the hallway displays or open the display in fullscreen mode.
      </p>
      <a href="/display" target="_blank" class="button">Open Display →</a>
    </div>
  </div>
</div>

<style>
  .home-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }
  
  .welcome-card {
    background-color: #e3f2fd;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .welcome-card h1 {
    margin-top: 0;
    color: #1976d2;
  }
  
  .action-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .card {
    background-color: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
  }
  
  .card h2 {
    margin-top: 0;
    color: #333;
  }
  
  .card p {
    flex-grow: 1;
    margin-bottom: 1.5rem;
  }
  
  .button {
    display: inline-block;
    background-color: #1976d2;
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 500;
    text-align: center;
    transition: background-color 0.2s;
  }
  
  .button:hover {
    background-color: #1565c0;
  }
</style>