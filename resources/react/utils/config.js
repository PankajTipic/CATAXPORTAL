/**
 * Application & API Configuration Utility
 *
 * Centralized API base URL management supporting:
 * - Local Development: http://localhost:8000
 * - Production: https://tiqtax.tipic.co.in
 *
 * Reads from environment variables (VITE_API_BASE_URL or API_BASE_URL)
 * with robust fallbacks and slash sanitization to prevent double slashes.
 */

// Fallback production URL when env variable is missing in production
const DEFAULT_PRODUCTION_URL = "https://tiqtax.tipic.co.in";

// Fallback local development URL when env variable is missing in development
const DEFAULT_DEVELOPMENT_URL = "http://localhost:8000";

/**
 * Remove trailing slash(es) from a URL or path
 * @param {string} url
 * @returns {string}
 */
export const stripTrailingSlash = (url = "") => {
  return typeof url === "string" ? url.trim().replace(/\/+$/, "") : "";
};

/**
 * Remove leading slash(es) from a URL or path
 * @param {string} path
 * @returns {string}
 */
export const stripLeadingSlash = (path = "") => {
  return typeof path === "string" ? path.trim().replace(/^\/+/, "") : "";
};

/**
 * Returns the base API URL dynamically based on environment variable or fallback
 * @returns {string} Base URL without trailing slash (e.g. 'http://localhost:8000')
 */
export const getApiBaseUrl = () => {
  // 1. Read from environment variables (Vite prefix VITE_ or API_ prefix)
  const envUrl =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.API_BASE_URL;

  if (envUrl && typeof envUrl === "string" && envUrl.trim() !== "") {
    return stripTrailingSlash(envUrl);
  }

  // 2. Fallback when environment variable is not defined
  if (import.meta.env.PROD) {
    if (
      typeof window !== "undefined" &&
      window.location?.origin &&
      !window.location.origin.includes("localhost")
    ) {
      return stripTrailingSlash(window.location.origin);
    }
    return stripTrailingSlash(DEFAULT_PRODUCTION_URL);
  }

  return stripTrailingSlash(DEFAULT_DEVELOPMENT_URL);
};

/**
 * Central API Base URL
 * e.g. "http://localhost:8000" in dev, "https://tiqtax.tipic.co.in" in prod
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Build an API URL ensuring no double slash (//) when joining the base URL and the endpoint.
 * Also prevents redundant "/api/api" if both base URL and endpoint contain "/api".
 *
 * Example:
 *   buildApiUrl('/api/itr/login-fetch')
 *   => "http://localhost:8000/api/itr/login-fetch" (dev)
 *   => "https://tiqtax.tipic.co.in/api/itr/login-fetch" (prod)
 *
 * @param {string} endpoint - The relative endpoint path (e.g. '/api/itr/login-fetch')
 * @returns {string} Complete, sanitized URL
 */
export const buildApiUrl = (endpoint = "") => {
  const base = stripTrailingSlash(API_BASE_URL);
  let path = stripLeadingSlash(endpoint);

  // Normalize duplicate /api if both base URL and endpoint specify it
  if (base.endsWith("/api") && path.startsWith("api/")) {
    path = path.slice(4).replace(/^\/+/, "");
  }

  return path ? `${base}/${path}` : base;
};

export default {
  API_BASE_URL,
  getApiBaseUrl,
  buildApiUrl,
  stripTrailingSlash,
  stripLeadingSlash,
};
