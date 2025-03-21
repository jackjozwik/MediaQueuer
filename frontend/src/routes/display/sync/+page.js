// src/routes/display/sync/+page.js
export const ssr = false;
export const csr = true;

export async function load({ fetch }) {
  try {
    const response = await fetch('/api/media/sync-state');
    const result = await response.json();
    
    if (result.success && result.data) {
      console.log('Successfully loaded initial sync state');
      return {
        initialState: result.data.state,
        initialMedia: result.data.media,
        timeInfo: result.data.timeInfo
      };
    } else {
      console.error('Failed to load sync state:', result);
      return {
        error: 'Failed to load display data',
        initialState: null,
        initialMedia: []
      };
    }
  } catch (error) {
    console.error('Error in load function:', error);
    return {
      error: `Failed to load: ${error.message}`,
      initialState: null,
      initialMedia: []
    };
  }
} 