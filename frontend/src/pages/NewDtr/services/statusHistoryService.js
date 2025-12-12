import { API_URL } from '../../../api/config';

/**
 * Service for managing candidate status history
 */
export class StatusHistoryService {
  
  /**
   * Create a new status history entry with enhanced error handling and logging
   * @param {Object} data - Status history data
   * @param {number} data.candidate_id - Candidate ID (required)
   * @param {number} [data.client_job_id] - Optional client job ID
   * @param {number} [data.vendor_id] - Optional vendor/client ID
   * @param {string} [data.client_name] - Optional client/vendor name
   * @param {string} data.remarks - Status/remark (required, e.g., 'interested')
   * @param {string} data.change_date - Date of status change (required, YYYY-MM-DD)
   * @param {string} data.created_by - Employee code who made the change (required)
   * @param {string} [data.extra_notes] - Optional additional notes
   * @param {number} [data.profile_submission=0] - Profile submission status (0=No, 1=Yes)
   * @returns {Promise<Object>} - Created status history entry with server response data
   * @throws {Error} If required fields are missing or API request fails
   */
  static async createStatusHistory(data) {
    try {
      console.log(' Creating status history with data:', data);
      
      // Validate required fields
      const requiredFields = ['candidate_id', 'remarks', 'change_date', 'created_by'];
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
        console.error(' Validation error:', errorMsg);
        throw new Error(errorMsg);
      }

      // Ensure profile_submission is set (default to 0 if not provided)
      const payload = {
        ...data,
        profile_submission: data.profile_submission ?? 0
      };

      const response = await fetch(`${API_URL}/status-history/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error(' API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        
        const errorMsg = responseData.error || 
                        responseData.detail || 
                        `Failed to create status history (${response.status})`;
        throw new Error(errorMsg);
      }

      console.log('Status history created successfully:', responseData);
      return responseData;
    } catch (error) {
      console.error(' Error in createStatusHistory:', {
        error: error.message,
        stack: error.stack,
        data: data
      });
      throw error;
    }
  }

  /**
   * Get candidate timeline
   * @param {number} candidateId - Candidate ID
   * @returns {Promise<Object>} - Timeline data
   */
  static async getCandidateTimeline(candidateId) {
    try {
      const response = await fetch(`${API_URL}/candidates/${candidateId}/timeline/`, {
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get candidate timeline');
      }

      return await response.json();
    } catch (error) {
      console.error(' Error getting candidate timeline:', error);
      throw error;
    }
  }

  /**
   * Get candidate calendar data
   * @param {number} candidateId - Candidate ID
   * @param {number} year - Optional year filter
   * @param {number} month - Optional month filter
   * @returns {Promise<Object>} - Calendar data
   */
  static async getCandidateCalendar(candidateId, year = null, month = null) {
    try {
      let url = `${API_URL}/candidates/${candidateId}/calendar/`;
      const params = new URLSearchParams();
      
      if (year) params.append('year', year);
      if (month) params.append('month', month);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get candidate calendar');
      }

      return await response.json();
    } catch (error) {
      console.error(' Error getting candidate calendar:', error);
      throw error;
    }
  }

  /**
   * Get status history statistics
   * @param {Object} filters - Optional filters
   * @param {string} filters.from_date - Start date (YYYY-MM-DD)
   * @param {string} filters.to_date - End date (YYYY-MM-DD)
   * @param {string} filters.created_by - Employee code filter
   * @returns {Promise<Object>} - Statistics data
   */
  static async getStatusHistoryStats(filters = {}) {
    try {
      let url = `${API_URL}/status-history/stats/`;
      const params = new URLSearchParams();
      
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      if (filters.created_by) params.append('created_by', filters.created_by);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get status history stats');
      }

      return await response.json();
    } catch (error) {
      console.error(' Error getting status history stats:', error);
      throw error;
    }
  }

  /**
   * Create initial status history entry when a candidate is created
   * @param {number} candidateId - Candidate ID (required)
   * @param {string} remarks - Status/remark (e.g., 'interested')
   * @param {string} executiveCode - Employee code of the user creating the entry (required)
   * @param {string} [extraNotes] - Optional additional notes
   * @param {number} [clientJobId] - Optional client job ID
   * @param {number} [vendorId] - Optional vendor ID
   * @param {string} [clientName] - Optional client name
   * @returns {Promise<Object>} - Created status history entry with server response data
   * @throws {Error} If candidate ID, remarks, or executive code are missing, or if API request fails
   */
  static async createInitialStatusHistory(candidateId, remarks, executiveCode, extraNotes = null, 
                                        clientJobId = null, vendorId = null, clientName = null) {
    try {
      console.log(' Creating initial status history for candidate:', {
        candidateId,
        remarks,
        executiveCode,
        clientJobId,
        vendorId,
        clientName
      });

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const statusData = {
        candidate_id: candidateId,
        client_job_id: clientJobId,
        vendor_id: vendorId,
        client_name: clientName,
        remarks: remarks || 'interested',
        change_date: today,
        created_by: executiveCode,
        extra_notes: extraNotes || 'Initial candidate status when created',
        profile_submission: 0 // Explicitly set to 0 for initial entry
      };

      console.log(' Prepared status history data:', statusData);
      
      const result = await this.createStatusHistory(statusData);
      console.log(' Initial status history created successfully');
      return result;
    } catch (error) {
      console.error(' Failed to create initial status history:', {
        error: error.message,
        candidateId,
        executiveCode,
        clientJobId
      });
      
      // Re-throw with more context
      throw new Error(`Failed to create initial status history: ${error.message}`);
    }
  }

  /**
   * Create status history entry when remarks change
   * @param {number} candidateId - Candidate ID
   * @param {string} newRemarks - New status/remark
   * @param {string} executiveCode - Employee code of updater
   * @param {string} extraNotes - Optional notes about the change
   * @param {number} clientJobId - Optional client job ID
   * @param {number} vendorId - Optional vendor ID
   * @param {string} clientName - Optional client name
   * @returns {Promise<Object>} - Created status history entry
   */
  static async createStatusChangeHistory(candidateId, newRemarks, executiveCode, extraNotes = null,
                                       clientJobId = null, vendorId = null, clientName = null) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const statusData = {
      candidate_id: candidateId,
      client_job_id: clientJobId,
      vendor_id: vendorId,
      client_name: clientName,
      remarks: newRemarks,
      change_date: today,
      created_by: executiveCode,
      extra_notes: extraNotes || `Status updated to: ${newRemarks}`
    };

    return await this.createStatusHistory(statusData);
  }

  /**
   * Batch create status history entries
   * @param {Array} statusEntries - Array of status history data objects
   * @returns {Promise<Array>} - Array of created entries
   */
  static async createBatchStatusHistory(statusEntries) {
    const results = [];
    
    for (const entry of statusEntries) {
      try {
        const result = await this.createStatusHistory(entry);
        results.push(result);
      } catch (error) {
        console.error(`Failed to create status history for candidate ${entry.candidate_id}:`, error);
        results.push({ error: error.message, entry });
      }
    }
    
    return results;
  }
}

export default StatusHistoryService;
