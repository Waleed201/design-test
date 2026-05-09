// Prod: all /api requests go through Nginx, which proxies to BACKEND_URL
export const environment = {
  production: true,
  apiBase: '/api'
};
