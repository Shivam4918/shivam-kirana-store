import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API response cache store
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 seconds cache TTL for instant snappy navigation

const CACHABLE_URLS = [
  '/products/',
  '/banners/',
  '/configs/'
];

const getCacheKey = (config) => {
  const paramsStr = config.params ? JSON.stringify(config.params) : '';
  return `${config.url || ''}?${paramsStr}`;
};

// Attach access token to every outgoing request if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Serve cached GET response if present and valid
    if (config.method === 'get') {
      const cacheKey = getCacheKey(config);
      const isCacheable = CACHABLE_URLS.some(url => config.url && config.url.includes(url));
      if (isCacheable) {
        const cached = apiCache.get(cacheKey);
        if (cached && Date.now() < cached.expiry) {
          config.adapter = () => {
            return Promise.resolve({
              data: cached.data,
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
              request: {}
            });
          };
        }
      }
    }

    // Invalidate related cache keys on mutations
    if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
      const url = config.url || '';
      if (url.includes('/products/')) {
        for (const key of apiCache.keys()) {
          if (key.includes('/products/')) {
            apiCache.delete(key);
          }
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept 401 unauthorized errors to refresh access tokens automatically
api.interceptors.response.use(
  (response) => {
    const config = response.config;
    if (config && config.method === 'get') {
      const cacheKey = getCacheKey(config);
      const isCacheable = CACHABLE_URLS.some(url => config.url && config.url.includes(url));
      if (isCacheable && response.status === 200) {
        apiCache.set(cacheKey, {
          data: response.data,
          expiry: Date.now() + CACHE_TTL
        });
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is 401 Unauthorized and not already retried
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login/') &&
      !originalRequest.url.includes('/auth/token/refresh/')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          
          if (res.status === 200) {
            localStorage.setItem('access_token', res.data.access);
            if (res.data.refresh) {
              localStorage.setItem('refresh_token', res.data.refresh);
            }
            
            // Re-configure header and replay request
            originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Token refresh failed. Only force logout if the server explicitly rejected the refresh token (400 or 401)
          if (refreshError.response && (refreshError.response.status === 400 || refreshError.response.status === 401)) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            
            // Sync logout event across other tabs
            localStorage.setItem('logout-event', Date.now().toString());
            localStorage.removeItem('logout-event');
            
            window.location.href = '/login?expired=true';
          }
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
