// src/routes/+layout.server.js
export function load({ url }) {
  // We allow these routes to be accessed without authentication
  const publicRoutes = ['/', '/register', '/display'];
  
  // Current path
  const path = url.pathname;
  
  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some(route => path === route);
  
  return {
    isPublicRoute,
    currentPath: path
  };
}