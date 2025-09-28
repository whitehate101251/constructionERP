// API utility functions - Force backend URL for production
const API_BASE_URL = 'https://erp-backend-lm5c.onrender.com';

// Debug log to see what URL is being used
console.log('API_BASE_URL:', API_BASE_URL, 'VITE_API_URL:', import.meta.env.VITE_API_URL);

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);
  return response;
};

export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function for authenticated requests
export const apiCallAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  return apiCall(endpoint, {
    ...options,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
};
