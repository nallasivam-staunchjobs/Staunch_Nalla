// import { API_URL, DEFAULT_HEADERS, REQUEST_TIMEOUT } from './config.js';

// // Get authentication token from localStorage
// const getAuthToken = () => {
//   return localStorage.getItem('access_token');
// };

// // Get refresh token from localStorage
// const getRefreshToken = () => {
//   return localStorage.getItem('refresh_token');
// };

// // Create authenticated headers
// const getAuthHeaders = () => {
//   const token = getAuthToken();
//   return {
//     ...DEFAULT_HEADERS,
//     ...(token && { 'Authorization': `Bearer ${token}` })
//   };
// };

// // API request wrapper with authentication
// export const apiRequest = async (endpoint, options = {}) => {
//   const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  
//   const config = {
//     method: 'GET',
//     headers: getAuthHeaders(),
//     ...options,
//     ...(options.body && { body: options.body })
//   };

//   // Don't override Content-Type if it's already set (for FormData)
//   if (options.headers && !options.headers['Content-Type']) {
//     config.headers = { ...config.headers, ...options.headers };
//   } else if (options.headers) {
//     config.headers = { ...config.headers, ...options.headers };
//   }

//   try {
//     const response = await fetch(url, config);

//     // Handle 401 Unauthorized - token might be expired
//     if (response.status === 401) {
//       const refreshToken = getRefreshToken();
//       if (refreshToken) {
//         try {
//           // Try to refresh the token
//           const refreshResponse = await fetch(`${API_URL}/auth/refresh/`, {
//             method: 'POST',
//             headers: DEFAULT_HEADERS,
//             body: JSON.stringify({ refresh: refreshToken })
//           });

//           if (refreshResponse.ok) {
//             const refreshData = await refreshResponse.json();
//             localStorage.setItem('access_token', refreshData.access);
            
//             // Retry the original request with new token
//             config.headers.Authorization = `Bearer ${refreshData.access}`;
//             const retryResponse = await fetch(url, config);
            
//             if (!retryResponse.ok) {
//               throw new Error(`HTTP error! status: ${retryResponse.status}`);
//             }
            
//             return await retryResponse.json();
//           } else {
//             // Refresh failed, redirect to login
//             localStorage.removeItem('access_token');
//             localStorage.removeItem('refresh_token');
//             window.location.href = '/login';
//             throw new Error('Authentication failed');
//           }
//         } catch (refreshError) {
//           // Refresh failed, redirect to login
//           localStorage.removeItem('access_token');
//           localStorage.removeItem('refresh_token');
//           window.location.href = '/login';
//           throw new Error('Authentication failed');
//         }
//       } else {
//         // No refresh token, redirect to login
//         window.location.href = '/login';
//         throw new Error('Authentication required');
//       }
//     }

//     if (!response.ok) {
//       const errorData = await response.json().catch(() => ({}));
//       throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
//     }

//     // Handle empty responses
//     const contentType = response.headers.get('content-type');
//     if (contentType && contentType.includes('application/json')) {
//       return await response.json();
//     } else {
//       return await response.text();
//     }
//   } catch (error) {
//     console.error('API request failed:', error);
//     throw error;
//   }
// };

// // Multipart form data request (for file uploads)
// export const apiRequestMultipart = async (endpoint, formData, options = {}) => {
//   const token = getAuthToken();
//   const headers = {
//     ...(token && { 'Authorization': `Bearer ${token}` })
//     // Don't set Content-Type for FormData - browser will set it with boundary
//   };

//   return apiRequest(endpoint, {
//     method: 'POST',
//     headers,
//     body: formData,
//     ...options
//   });
// };

// // Utility functions for token management
// export const setAuthTokens = (accessToken, refreshToken) => {
//   localStorage.setItem('access_token', accessToken);
//   localStorage.setItem('refresh_token', refreshToken);
// };

// export const clearAuthTokens = () => {
//   localStorage.removeItem('access_token');
//   localStorage.removeItem('refresh_token');
// };

// export const isAuthenticated = () => {
//   return !!getAuthToken();
// };

// export default {
//   apiRequest,
//   apiRequestMultipart,
//   setAuthTokens,
//   clearAuthTokens,
//   isAuthenticated,
//   getAuthToken,
//   getRefreshToken
// };



import { API_URL, DEFAULT_HEADERS, REQUEST_TIMEOUT } from './config.js';

// Get authentication token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token'); // Changed from 'access_token' to 'token'
};

// Get refresh token from localStorage
const getRefreshToken = () => {
  return localStorage.getItem('refresh_token');
};

// Create authenticated headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    ...DEFAULT_HEADERS,
    ...(token && { 'Authorization': `Token ${token}` }) // Changed from 'Bearer' to 'Token'
  };
};

// API request wrapper with authentication
export const apiRequest = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  
  const config = {
    method: 'GET',
    headers: getAuthHeaders(),
    ...options,
    ...(options.body && { body: options.body })
  };

  // Don't override Content-Type if it's already set (for FormData)
  if (options.headers && !options.headers['Content-Type']) {
    config.headers = { ...config.headers, ...options.headers };
  } else if (options.headers) {
    config.headers = { ...config.headers, ...options.headers };
  }

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized - token might be expired
    if (response.status === 401) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          // Try to refresh the token
          const refreshResponse = await fetch(`${API_URL}/auth/refresh/`, {
            method: 'POST',
            headers: DEFAULT_HEADERS,
            body: JSON.stringify({ refresh: refreshToken })
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            localStorage.setItem('token', refreshData.access);
            
            // Retry the original request with new token
            config.headers.Authorization = `Token ${refreshData.access}`;
            const retryResponse = await fetch(url, config);
            
            if (!retryResponse.ok) {
              throw new Error(`HTTP error! status: ${retryResponse.status}`);
            }
            
            return await retryResponse.json();
          } else {
            // Refresh failed, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/';
            throw new Error('Authentication failed');
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/';
          throw new Error('Authentication failed');
        }
      } else {
        // No refresh token, redirect to login
        window.location.href = '/';
        throw new Error('Authentication required');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Multipart form data request (for file uploads)
export const apiRequestMultipart = async (endpoint, formData, options = {}) => {
  const token = getAuthToken();
  const headers = {
    ...(token && { 'Authorization': `Bearer ${token}` })
    // Don't set Content-Type for FormData - browser will set it with boundary
  };

  return apiRequest(endpoint, {
    method: 'POST',
    headers,
    body: formData,
    ...options
  });
};

// Utility functions for token management
export const setAuthTokens = (accessToken, refreshToken) => {
  localStorage.setItem('token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

export const clearAuthTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export default {
  apiRequest,
  apiRequestMultipart,
  setAuthTokens,
  clearAuthTokens,
  isAuthenticated,
  getAuthToken,
  getRefreshToken
};
