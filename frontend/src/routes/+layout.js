import { browser } from '$app/environment';

export const ssr = false;
export const csr = true;

// Initialize the theme when the page loads in the browser
export const load = async ({ url }) => {
  if (browser) {
    // Check for theme in localStorage
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      // User has a saved preference
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // Check for system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = prefersDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
  
  return {
    url: url.pathname
  };
};