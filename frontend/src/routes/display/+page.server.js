// src/routes/display/+page.server.js
export const ssr = false; // Disable SSR for this route

export async function load({ fetch }) {
  try {
    const response = await fetch('/api/media/approved');
    const data = await response.json();
    
    if (data.success && data.data && data.data.media) {
      return {
        initialMedia: data.data.media
      };
    } else {
      return {
        initialMedia: [],
        error: 'No media available'
      };
    }
  } catch (error) {
    console.error('Error loading media in server load function:', error);
    return {
      initialMedia: [],
      error: 'Failed to load media'
    };
  }
}