import axios from 'axios';
import { API_URL, DEFAULT_HEADERS, REQUEST_TIMEOUT } from './config.js';

const API = axios.create({
  baseURL: API_URL,
  headers: DEFAULT_HEADERS,
  timeout: REQUEST_TIMEOUT,
});

// Add request interceptor
API.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// Revenue API endpoints
export const revenueService = {
  // GET all revenue records
  fetchRevenues: async () => {
    try {
      const response = await API.get('/candidate-revenues/');
      return response.data;
    } catch (error) {
      console.error('Error fetching revenues:', error);
      throw error;
    }
  },

  // GET revenue by ID
  fetchRevenueById: async (id) => {
    try {
      const response = await API.get(`/candidate-revenues/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue by ID:', error);
      throw error;
    }
  },

  // CREATE new revenue record
  createRevenue: async (revenueData) => {
    try {
      const response = await API.post('/candidate-revenues/', revenueData);
      return response.data;
    } catch (error) {
      console.error('Error creating revenue:', error);
      throw error;
    }
  },

  // UPDATE revenue record
  updateRevenue: async (id, revenueData) => {
    try {
      const response = await API.put(`/candidate-revenues/${id}/`, revenueData);
      return response.data;
    } catch (error) {
      console.error('Error updating revenue:', error);
      throw error;
    }
  },

  // PARTIAL UPDATE revenue record
  patchRevenue: async (id, revenueData) => {
    try {
      const response = await API.patch(`/candidate-revenues/${id}/`, revenueData);
      return response.data;
    } catch (error) {
      console.error('Error patching revenue:', error);
      throw error;
    }
  },

  // DELETE revenue record
  deleteRevenue: async (id) => {
    try {
      const response = await API.delete(`/candidate-revenues/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting revenue:', error);
      throw error;
    }
  },

  // GET revenues by candidate ID
  getRevenuesByCandidate: async (candidateId) => {
    try {
      const response = await API.get(`/candidate-revenues/?candidate=${candidateId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching revenues by candidate:', error);
      throw error;
    }
  },

  // GET revenues by candidate ID
  fetchRevenuesByCandidate: async (candidateId) => {
    try {
      const response = await API.get(`/candidate-revenues/?candidate=${candidateId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching revenues by candidate:', error);
      throw error;
    }
  },

  // GET candidates (for dropdown/selection)
  fetchCandidates: async () => {
    try {
      const response = await API.get('/candidates/');
      return response.data;
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw error;
    }
  },

  // Create feedback for a revenue record
  createFeedback: async (feedbackData) => {
    try {
      const response = await API.post('/candidate-revenue-feedbacks/', feedbackData);
      return response.data;
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw error;
    }
  },

  // Get feedbacks by revenue ID
  getFeedbacksByRevenue: async (revenueId) => {
    try {
      const response = await API.get(`/candidate-revenue-feedbacks/?candidate_revenue_id=${revenueId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      throw error;
    }
  },

  // Update client job status
  updateClientJobStatus: async (candidateId, status) => {
    try {
      const response = await API.put(`/candidates/${candidateId}/update-job-status/`, {
        status: status
      });
      return response.data;
    } catch (error) {
      console.error('Error updating client job status:', error);
      throw error;
    }
  },

  // Test backend connection
  testConnection: async () => {
    try {
      const response = await API.get('/candidate-revenues/');
      return { success: true, status: response.status, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status,
        details: error.response?.data 
      };
    }
  }
};

export default revenueService;
