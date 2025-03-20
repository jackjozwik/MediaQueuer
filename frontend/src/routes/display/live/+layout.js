// src/routes/display/live/+layout.js
// This ensures the page can be accessed directly
export const ssr = false;
export const csr = true;

// Define a load function to ensure layout loads properly
export function load() {
  return {
    isLiveMode: true
  };
}