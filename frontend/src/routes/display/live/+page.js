// src/routes/display/live/+page.js
export const ssr = false;
export const csr = true;

export async function load({ fetch }) {
  try {
    // We still fetch initial media to populate the store
    const response = await fetch('/api/media/display-state');
    const data = await response.json();
    
    console.log('Initial live display state loaded:', data.success);
    
    return {
      initialState: data.success ? data.data.state : null,
      initialMedia: data.success ? data.data.media : []
    };
  } catch (error) {
    console.error('Error loading initial display state:', error);
    return {
      initialState: null,
      initialMedia: [],
      error: 'Failed to load display state'
    };
  }
}