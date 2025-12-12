// Vendor API Service
// Handles all vendor-related API calls including leads, vendors, and status updates

import axios from 'axios';
import { API_URL, DEFAULT_HEADERS, MULTIPART_HEADERS, REQUEST_TIMEOUT } from './config.js';

// Create axios instance for vendor API
export const vendorAPI = axios.create({
  baseURL: `${API_URL}/vendors`,
  headers: DEFAULT_HEADERS,
  timeout: REQUEST_TIMEOUT,
});

// ==================== VENDOR LEADS API ====================

// Get all vendor leads
export const getAllVendorLeads = async () => {
  try {
    const response = await vendorAPI.get('/leads/');
    return response.data;
  } catch (error) {
    console.error('Error fetching vendor leads:', error);
    throw error;
  }
};

// Get vendor lead by ID
export const getVendorLeadById = async (id) => {
  try {
    const response = await vendorAPI.get(`/leads/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching vendor lead ${id}:`, error);
    throw error;
  }
};

// Create new vendor lead
export const createVendorLead = async (leadData) => {
  try {
    const response = await vendorAPI.post('/leads/', leadData);
    return response.data;
  } catch (error) {
    console.error('Error creating vendor lead:', error);
    throw error;
  }
};

// Update vendor lead
export const updateVendorLead = async (id, leadData) => {
  try {
    const response = await vendorAPI.put(`/leads/${id}/`, leadData);
    return response.data;
  } catch (error) {
    console.error(`Error updating vendor lead ${id}:`, error);
    throw error;
  }
};

// Delete vendor lead
export const deleteVendorLead = async (id) => {
  try {
    const response = await vendorAPI.delete(`/leads/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting vendor lead ${id}:`, error);
    throw error;
  }
};

// Convert lead to vendor
export const convertLeadToVendor = async (leadId, vendorData) => {
  try {
    const formData = new FormData();
    
    // Handle all vendor data fields
    for (const key in vendorData) {
      if (key === 'gst_details') {
        // Stringify GST details for backend processing
        const gstDetailsString = JSON.stringify(vendorData[key]);
        formData.append(key, gstDetailsString);
      } else if (key === 'contract_copy') {
        // Handle file upload
        if (vendorData[key] instanceof File) {
          formData.append(key, vendorData[key]);
        }
      } else {
        formData.append(key, vendorData[key]);
      }
    }

    const config = {
      headers: MULTIPART_HEADERS,
    };

    const response = await vendorAPI.post(`/leads/${leadId}/convert_to_vendor/`, formData, config);
    return response.data;
  } catch (error) {
    console.error(`Error converting lead ${leadId} to vendor:`, error);
    throw error;
  }
};

// ==================== VENDORS API ====================

// Get all vendors
export const getAllVendors = async () => {
  try {
    const response = await vendorAPI.get('/vendors/');
    return response.data;
  } catch (error) {
    console.error('Error fetching vendors:', error);
    throw error;
  }
};

// Get vendor by ID
export const getVendorById = async (id) => {
  try {
    const response = await vendorAPI.get(`/vendors/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching vendor ${id}:`, error);
    throw error;
  }
};

// Create new vendor
export const createVendor = async (vendorData) => {
  try {
    const formData = new FormData();
    
    // Handle all vendor data fields
    for (const key in vendorData) {
      if (key === 'gst_details') {
        // Stringify GST details for backend processing
        const gstDetailsString = JSON.stringify(vendorData[key]);
        formData.append(key, gstDetailsString);
      } else if (key === 'contract_copy') {
        // Handle file upload
        if (vendorData[key] instanceof File) {
          formData.append(key, vendorData[key]);
        }
      } else {
        formData.append(key, vendorData[key]);
      }
    }

    const config = {
      headers: MULTIPART_HEADERS,
    };

    const response = await vendorAPI.post('/vendors/', formData, config);
    return response.data;
  } catch (error) {
    console.error('Error creating vendor:', error);
    throw error;
  }
};

// Update vendor
export const updateVendor = async (id, vendorData) => {
  try {
    const formData = new FormData();
    
    // Handle all vendor data fields
    for (const key in vendorData) {
      if (key === 'gst_details') {
        // Stringify GST details for backend processing
        const gstDetailsString = JSON.stringify(vendorData[key]);
        formData.append(key, gstDetailsString);
      } else if (key === 'contract_copy') {
        // Handle file upload
        if (vendorData[key] instanceof File) {
          formData.append(key, vendorData[key]);
        }
      } else {
        formData.append(key, vendorData[key]);
      }
    }

    const config = {
      headers: MULTIPART_HEADERS,
    };

    const response = await vendorAPI.put(`/vendors/${id}/`, formData, config);
    return response.data;
  } catch (error) {
    console.error(`Error updating vendor ${id}:`, error);
    throw error;
  }
};

// Delete vendor
export const deleteVendor = async (id) => {
  try {
    const response = await vendorAPI.delete(`/vendors/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting vendor ${id}:`, error);
    throw error;
  }
};

// ==================== STATUS UPDATES API ====================

// Update vendor lead status
export const updateVendorLeadStatus = async (id, status) => {
  try {
    const response = await vendorAPI.put(`/status/${id}/update_status/`, { status });
    return response.data;
  } catch (error) {
    console.error(`Error updating vendor lead status for ${id}:`, error);
    throw error;
  }
};

// Update vendor status (using vendors endpoint)
export const updateVendorStatus = async (id, status) => {
  try {
    const response = await vendorAPI.post(`/vendors/${id}/update_status/`, { status });
    return response.data;
  } catch (error) {
    console.error(`Error updating vendor status for ${id}:`, error);
    throw error;
  }
};

// ==================== UTILITY FUNCTIONS ====================

// Helper function to handle API errors consistently
export const handleApiError = (error, context = '') => {
  if (error.response) {
    // Server responded with error status
    console.error(`${context} - Server Error:`, error.response.status, error.response.data);
    return error.response.data;
  } else if (error.request) {
    // Request was made but no response received
    console.error(`${context} - Network Error:`, error.request);
    return { error: 'Network error - please check your connection' };
  } else {
    // Something else happened
    console.error(`${context} - Error:`, error.message);
    return { error: error.message };
  }
};

// Export default object with all functions
const vendorService = {
  // Vendor Leads
  getAllVendorLeads,
  getVendorLeadById,
  createVendorLead,
  updateVendorLead,
  deleteVendorLead,
  convertLeadToVendor,
  
  // Vendors
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  
  // Status Updates
  updateVendorLeadStatus,
  updateVendorStatus,
  
  // Utilities
  handleApiError,
};

export default vendorService;
