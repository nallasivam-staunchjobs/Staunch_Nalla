// API Configuration
// Centralized configuration for all API services

// Get base URL from environment variable with fallback
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Remove trailing slash if present for consistency
export const API_URL = API_BASE_URL.replace(/\/$/, '');

// Base URL without /api suffix for file uploads and static content
export const BASE_URL = API_URL.replace('/api', '');

// Common headers for API requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// Multipart form headers for file uploads
export const MULTIPART_HEADERS = {
  'Content-Type': 'multipart/form-data',
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 100000;

// 🔑 Auth type: "token" (DRF TokenAuthentication) or "jwt" (JWTAuthentication)
export const AUTH_TYPE = "token";   // 👈 added this

// API endpoints (always trailing slash for DRF)
export const ENDPOINTS = {
  EMPLOYEES: '/employees/',
  CANDIDATES: '/candidates/',
  CLIENT_JOBS: '/client-jobs/',
  EDUCATION_CERTIFICATES: '/education-certificates/',
  EXPERIENCE_COMPANIES: '/experience-companies/',
  PREVIOUS_COMPANIES: '/previous-companies/',   // ✅ fixed duplicate
  ADDITIONAL_INFO: '/additional-info/',
  CANDIDATE_FEEDBACK: '/candidate-feedback/',
  REVENUES: '/candidate-revenues/',
  FEEDBACKS: '/candidate-revenue-feedbacks/',
  INVOICES: '/invoices/',
  MASTERS: '/masters/',
  VENDORS: '/vendors/',
  LOGIN: '/login/',   // ✅ added explicitly
};

// Utility function to build full API URL
export const buildApiUrl = (endpoint) => `${API_URL}${endpoint}`;

// Utility function to build file URL safely
export const buildFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath; // already full URL
  if (!filePath.startsWith('/')) filePath = '/' + filePath;
  return `${BASE_URL}${filePath}`;
};

// API Configuration loaded
