import { CandidateIntegrationService } from './candidateIntegrationService';
import { calculateNextFollowUpDate, getCurrentDate } from '../utils/dateUtils';
import { clientJobService } from './api';
import { clientJobs } from '../../../api/api';

/**
 * Service for handling CNA (Call Not Answered) submissions
 */
export class CNASubmissionService {
  
  /**
   * Submit candidate data with CNA status
   * Creates candidate, client job with CNA remarks, and feedback
   * @param {Object} formData - Form data from FormStep1
   * @param {Object} resumeFile - Resume file if uploaded
   * @returns {Object} - Created candidate and related data
   */
  static async submitCNACandidate(formData, resumeFile = null) {
    try {
      // Prepare enhanced form data for CNA submission
      const enhancedFormData = {
        ...formData,
        // Add CNA-specific data
        feedback: 'Call Not Answered',
        remarks: 'Call Not Answered',
        nextFollowUpDate: calculateNextFollowUpDate(),
        
        
        
        // Ensure we have basic required fields
        clientName: formData.clientName || 'NA',
        designation: formData.designation || 'NA',
        
        // Set default values for missing fields
        experienceCompanies: formData.experienceCompanies || [],
        languages: formData.languages || [],
        skills: formData.skills || []
      };

      // Create complete candidate with all related data
      const result = await CandidateIntegrationService.createCompleteCandidate(enhancedFormData);
      
      // Upload resume if provided
      if (resumeFile && result.candidate) {
        try {
          const resumeUploadResult = await CandidateIntegrationService.uploadResume(result.candidate.id, resumeFile);
          result.resumeUploaded = true;
        } catch (resumeError) {
          // Resume upload failed
          result.resumeUploadError = resumeError.message;
          // Don't fail the entire operation if resume upload fails
        }
      } else {
        // No resume file provided or candidate creation failed
      }

      return {
        success: true,
        candidate: result.candidate,
        clientJob: result.clientJob,
        feedback: result.feedback,
        message: 'Candidate saved with Call Not Answered status',
        nextFollowUpDate: enhancedFormData.nextFollowUpDate
      };

    } catch (error) {
      throw new Error(`Failed to save candidate: ${error.message}`);
    }
  }

  /**
   * Validate required fields for CNA submission
   * @param {Object} formData - Form data to validate
   * @returns {Object} - Validation result
   */
  static validateCNASubmission(formData) {
    const errors = [];
    const requiredFields = [
      { field: 'candidateName', label: 'Candidate Name' },
      { field: 'mobile1', label: 'Primary Mobile' },
      { field: 'email', label: 'Email' },
      { field: 'executiveName', label: 'Executive Name' }
    ];

    requiredFields.forEach(({ field, label }) => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        errors.push(`${label} is required`);
      }
    });

    // Validate mobile number format
    if (formData.mobile1 && !/^\d{10}$/.test(formData.mobile1.toString())) {
      errors.push('Primary mobile must be 10 digits');
    }

    // Validate email format
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create client job with CNA remarks
   * @param {number} candidateId - Candidate ID
   * @param {Object} formData - Form data
   * @returns {Object} - Created client job
   */
  static async createCNAClientJob(candidateId, formData) {
    const clientJobData = {
      candidate: candidateId,
      client_name: formData.clientName || 'TBD',
      designation: formData.designation || 'TBD',
      remarks: 'Call Not Answered',
      next_follow_up_date: calculateNextFollowUpDate(),
      created_date: getCurrentDate(),
      status: 'Pending Follow-up'
    };

    // Use the existing client job service
    const { clientJobService } = await import('./api');
    return await clientJobService.createClientJob(clientJobData);
  }

  /**
   * Create candidate feedback with CNA status
   * @param {number} candidateId - Candidate ID
   * @param {number} clientJobId - Client Job ID
   * @returns {Object} - Created feedback
   */
  static async createCNAFeedback(candidateId, clientJobId) {
    try {
      
      const feedbackData = {
        candidate: candidateId,
        client_job: clientJobId,
        feedback: 'Call Not Answered',
        feedback_date: getCurrentDate(),
        next_follow_up_date: calculateNextFollowUpDate(),
        status: 'Pending'
      };


      // Use the new structured feedback API - add to client job
      const { clientJobs } = await import('../../../api/api');
      
      // Get client jobs for this candidate to add feedback
      const clientJobsData = await clientJobs.getByCandidate(candidateId);
      if (clientJobsData && clientJobsData.length > 0) {
        const result = await clientJobs.addFeedback(clientJobsData[0].id, {
          feedback_text: 'Call Not Answered',
          remarks: 'CNA',
          nfd_date: feedbackData.next_follow_up_date || null,
          ejd_date: null,  // Clear Expected Joining Date for CNA
          ifd_date: null,  // Clear Interview Fixed Date for CNA
          entry_by: 'System', // CNA is automated
          call_status: 'call not answered'
        });
        
        return result;
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }
}

export default CNASubmissionService;
