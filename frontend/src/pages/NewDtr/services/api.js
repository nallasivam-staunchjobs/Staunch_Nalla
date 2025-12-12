import axios from "axios";
import { API_URL, DEFAULT_HEADERS, REQUEST_TIMEOUT } from '../../../api/config.js';

// Create axios instance with base URL from environment configuration
const api = axios.create({
  baseURL: API_URL,
  headers: DEFAULT_HEADERS,
  timeout: REQUEST_TIMEOUT,
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Employee Service
export const employeeService = {
  getEmployeeInfo: async (employeeCode) => {
    try {
      const response = await api.get(`empreg/employee-info/?employeeCode=${employeeCode}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching employee info:", error.response?.data || error.message);
      throw error;
    }
  },
};

// NFD Status Update Service with Smart Caching
export const nfdStatusService = {
  // Cache to prevent frequent API calls
  _lastUpdateTime: null,
  _cacheTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds (optimized for performance)
  _isUpdating: false,
  _lastResult: null,

  /**
   * Update expired NFD jobs to 'open profile' status
   * @returns {Promise} Response with updated job count and details
   */
  updateExpiredNfdJobs: async function() {
    try {
      console.log('🔄 Calling API to update expired NFD jobs...');
      const response = await api.post('update-expired-nfd/');
      
      if (response.data.success) {
        if (response.data.updated_count > 0) {
          console.log(`✅ Successfully updated ${response.data.updated_count} expired NFD jobs`);
        } else {
          console.log(`ℹ️ No expired NFD jobs found to update (${response.data.updated_count} jobs processed)`);
        }
        return response.data;
      } else {
        console.warn('⚠️ NFD update API returned unsuccessful response:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Error updating expired NFD jobs:', error.response?.data || error.message);
      console.error('Full error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        method: error.config?.method
      });
      
      // Return a safe error response instead of throwing
      return {
        success: false,
        updated_count: 0,
        error: error.response?.data?.error || error.message || 'Unknown error',
        status: error.response?.status
      };
    }
  },

  /**
   * Check which jobs have expired NFD dates without updating them
   * @returns {Promise} Response with expired job details
   */
  checkExpiredNfdJobs: async function() {
    try {
      console.log('🔍 Checking for expired NFD jobs...');
      const response = await api.get('check-expired-nfd/');
      
      if (response.data.success) {
        console.log(`📊 Found ${response.data.total_expired_jobs} expired NFD jobs`);
        return response.data;
      } else {
        console.warn('⚠️ NFD check API returned unsuccessful response:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Error checking expired NFD jobs:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Auto-update expired NFD jobs with smart caching to prevent frequent calls
   * Only runs once every 30 minutes to improve performance
   * @returns {Promise<boolean>} True if any jobs were updated
   */
  autoUpdateExpiredNfd: async function() {
    try {
      const now = Date.now();
      
      // Check if we're already updating
      if (this._isUpdating) {
        console.log('⏳ NFD update already in progress, skipping...');
        return this._lastResult?.updated_count > 0 || false;
      }
      
      // Check if we've updated recently (within cache timeout)
      if (this._lastUpdateTime && (now - this._lastUpdateTime) < this._cacheTimeout) {
        const timeLeft = Math.round((this._cacheTimeout - (now - this._lastUpdateTime)) / 1000 / 60);
        console.log(`⚡ NFD update cached, skipping (next update in ${timeLeft}m)`);
        return this._lastResult?.updated_count > 0 || false;
      }
      
      // Set updating flag to prevent concurrent calls
      this._isUpdating = true;
      console.log('🔄 Running NFD auto-update (cache expired)...');
      
      const result = await this.updateExpiredNfdJobs();
      
      // Update cache
      this._lastUpdateTime = now;
      this._lastResult = result;
      
      return result.updated_count > 0;
    } catch (error) {
      console.error('❌ Auto-update expired NFD failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // Mark as failed but don't throw - allow app to continue
      this._lastUpdateTime = now; // Cache the failure to prevent repeated calls
      this._lastResult = { updated_count: 0, error: true };
      
      return false;
    } finally {
      // Always clear the updating flag
      this._isUpdating = false;
    }
  },

  /**
   * Force update expired NFD jobs (bypasses cache)
   * Use this when you specifically need fresh data
   * @returns {Promise<boolean>} True if any jobs were updated
   */
  forceUpdateExpiredNfd: async function() {
    try {
      console.log('🔄 Force updating expired NFD jobs (bypassing cache)...');
      this._lastUpdateTime = null; // Clear cache
      return await this.autoUpdateExpiredNfd();
    } catch (error) {
      console.error('❌ Force update expired NFD failed:', error);
      return false;
    }
  }
};

// Resume Service
export const resumeService = {
  parse: async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("parse-resume/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error parsing resume:", error);
      throw error;
    }
  },
  upload: async (candidateId, file) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericCandidateId = typeof candidateId === 'string' && candidateId.includes('-') 
        ? candidateId.split('-')[0] 
        : candidateId;
      
      const formData = new FormData();
      formData.append("resume_file", file);
      const response = await api.post(`candidates/${numericCandidateId}/upload-resume/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading resume:", error);
      throw error;
    }
  },
  download: async (candidateId) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericCandidateId = typeof candidateId === 'string' && candidateId.includes('-') 
        ? candidateId.split('-')[0] 
        : candidateId;
      
      const response = await api.get(`candidates/${numericCandidateId}/download-resume/`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      console.error("Error downloading resume:", error);
      throw error;
    }
  },
};

// Candidate API services
export const candidateService = {
  // Get all candidates
  getAllCandidates: async () => {
    try {
      const response = await api.get("candidates/");
      return response.data;
    } catch (error) {
      console.error("Error fetching candidates:", error);
      throw error;
    }
  },

  // Get candidate by ID
  getCandidateById: async (id) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericId = typeof id === 'string' && id.includes('-') 
        ? id.split('-')[0] 
        : id;
      
      const response = await api.get(`candidates/${numericId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching candidate ${id}:`, error);
      throw error;
    }
  },

  // Search candidates
  searchCandidates: async (searchTerm) => {
    try {
      const response = await api.get(
        `candidates/search/?term=${encodeURIComponent(searchTerm)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error searching candidates:", error);
      throw error;
    }
  },

  // Create new candidate
  createCandidate: async (candidateData) => {
    try {
      // Handle file upload with FormData
      const formData = new FormData();

      // Add resume file if exists
      if (candidateData.resume_file) {
        formData.append("resume_file", candidateData.resume_file);
      }

      // Add other candidate data
      Object.keys(candidateData).forEach((key) => {
        if (key !== "resume_file" && candidateData[key] !== undefined) {
          if (typeof candidateData[key] === "object") {
            formData.append(key, JSON.stringify(candidateData[key]));
          } else {
            formData.append(key, candidateData[key]);
          }
        }
      });

      const response = await api.post("candidates/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error creating candidate:", error);
      throw error;
    }
  },

  // Update candidate
  updateCandidate: async (id, candidateData) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericId = typeof id === 'string' && id.includes('-') 
        ? id.split('-')[0] 
        : id;
      
      const formData = new FormData();

      if (candidateData.resume_file && candidateData.resume_file instanceof File) {
        formData.append("resume_file", candidateData.resume_file);
      }

      Object.keys(candidateData).forEach((key) => {
        if (key !== "resume_file" && candidateData[key] !== undefined) {
          if (typeof candidateData[key] === "object") {
            formData.append(key, JSON.stringify(candidateData[key]));
          } else {
            formData.append(key, candidateData[key]);
          }
        }
      });

      const response = await api.put(`candidates/${numericId}/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating candidate ${id}:`, error);
      throw error;
    }
  },

  // Delete candidate
  deleteCandidate: async (id) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericId = typeof id === 'string' && id.includes('-') 
        ? id.split('-')[0] 
        : id;
      
      const response = await api.delete(`candidates/${numericId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting candidate ${id}:`, error);
      throw error;
    }
  },

  // Upload resume for existing candidate
  uploadResume: async (candidateId, file) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericId = typeof candidateId === 'string' && candidateId.includes('-') 
        ? candidateId.split('-')[0] 
        : candidateId;
      
      const formData = new FormData();
      formData.append("resume_file", file);
      
      const response = await api.patch(`candidates/${numericId}/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error uploading resume for candidate ${candidateId}:`, error);
      throw error;
    }
  },

  // Download resume for candidate
  downloadResume: async (candidateId) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericId = typeof candidateId === 'string' && candidateId.includes('-') 
        ? candidateId.split('-')[0] 
        : candidateId;
      
      const response = await api.get(`candidates/${numericId}/resume/`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error(`Error downloading resume for candidate ${candidateId}:`, error);
      throw error;
    }
  },
};

// Client Job API services
export const clientJobService = {
  // Get all client jobs
  getAllClientJobs: async () => {
    try {
      const response = await api.get("client-jobs/");
      return response.data;
    } catch (error) {
      console.error("Error fetching client jobs:", error);
      throw error;
    }
  },

  // Get client jobs for a candidate
  getClientJobsByCandidate: async (candidateId) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericCandidateId = typeof candidateId === 'string' && candidateId.includes('-') 
        ? candidateId.split('-')[0] 
        : candidateId;
      
      const response = await api.get(`client-jobs/?candidate=${numericCandidateId}`);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching client jobs for candidate ${candidateId}:`,
        error
      );
      throw error;
    }
  },

  // Create client job for a candidate
  createClientJob: async (clientJobData) => {
    try {
      const response = await api.post("client-jobs/", clientJobData);
      return response.data;
    } catch (error) {
      console.error("Error creating client job:", error);
      throw error;
    }
  },

  // Update client job
  updateClientJob: async (id, clientJobData) => {
    try {
      const response = await api.put(`client-jobs/${id}/`, clientJobData);
      return response.data;
    } catch (error) {
      console.error(`Error updating client job ${id}:`, error);
      throw error;
    }
  },

  // Delete client job
  deleteClientJob: async (id) => {
    try {
      const response = await api.delete(`client-jobs/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting client job ${id}:`, error);
      throw error;
    }
  },

  // Add feedback to client job
  addFeedback: async (clientJobId, feedbackData) => {
    try {
      
      const response = await api.post(`client-jobs/${clientJobId}/add-feedback/`, feedbackData);
      
      return response.data;
    } catch (error) {
      console.error('Error adding/updating client job feedback:', error);
      console.error('Error details:', error.response?.data);
      throw error;
    }
  },

  // Update existing feedback entry
  updateFeedback: async (clientJobId, entryId, feedbackData) => {
    try {
      const updateData = {
        ...feedbackData,
        entry_id: entryId
      };
      
      
      const response = await api.post(`client-jobs/${clientJobId}/add-feedback/`, updateData);
      
      return response.data;
    } catch (error) {
      console.error('Error updating client job feedback:', error);
      console.error('Error details:', error.response?.data);
      throw error;
    }
  },
  
  // Get feedback entries for client job
  getFeedbackEntries: async (clientJobId) => {
    try {
      const response = await api.get(`client-jobs/${clientJobId}/get-feedback-entries/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching client job feedback entries:', error);
      throw error;
    }
  }
};

// Education Certificate API services
export const educationCertificateService = {
  // Get all education certificates
  getAllEducationCertificates: async () => {
    try {
      const response = await api.get("education-certificates/");
      return response.data;
    } catch (error) {
      console.error("Error fetching education certificates:", error);
      throw error;
    }
  },

  // Get education certificates for a candidate
  getEducationCertificatesByCandidate: async (candidateId) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericCandidateId = typeof candidateId === 'string' && candidateId.includes('-') 
        ? candidateId.split('-')[0] 
        : candidateId;
      
      const response = await api.get(
        `education-certificates/?candidate=${numericCandidateId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching education certificates for candidate ${candidateId}:`,
        error
      );
      throw error;
    }
  },

  // Create education certificate for a candidate
  createEducationCertificate: async (educationCertificateData) => {
    try {
      const response = await api.post(
        "education-certificates/",
        educationCertificateData
      );
      return response.data;
    } catch (error) {
      console.error("Error creating education certificate:", error);
      throw error;
    }
  },

  // Update education certificate
  updateEducationCertificate: async (id, educationCertificateData) => {
    try {
      const response = await api.put(
        `education-certificates/${id}/`,
        educationCertificateData
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating education certificate ${id}:`, error);
      throw error;
    }
  },

  // Delete education certificate
  deleteEducationCertificate: async (id) => {
    try {
      const response = await api.delete(`education-certificates/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting education certificate ${id}:`, error);
      throw error;
    }
  },
};

// Experience Company API services
export const experienceCompanyService = {
  // Get all experience companies
  getAllExperienceCompanies: async () => {
    try {
      const response = await api.get("experience-companies/");
      return response.data;
    } catch (error) {
      console.error("Error fetching experience companies:", error);
      throw error;
    }
  },

  // Get experience companies for a candidate
  getExperienceCompaniesByCandidate: async (candidateId) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericCandidateId = typeof candidateId === 'string' && candidateId.includes('-') 
        ? candidateId.split('-')[0] 
        : candidateId;
      
      const response = await api.get(
        `experience-companies/?candidate=${numericCandidateId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching experience companies for candidate ${candidateId}:`,
        error
      );
      throw error;
    }
  },

  // Create experience company for a candidate
  createExperienceCompany: async (experienceCompanyData) => {
    try {
      const response = await api.post(
        "experience-companies/",
        experienceCompanyData
      );
      return response.data;
    } catch (error) {
      console.error("Error creating experience company:", error);
      throw error;
    }
  },

  // Update experience company
  updateExperienceCompany: async (id, experienceCompanyData) => {
    try {
      const response = await api.put(
        `experience-companies/${id}/`,
        experienceCompanyData
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating experience company ${id}:`, error);
      throw error;
    }
  },

  // Delete experience company
  deleteExperienceCompany: async (id) => {
    try {
      const response = await api.delete(`experience-companies/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting experience company ${id}:`, error);
      throw error;
    }
  },
};

// Additional Info API services
export const additionalInfoService = {
  // Get all additional info records
  getAllAdditionalInfo: async () => {
    try {
      const response = await api.get("additional-info/");
      return response.data;
    } catch (error) {
      console.error("Error fetching additional info:", error);
      throw error;
    }
  },

  // Get additional info for a candidate
  getAdditionalInfoByCandidate: async (candidateId) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericCandidateId = typeof candidateId === 'string' && candidateId.includes('-') 
        ? candidateId.split('-')[0] 
        : candidateId;
      
      const response = await api.get(`additional-info/?candidate=${numericCandidateId}`);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching additional info for candidate ${candidateId}:`,
        error
      );
      throw error;
    }
  },

  // Create additional info for a candidate
  createAdditionalInfo: async (additionalInfoData) => {
    try {
      const response = await api.post("additional-info/", additionalInfoData);
      return response.data;
    } catch (error) {
      console.error("Error creating additional info:", error);
      throw error;
    }
  },

  // Update additional info
  updateAdditionalInfo: async (id, additionalInfoData) => {
    try {
      const response = await api.put(`additional-info/${id}/`, additionalInfoData);
      return response.data;
    } catch (error) {
      console.error(`Error updating additional info ${id}:`, error);
      throw error;
    }
  },

  // Delete additional info
  deleteAdditionalInfo: async (id) => {
    try {
      const response = await api.delete(`additional-info/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting additional info ${id}:`, error);
      throw error;
    }
  },
};

