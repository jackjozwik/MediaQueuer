<!-- src/routes/display/Debug.svelte -->
<script>
    export let item = null;
    export let visible = false;
  </script>
  
  {#if visible && item}
    <div class="debug-panel">
      <h3>Debug Info</h3>
      <div class="debug-content">
        <div>
          <strong>Title:</strong> {item.title || 'undefined'}
        </div>
        <div>
          <strong>File Type:</strong> {item.file_type || 'undefined'}
        </div>
        <div>
          <strong>Metadata Raw:</strong> {JSON.stringify(item.metadata) || 'undefined'}
        </div>
        <div>
          <strong>hide_info:</strong> {item.metadata?.hide_info?.toString() || 'undefined'}
        </div>
        <div>
          <strong>hide_title:</strong> {item.metadata?.hide_title?.toString() || 'undefined'}
        </div>
        <div>
          <strong>hide_description:</strong> {item.metadata?.hide_description?.toString() || 'undefined'}
        </div>
        <div>
          <strong>hide_creator:</strong> {item.metadata?.hide_creator?.toString() || 'undefined'}
        </div>
      </div>
    </div>
  {/if}
  
  <style>
    .debug-panel {
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      z-index: 9999;
      max-width: 500px;
      max-height: 80vh;
      overflow: auto;
    }
    
    .debug-content {
      font-size: 12px;
      line-height: 1.4;
    }
    
    h3 {
      margin-top: 0;
      margin-bottom: 8px;
      font-size: 14px;
    }
  </style>