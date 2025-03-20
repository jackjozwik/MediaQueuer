<!-- src/components/DisplayModeIndicator.svelte -->
<script>
    // Props
    export let mode = 'individual'; // 'live' or 'individual'
    export let isAdmin = false;
    
    // Determine label text
    $: labelText = mode === 'live' 
      ? (isAdmin ? 'LIVE (Admin Control)' : 'LIVE STREAM') 
      : 'INDIVIDUAL VIEW';
    
    // Determine the alternative URL to link to
    $: alternateUrl = mode === 'live' ? '/display' : '/display/live';
  </script>
  
  <div class="mode-indicator">
    <div class="mode-label">
      {#if mode === 'live'}
        <div class="live-indicator"></div>
      {/if}
      <span>{labelText}</span>
    </div>
    
    <a href={alternateUrl} class="mode-toggle">
      Switch to {mode === 'live' ? 'Individual' : 'Live'} Mode
    </a>
  </div>
  
  <style>
    .mode-indicator {
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      z-index: 1010;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 14px;
      backdrop-filter: blur(5px);
      opacity: 0.3;
      transition: opacity 0.3s ease;
    }
    
    .mode-indicator:hover {
      opacity: 1;
    }
    
    .mode-label {
      display: flex;
      align-items: center;
      font-weight: 600;
      gap: 8px;
    }
    
    .live-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #ff3e3e;
      animation: pulse 1.5s infinite;
    }
    
    .mode-toggle {
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      font-size: 12px;
      text-align: center;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    
    .mode-toggle:hover {
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
    }
    
    @keyframes pulse {
      0% {
        opacity: 1;
        box-shadow: 0 0 0 0 rgba(255, 62, 62, 0.7);
      }
      70% {
        opacity: 0.7;
        box-shadow: 0 0 0 8px rgba(255, 62, 62, 0);
      }
      100% {
        opacity: 1;
        box-shadow: 0 0 0 0 rgba(255, 62, 62, 0);
      }
    }
  </style>