// Previous Company API services
export const previousCompanyService = {
  // Get all previous companies
  getAllPreviousCompanies: async () => {
    try {
      const response = await api.get("previous-companies/");
      return response.data;
    } catch (error) {
      console.error("Error fetching previous companies:", error);
      throw error;
    }
  },

  // Get previous companies for a candidate
  getPreviousCompaniesByCandidate: async (candidateId) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericCandidateId = typeof candidateId === 'string' && candidateId.includes('-') 
        ? candidateId.split('-')[0] 
        : candidateId;
      
      const response = await api.get(
        `previous-companies/?candidate=${numericCandidateId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching previous companies for candidate ${candidateId}:`,
        error
      );
      throw error;
    }
  },

  // Create previous company for a candidate
  createPreviousCompany: async (previousCompanyData) => {
    try {
      const response = await api.post(
        "previous-companies/",
        previousCompanyData
      );
      return response.data;
    } catch (error) {
      console.error("Error creating previous company:", error);
      throw error;
    }
  },

  // Update previous company
  updatePreviousCompany: async (id, previousCompanyData) => {
    try {
      const response = await api.put(
        `previous-companies/${id}/`,
        previousCompanyData
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating previous company ${id}:`, error);
      throw error;
    }
  },

  // Delete previous company
  deletePreviousCompany: async (id) => {
    try {
      const response = await api.delete(`previous-companies/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting previous company ${id}:`, error);
      throw error;
    }
  },
};

// Candidate Feedback API services - Now uses ClientJob endpoints
export const candidateFeedbackService = {
  // Get all feedback records - now aggregates from all client jobs
  getAllFeedback: async () => {
    try {
      return [];
    } catch (error) {
      console.error("Error fetching feedback:", error);
      throw error;
    }
  },

  // Get feedback for a candidate - now fetches from all client jobs
  getFeedbackByCandidate: async (candidateId) => {
    try {
      // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
      const numericCandidateId = typeof candidateId === 'string' && candidateId.includes('-') 
        ? candidateId.split('-')[0] 
        : candidateId;
      
      // Get all client jobs for this candidate
      const clientJobs = await clientJobService.getClientJobsByCandidate(numericCandidateId);
      
      if (!clientJobs || clientJobs.length === 0) {
        return { feedback_entries: [], total_entries: 0 };
      }

      // Collect all feedback entries from all client jobs
      let allFeedbackEntries = [];
      
      for (const clientJob of clientJobs) {
        try {
          const feedbackResponse = await clientJobService.getFeedbackEntries(clientJob.id);
          const entries = feedbackResponse.feedback_entries || [];
          
          // Add client job info to each feedback entry
          const entriesWithJobInfo = entries.map(entry => ({
            ...entry,
            clientJobId: clientJob.id,
            clientName: clientJob.client_name,
            designation: clientJob.designation
          }));
          
          allFeedbackEntries = [...allFeedbackEntries, ...entriesWithJobInfo];
        } catch (error) {
          console.error(`Error fetching feedback for client job ${clientJob.id}:`, error);
        }
      }

      return {
        feedback_entries: allFeedbackEntries,
        total_entries: allFeedbackEntries.length
      };
    } catch (error) {
      console.error(`Error fetching feedback for candidate ${candidateId}:`, error);
      throw error;
    }
  },

  // Create feedback for a candidate - now creates feedback on client job
  createFeedback: async (feedbackData) => {
    try {
      const candidateId = feedbackData.candidate;
      const clientJobId = feedbackData.clientJobId;
      
      if (!candidateId && !clientJobId) {
        throw new Error('Either candidate ID or client job ID is required for feedback creation');
      }

      // If clientJobId is provided, use it directly
      if (clientJobId) {
        return await clientJobService.addFeedback(clientJobId, {
          feedback_text: feedbackData.feedback_text || '',
          remarks: feedbackData.remarks || '',
          nfd_date: feedbackData.nfd_date || null,
          ejd_date: feedbackData.ejd_date || null,
          ifd_date: feedbackData.ifd_date || null,
          entry_by: feedbackData.executiveName || 'Unknown'
        });
      }

      // If only candidateId is provided, get the first client job
      const numericCandidateId = typeof candidateId === 'string' && candidateId.includes('-') 
        ? candidateId.split('-')[0] 
        : candidateId;
        
      const clientJobs = await clientJobService.getClientJobsByCandidate(numericCandidateId);
      
      if (!clientJobs || clientJobs.length === 0) {
        throw new Error('No client jobs found for this candidate. Cannot add feedback.');
      }

      // Use the first client job
      const firstClientJob = clientJobs[0];
      return await clientJobService.addFeedback(firstClientJob.id, {
        feedback_text: feedbackData.feedback_text || '',
        remarks: feedbackData.remarks || '',
        nfd_date: feedbackData.nfd_date || null,
        ejd_date: feedbackData.ejd_date || null,
        ifd_date: feedbackData.ifd_date || null,
        entry_by: feedbackData.executiveName || 'Unknown'
      });
    } catch (error) {
      console.error("Error creating feedback:", error);
      throw error;
    }
  },

  // Update feedback - deprecated, feedback is now append-only
  updateFeedback: async (id, feedbackData) => {
    try {
      // Instead, add new feedback entry
      return await this.createFeedback(feedbackData);
    } catch (error) {
      console.error(`Error updating feedback ${id}:`, error);
      throw error;
    }
  },

  // Delete feedback - deprecated, feedback is now part of ClientJob model
  deleteFeedback: async (id) => {
    try {
      throw new Error('Cannot delete individual feedback entries - feedback is now part of ClientJob model');
    } catch (error) {
      console.error(`Error deleting feedback ${id}:`, error);
      throw error;
    }
  },
};

// Master data API services (these would need to be implemented in Django backend)
export const masterDataService = {
  // Get sources
  getSources: async () => {
    try {
      const response = await api.get("sources/");
      return response.data;
    } catch (error) {
      console.error("Error fetching sources:", error);
      throw error;
    }
  },

  // Get industries
  getIndustries: async () => {
    try {
      const response = await api.get("industries/");
      return response.data;
    } catch (error) {
      console.error("Error fetching industries:", error);
      throw error;
    }
  },

  // Get departments
  getDepartments: async () => {
    try {
      const response = await api.get("departments/");
      return response.data;
    } catch (error) {
      console.error("Error fetching departments:", error);
      throw error;
    }
  },

  // Get designations
  getDesignations: async () => {
    try {
      const response = await api.get("designations/");
      return response.data;
    } catch (error) {
      console.error("Error fetching designations:", error);
      throw error;
    }
  },
};

// Candidate Revenue API services
export const revenueService = {
  // Get all revenues with optional filters
  getAll: async (params = {}) => {
    const response = await api.get("candidate-revenues/", { params });
    return response.data;
  },

  // Get revenue for a candidate
  getByCandidate: async (candidateId) => {   // 
    // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
    const numericCandidateId = typeof candidateId === 'string' && candidateId.includes('-') 
      ? candidateId.split('-')[0] 
      : candidateId;
    
    const response = await api.get(`candidate-revenues/?candidate=${numericCandidateId}`);
    return response.data;
  },

  // Create revenue record
  createRevenue: async (data) => {
    const response = await api.post("candidate-revenues/", data);
    return response.data;
  },

  // Update revenue record
  updateRevenue: async (id, data) => {
    const response = await api.put(`candidate-revenues/${id}/`, data);
    return response.data;
  },

  // Delete revenue record
  deleteRevenue: async (id) => {
    const response = await api.delete(`candidate-revenues/${id}/`);
    return response.data;
  },
};


// Candidate Revenue Feedback API services
export const revenueFeedbackService = {
  getFeedbackByRevenue: async (revenueId) => {
    try {
      const response = await api.get(`candidate-revenue-feedbacks/?candidate_revenue=${revenueId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching feedback for revenue ${revenueId}:`, error);
      throw error;
    }
  },

  createFeedback: async (feedbackData) => {
    try {
      const response = await api.post("candidate-revenue-feedbacks/", feedbackData);
      return response.data;
    } catch (error) {
      console.error("Error creating revenue feedback:", error);
      throw error;
    }
  },

  deleteFeedback: async (id) => {
    try {
      const response = await api.delete(`candidate-revenue-feedbacks/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting revenue feedback ${id}:`, error);
      throw error;
    }
  },
   getByCandidate: (candidateId) => {
     // Extract numeric candidate ID from compound ID (e.g., "37-46" -> 37)
     const numericCandidateId = typeof candidateId === 'string' && candidateId.includes('-') 
       ? candidateId.split('-')[0] 
       : candidateId;
     
     return api.get(`/candidaterevenue/?candidate=${numericCandidateId}`);
   },
};

// Job Opening API services
export const jobOpeningService = {
  // Get all job openings with optional filters
  getAllJobOpenings: async (filters = {}) => {
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
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching job openings:', error);
      throw error;
    }
  },

  // Create a new job opening
  createJobOpening: async (jobData) => {
    try {
      const response = await api.post('job-openings/', jobData);
      return response.data;
    } catch (error) {
      console.error('Error creating job opening:', error);
      throw error;
    }
  },

  // Get a specific job opening by ID
  getJobOpening: async (id) => {
    try {
      const response = await api.get(`job-openings/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching job opening:', error);
      throw error;
    }
  },

  // Update a job opening
  updateJobOpening: async (id, jobData) => {
    try {
      const response = await api.put(`job-openings/${id}/`, jobData);
      return response.data;
    } catch (error) {
      console.error('Error updating job opening:', error);
      throw error;
    }
  },

  // Delete a job opening
  deleteJobOpening: async (id) => {
    try {
      const response = await api.delete(`job-openings/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting job opening:', error);
      throw error;
    }
  },

  // Search job openings by term (job title or company name)
  searchJobOpenings: async (searchTerm) => {
    try {
      const response = await api.get(`job-openings/search/?term=${encodeURIComponent(searchTerm)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching job openings:', error);
      throw error;
    }
  },

  // Toggle job opening status (active/inactive)
  toggleJobStatus: async (id) => {
    try {
      const response = await api.patch(`job-openings/${id}/toggle-status/`);
      return response.data;
    } catch (error) {
      console.error('Error toggling job status:', error);
      throw error;
    }
  },

  // Assign candidate to job opening
  assignCandidate: async (jobId, candidateId) => {
    try {
      const response = await api.post(`job-openings/${jobId}/assign-candidate/`, {
        candidate_id: candidateId
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning candidate to job:', error);
      throw error;
    }
  }
};

// ========================================
// UNIFIED WORKFLOW API SERVICES
// ========================================

// Unified Workflow Service
export const unifiedWorkflowService = {
  /**
   * Clone an existing candidate for a new client assignment
   * @param {Object} cloneData - Clone configuration
   * @returns {Promise} Clone result with new candidate and client job data
   */
  cloneCandidateForClient: async (cloneData) => {
    try {
      console.log('🔄 Cloning candidate for new client...', cloneData);
      const response = await api.post('clone-candidate/', cloneData);
      
      if (response.data.success) {
        console.log('✅ Successfully cloned candidate:', response.data.message);
        return response.data;
      } else {
        console.warn('⚠️ Clone API returned unsuccessful response:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Error cloning candidate:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Atomically claim an open profile job
   * @param {Object} claimData - Claim configuration
   * @returns {Promise} Claim result with updated job data
   */
  claimOpenJob: async (claimData) => {
    try {
      console.log('🔄 Claiming open job...', claimData);
      const response = await api.post('claim-job/', claimData);
      
      if (response.data.success) {
        console.log('✅ Successfully claimed job:', response.data.message);
        return response.data;
      } else {
        console.warn('⚠️ Claim API returned unsuccessful response:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Error claiming job:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Mark jobs as open profile (manager override)
   * @param {Object} markData - Jobs to mark as open
   * @returns {Promise} Mark result with updated jobs
   */
  markJobsAsOpen: async (markData) => {
    try {
      console.log('🔄 Marking jobs as open...', markData);
      const response = await api.post('mark-jobs-open/', markData);
      
      if (response.data.success) {
        console.log('✅ Successfully marked jobs as open:', response.data.message);
        return response.data;
      } else {
        console.warn('⚠️ Mark jobs API returned unsuccessful response:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Error marking jobs as open:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get assignment history for audit trail
   * @param {Object} filters - Filter parameters
   * @returns {Promise} Assignment history data
   */
  getAssignmentHistory: async (filters = {}) => {
    try {
      console.log('🔍 Getting assignment history...', filters);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      const queryString = params.toString();
      const url = `assignment-history/${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      
      if (response.data.success) {
        console.log('✅ Successfully retrieved assignment history:', response.data.total_records, 'records');
        return response.data;
      } else {
        console.warn('⚠️ Assignment history API returned unsuccessful response:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Error getting assignment history:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Run expired job cleanup (admin function)
   * @returns {Promise} Cleanup result
   */
  runExpiredJobCleanup: async () => {
    try {
      console.log('🔄 Running expired job cleanup...');
      const response = await api.post('cleanup-expired-jobs/');
      
      if (response.data.success) {
        console.log('✅ Successfully ran expired job cleanup:', response.data.message);
        return response.data;
      } else {
        console.warn('⚠️ Cleanup API returned unsuccessful response:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Error running expired job cleanup:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Check if a candidate can be cloned for a new client
   * @param {number} candidateId - Candidate ID to check
   * @returns {boolean} Whether candidate can be cloned
   */
  canCloneCandidate: (candidateId) => {
    // Basic validation - candidate must exist and have at least one client job
    return candidateId && candidateId > 0;
  },

  /**
   * Check if a job can be claimed
   * @param {Object} clientJob - Client job to check
   * @returns {boolean} Whether job can be claimed
   */
  canClaimJob: (clientJob) => {
    if (!clientJob) return false;
    
    // Job can be claimed if:
    // 1. It's marked as "open profile", OR
    // 2. It has no current assignment (assign_to is null/empty), OR
    // 3. NFD has expired (making it effectively open)
    
    const isOpenProfile = clientJob.remarks && clientJob.remarks.toLowerCase() === 'open profile';
    const isUnassigned = clientJob.assign === 'null' || clientJob.assign === null || !clientJob.assign_to;
    const isAssignable = clientJob.can_assign || false; // From backend serializer
    
    return isOpenProfile || isUnassigned || isAssignable;
  },

  /**
   * Get user-friendly status for a client job
   * @param {Object} clientJob - Client job to analyze
   * @returns {Object} Status information
   */
  getJobStatus: (clientJob) => {
    if (!clientJob) {
      return { status: 'unknown', canClaim: false, canAssign: false };
    }
    
    const isOpenProfile = clientJob.remarks && clientJob.remarks.toLowerCase() === 'open profile';
    const isAssigned = clientJob.assign === 'assigned' && Boolean(clientJob.assign_to);
    const isAssignable = clientJob.can_assign || false;
    
    if (isOpenProfile) {
      return {
        status: 'open_profile',
        label: 'Open Profile',
        color: 'green',
        canClaim: true,
        canAssign: true,
        description: 'Available for claiming by any executive'
      };
    } else if (!isAssigned) {
      return {
        status: 'unassigned',
        label: 'Unassigned',
        color: 'orange',
        canClaim: true,
        canAssign: true,
        description: 'No current assignment'
      };
    } else if (isAssignable) {
      return {
        status: 'expired_assignable',
        label: 'Expired & Assignable',
        color: 'yellow',
        canClaim: true,
        canAssign: true,
        description: 'NFD expired, available for reassignment'
      };
    } else {
      return {
        status: 'assigned',
        label: 'Assigned',
        color: 'blue',
        canClaim: false,
        canAssign: false,
        description: `Currently assigned to ${clientJob.assign_to || 'Unknown'}`
      };
    }
  }
};

export default api;