import axios from 'axios';
import { API_URL, DEFAULT_HEADERS, MULTIPART_HEADERS, REQUEST_TIMEOUT, ENDPOINTS, buildApiUrl } from '../api/config.js';

// Create axios instance
const API = axios.create({
  baseURL: API_URL,
  headers: DEFAULT_HEADERS,
  timeout: REQUEST_TIMEOUT,
});

// Helper for CSRF token
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Employee Services
export const employeeService = {
  getAll: async () => {
    try {
      const response = await API.get(ENDPOINTS.EMPLOYEES);
      return response.data;
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  },

  create: async (employeeData) => {
    try {
      const response = await API.post(ENDPOINTS.EMPLOYEES, employeeData);
      return response.data;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  },

  update: async (id, formData) => {
    try {
      const response = await axios.put(
        buildApiUrl(`${ENDPOINTS.EMPLOYEES}/${id}/`),
        formData,
        {
          headers: MULTIPART_HEADERS,
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await API.delete(`${ENDPOINTS.EMPLOYEES}/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }
};

// Master Data Services
export const masterService = {
  getGenders: async () => {
    try {
      const response = await API.get('masters/genders/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching genders:', error);
      throw error;
    }
  },

  getSources: async () => {
    try {
      const response = await API.get('masters/sources/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching sources:', error);
      throw error;
    }
  },

  getCommunications: async () => {
    try {
      const response = await API.get('masters/communications/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching communications:', error);
      throw error;
    }
  },

  getDesignations: async () => {
    try {
      const response = await API.get('masters/designations/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching designations:', error);
      throw error;
    }
  },

  getIndustries: async () => {
    try {
      const response = await API.get('masters/industries/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching industries:', error);
      throw error;
    }
  },

  getRemarks: async () => {
    try {
      const response = await API.get('masters/remarks/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching remarks:', error);
      throw error;
    }
  },

  getEducations: async () => {
    try {
      const response = await API.get('masters/educations/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching educations:', error);
      throw error;
    }
  },

  getExperiences: async () => {
    try {
      const response = await API.get('masters/experience/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching experiences:', error);
      throw error;
    }
  },

  getMaritalStatuses: async () => {
    try {
      const response = await API.get('masters/maritalstatuses/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching marital statuses:', error);
      throw error;
    }
  },

  getBloodGroups: async () => {
    try {
      const response = await API.get('masters/bloodgroups/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching blood groups:', error);
      throw error;
    }
  },

  getAllMasterData: async () => {
    try {
      const [genders, sources, communications, designations, industries, remarks, educations, experiences, maritalStatuses, bloodGroups] = await Promise.all([
        API.get('masters/genders/'),
        API.get('masters/sources/'),
        API.get('masters/communications/'),
        API.get('masters/designations/'),
        API.get('masters/industries/'),
        API.get('masters/remarks/'),
        API.get('masters/educations/'),
        API.get('masters/experience/'),
        API.get('masters/maritalstatuses/'),
        API.get('masters/bloodgroups/')
      ]);

      return {
        genders: genders.data.filter(item => item.status === 'Active'),
        sources: sources.data.filter(item => item.status === 'Active'),
        communications: communications.data.filter(item => item.status === 'Active'),
        designations: designations.data.filter(item => item.status === 'Active'),
        industries: industries.data.filter(item => item.status === 'Active'),
        remarks: remarks.data.filter(item => item.status === 'Active'),
        educations: educations.data.filter(item => item.status === 'Active'),
        experiences: experiences.data.filter(item => item.status === 'Active'),
        maritalStatuses: maritalStatuses.data.filter(item => item.status === 'Active'),
        bloodGroups: bloodGroups.data.filter(item => item.status === 'Active')
      };
    } catch (error) {
      console.error('Error fetching master data:', error);
      throw error;
    }
  }
};

// Revenue Services
export const revenueService = {
  getAll: async () => {
    try {
      const response = await API.get(ENDPOINTS.REVENUES);
      return response.data;
    } catch (error) {
      console.error('Error fetching revenues:', error);
      throw error;
    }
  },

  create: async (revenueData) => {
    try {
      const response = await API.post(ENDPOINTS.REVENUES, revenueData);
      return response.data;
    } catch (error) {
      console.error('Error creating revenue:', error);
      throw error;
    }
  },

  update: async (id, revenueData) => {
    try {
      const response = await API.put(`${ENDPOINTS.REVENUES}/${id}/`, revenueData);
      return response.data;
    } catch (error) {
      console.error('Error updating revenue:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await API.delete(`${ENDPOINTS.REVENUES}/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting revenue:', error);
      throw error;
    }
  }
};

// Invoice Services
export const invoiceService = {
  getAll: async () => {
    try {
      const response = await API.get(ENDPOINTS.INVOICES);
      return response.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },

  create: async (invoiceData) => {
    try {
      const response = await API.post(ENDPOINTS.INVOICES, invoiceData);
      return response.data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  },

  update: async (id, invoiceData) => {
    try {
      const response = await API.put(`${ENDPOINTS.INVOICES}/${id}/`, invoiceData);
      return response.data;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await API.delete(`${ENDPOINTS.INVOICES}/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }
};

// Candidate Services
export const candidateService = {
  getFeedback: async (candidateId) => {
    try {
      const response = await API.get(`candidate-feedback/?candidate_id=${candidateId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching candidate feedback:', error);
      throw error;
    }
  },

  getAll: async () => {
    try {
      const response = await API.get(ENDPOINTS.CANDIDATES);
      return response.data;
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw error;
    }
  },

  create: async (candidateData) => {
    try {
      const response = await API.post(ENDPOINTS.CANDIDATES, candidateData);
      return response.data;
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  },

  update: async (id, candidateData) => {
    try {
      const response = await API.put(`${ENDPOINTS.CANDIDATES}/${id}/`, candidateData);
      return response.data;
    } catch (error) {
      console.error('Error updating candidate:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await API.delete(`${ENDPOINTS.CANDIDATES}/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting candidate:', error);
      throw error;
    }
  }
};

// Test connection service
export const testConnection = async () => {
  try {
    const response = await API.get('/health/');
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
};

export default API;
