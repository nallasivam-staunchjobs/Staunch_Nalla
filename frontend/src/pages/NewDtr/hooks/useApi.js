import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  candidateService,
  clientJobService,
  educationCertificateService,
  experienceCompanyService,
  additionalInfoService,
  masterDataService,
  resumeService
} from '../services/api';

export const useApi = () => {
  const [loading, setLoading] = useState(false);

  // Generic API wrapper with loading and error handling
  const apiCall = useCallback(async (apiFunction, successMessage = null) => {
    setLoading(true);
    try {
      const result = await apiFunction();
      if (successMessage) {
        toast.success(successMessage);
      }
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Resume operations
  const resume = {
    parse: useCallback(
      (file) => apiCall(() => resumeService.parse(file), 'Resume parsed successfully'),
      [apiCall]
    ),
    upload: useCallback(
      (candidateId, file) => apiCall(() => resumeService.upload(candidateId, file), 'Resume uploaded successfully'),
      [apiCall]
    ),
    download: useCallback(
      (candidateId) => apiCall(() => resumeService.download(candidateId)),
      [apiCall]
    ),
  };

  // Candidate operations
  const candidates = {
    getAll: useCallback(() => apiCall(candidateService.getAllCandidates), [apiCall]),
    getById: useCallback(
      (id) => apiCall(() => candidateService.getCandidateById(id)),
      [apiCall]
    ),
    search: useCallback(
      (searchTerm) => apiCall(() => candidateService.searchCandidates(searchTerm)),
      [apiCall]
    ),
    create: useCallback(
      (data) => apiCall(() => candidateService.createCandidate(data), 'Candidate created successfully'),
      [apiCall]
    ),
    update: useCallback(
      (id, data) => apiCall(() => candidateService.updateCandidate(id, data), 'Candidate updated successfully'),
      [apiCall]
    ),
    delete: useCallback(
      (id) => apiCall(() => candidateService.deleteCandidate(id), 'Candidate deleted successfully'),
      [apiCall]
    ),
  };

  // Client Job operations
  const clientJobs = {
    getAll: useCallback(() => apiCall(clientJobService.getAllClientJobs), [apiCall]),
    getByCandidate: useCallback(
      (candidateId) => apiCall(() => clientJobService.getClientJobsByCandidate(candidateId)),
      [apiCall]
    ),
    create: useCallback(
      (data) => apiCall(() => clientJobService.createClientJob(data), 'Client job created successfully'),
      [apiCall]
    ),
    update: useCallback(
      (id, data) => apiCall(() => clientJobService.updateClientJob(id, data), 'Client job updated successfully'),
      [apiCall]
    ),
    delete: useCallback(
      (id) => apiCall(() => clientJobService.deleteClientJob(id), 'Client job deleted successfully'),
      [apiCall]
    ),
  };

  // Education Certificate operations
  const educationCertificates = {
    getAll: useCallback(() => apiCall(educationCertificateService.getAllEducationCertificates), [apiCall]),
    getByCandidate: useCallback(
      (candidateId) => apiCall(() => educationCertificateService.getEducationCertificatesByCandidate(candidateId)),
      [apiCall]
    ),
    create: useCallback(
      (data) => apiCall(() => educationCertificateService.createEducationCertificate(data), 'Education certificate created successfully'),
      [apiCall]
    ),
    update: useCallback(
      (id, data) => apiCall(() => educationCertificateService.updateEducationCertificate(id, data), 'Education certificate updated successfully'),
      [apiCall]
    ),
    delete: useCallback(
      (id) => apiCall(() => educationCertificateService.deleteEducationCertificate(id), 'Education certificate deleted successfully'),
      [apiCall]
    ),
  };

  // Experience Company operations
  const experienceCompanies = {
    getAll: useCallback(() => apiCall(experienceCompanyService.getAllExperienceCompanies), [apiCall]),
    getByCandidate: useCallback(
      (candidateId) => apiCall(() => experienceCompanyService.getExperienceCompaniesByCandidate(candidateId)),
      [apiCall]
    ),
    create: useCallback(
      (data) => apiCall(() => experienceCompanyService.createExperienceCompany(data), 'Experience company created successfully'),
      [apiCall]
    ),
    update: useCallback(
      (id, data) => apiCall(() => experienceCompanyService.updateExperienceCompany(id, data), 'Experience company updated successfully'),
      [apiCall]
    ),
    delete: useCallback(
      (id) => apiCall(() => experienceCompanyService.deleteExperienceCompany(id), 'Experience company deleted successfully'),
      [apiCall]
    ),
  };

  // Additional Info operations
  const additionalInfo = {
    getAll: useCallback(() => apiCall(additionalInfoService.getAllAdditionalInfo), [apiCall]),
    getByCandidate: useCallback(
      (candidateId) => apiCall(() => additionalInfoService.getAdditionalInfoByCandidate(candidateId)),
      [apiCall]
    ),
    create: useCallback(
      (data) => apiCall(() => additionalInfoService.createAdditionalInfo(data), 'Additional info created successfully'),
      [apiCall]
    ),
    update: useCallback(
      (id, data) => apiCall(() => additionalInfoService.updateAdditionalInfo(id, data), 'Additional info updated successfully'),
      [apiCall]
    ),
    delete: useCallback(
      (id) => apiCall(() => additionalInfoService.deleteAdditionalInfo(id), 'Additional info deleted successfully'),
      [apiCall]
    ),
  };

  // Client Job Feedback operations (moved from deprecated candidateFeedback)
  const clientJobFeedback = {
    add: useCallback(
      (clientJobId, feedbackData) => apiCall(() => clientJobService.addFeedback(clientJobId, feedbackData), 'Feedback added successfully'),
      [apiCall]
    ),
    update: useCallback(
      (clientJobId, entryId, feedbackData) => apiCall(() => clientJobService.updateFeedback(clientJobId, entryId, feedbackData), 'Feedback updated successfully'),
      [apiCall]
    ),
    getEntries: useCallback(
      (clientJobId) => apiCall(() => clientJobService.getFeedbackEntries(clientJobId)),
      [apiCall]
    ),
  };

  // Master data operations
  const masterData = {
    getSources: useCallback(() => apiCall(masterDataService.getSources), [apiCall]),
    getIndustries: useCallback(() => apiCall(masterDataService.getIndustries), [apiCall]),
    getDepartments: useCallback(() => apiCall(masterDataService.getDepartments), [apiCall]),
    getDesignations: useCallback(() => apiCall(masterDataService.getDesignations), [apiCall]),
  };

  return {
    loading,
    resume,
    candidates,
    clientJobs,
    educationCertificates,
    experienceCompanies,
    additionalInfo,
    clientJobFeedback,
    masterData,
  };
};