/**
 * Application & API Configuration Utility
 * 
 * Automatically handles local development vs production URLs.
 * You can set custom URLs here or via environment variables in .env:
 * VITE_API_BASE_URL=https://yourdomain.com/api
 */

// Production base URL fallback (Set your live server/domain here if needed)
const PRODUCTION_API_URL = '';

/**
 * Returns the base API URL dynamically based on environment
 */
export const getApiBaseUrl = () => {
  // 1. Check if VITE_API_BASE_URL is explicitly set in .env
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 2. If production URL constant is specified above
  if (import.meta.env.PROD && PRODUCTION_API_URL) {
    return PRODUCTION_API_URL;
  }

  // 3. Default relative path for unified deployment (e.g. /api)
  // This automatically uses whatever domain the app is running on (e.g. https://yourdomain.com/api)
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();
