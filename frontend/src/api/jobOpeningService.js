import API from './api.js';
import { buildApiUrl } from './config.js';

class JobOpeningService {
  // Get all job openings with optional filters
  async getAllJobOpenings(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      const queryString = params.toString();
      const url = `job-openings/${queryString ? `?${queryString}` : ''}`;
      
      const response = await API.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching job openings:', error);
      throw error;
    }
  }

  // Create a new job opening
  async createJobOpening(jobData) {
    try {
      const response = await API.post('job-openings/', jobData);
      return response.data;
    } catch (error) {
      console.error('Error creating job opening:', error);
      throw error;
    }
  }

  // Get a specific job opening by ID
  async getJobOpening(id) {
    try {
      const response = await API.get(`job-openings/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching job opening:', error);
      throw error;
    }
  }

  // Update a job opening
  async updateJobOpening(id, jobData) {
    try {
      const response = await API.put(`job-openings/${id}/`, jobData);
      return response.data;
    } catch (error) {
      console.error('Error updating job opening:', error);
      throw error;
    }
  }

  // Delete a job opening
  async deleteJobOpening(id) {
    try {
      const response = await API.delete(`job-openings/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting job opening:', error);
      throw error;
    }
  }

  // Search job openings by term (job title or company name)
  async searchJobOpenings(searchTerm) {
    try {
      const response = await API.get(`job-openings/search/?term=${encodeURIComponent(searchTerm)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching job openings:', error);
      throw error;
    }
  }

  // Toggle job opening status (active/inactive)
  async toggleJobStatus(id) {
    try {
      const response = await API.patch(`job-openings/${id}/toggle-status/`);
      return response.data;
    } catch (error) {
      console.error('Error toggling job status:', error);
      throw error;
    }
  }

  // Assign candidate to job opening (if this functionality exists in backend)
  async assignCandidate(jobId, candidateId) {
    try {
      const response = await API.post(`job-openings/${jobId}/assign-candidate/`, {
        candidate_id: candidateId
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning candidate to job:', error);
      throw error;
    }
  }

  // Get job openings with filtering options
  async getFilteredJobOpenings(filters) {
    try {
      const params = new URLSearchParams();
      
      if (filters.is_active !== undefined && filters.is_active !== '') {
        params.append('is_active', filters.is_active);
      }
      if (filters.company) {
        params.append('company', filters.company);
      }
      if (filters.location) {
        params.append('location', filters.location);
      }
      if (filters.skills) {
        params.append('skills', filters.skills);
      }
      
      const queryString = params.toString();
      const url = `job-openings/${queryString ? `?${queryString}` : ''}`;
      
      const response = await API.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching filtered job openings:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const jobOpeningService = new JobOpeningService();
export default jobOpeningService;
