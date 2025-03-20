// src/routes/display/live/+page.js
export const ssr = false; // Disable SSR for this route

export async function load({ fetch }) {
  try {
    const response = await fetch('/api/media/approved');
    const data = await response.json();
    
    if (data.success && data.data && data.data.media) {
      return {
        initialMedia: data.data.media,
        isLive: true
      };
    } else {
      return {
        initialMedia: [],
        error: 'No media available',
        isLive: true
      };
    }
  } catch (error) {
    console.error('Error loading media in load function:', error);
    return {
      initialMedia: [],
      error: 'Failed to load media',
      isLive: true
    };
  }
}