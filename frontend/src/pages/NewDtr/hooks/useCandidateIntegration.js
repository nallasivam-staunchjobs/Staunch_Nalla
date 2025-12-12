import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import CandidateIntegrationService from '../services/candidateIntegrationService';

export const useCandidateIntegration = () => {
    const [loading, setLoading] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [currentCandidate, setCurrentCandidate] = useState(null);

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

    // Create complete candidate
    const createCandidate = useCallback(async (formData) => {
        return await apiCall(
            () => CandidateIntegrationService.createCompleteCandidate(formData),
            null // Remove success toast message
        );
    }, [apiCall]);

    // Update complete candidate
    const updateCandidate = useCallback(async (candidateId, formData) => {
        return await apiCall(
            () => CandidateIntegrationService.updateCompleteCandidate(candidateId, formData),
            'Candidate updated successfully'
        );
    }, [apiCall]);

    // Get complete candidate
    const getCandidate = useCallback(async (candidateId) => {
        const result = await apiCall(() => CandidateIntegrationService.getCompleteCandidate(candidateId));
        setCurrentCandidate(result);
        return result;
    }, [apiCall]);

    // Delete complete candidate
    const deleteCandidate = useCallback(async (candidateId) => {
        return await apiCall(
            () => CandidateIntegrationService.deleteCompleteCandidate(candidateId),
            'Candidate deleted successfully'
        );
    }, [apiCall]);

    // Search candidates
    const searchCandidates = useCallback(async (searchTerm) => {
        const result = await apiCall(() => CandidateIntegrationService.searchCandidates(searchTerm));
        setCandidates(result);
        return result;
    }, [apiCall]);

    // Get all candidates
    const getAllCandidates = useCallback(async () => {
        const result = await apiCall(() => CandidateIntegrationService.getAllCandidates());
        setCandidates(result);
        return result;
    }, [apiCall]);

    // Load candidates on mount
    const loadCandidates = useCallback(async () => {
        await getAllCandidates();
    }, [getAllCandidates]);

    // Clear current candidate
    const clearCurrentCandidate = useCallback(() => {
        setCurrentCandidate(null);
    }, []);

    // Refresh candidates list
    const refreshCandidates = useCallback(async () => {
        await getAllCandidates();
    }, [getAllCandidates]);

 const uploadResume = useCallback(async (candidateId, file) => {
    return await apiCall(
      () => CandidateIntegrationService.uploadResume(candidateId, file),
      'Resume uploaded successfully'
    );
  }, [apiCall]);

  const downloadResume = useCallback(async (candidateId) => {
    const blob = await apiCall(() => CandidateIntegrationService.downloadResume(candidateId));
    // Create a link and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resume.pdf'; // You can customize the filename if needed
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }, [apiCall]);



    return {
        // State
        loading,
        candidates,
        currentCandidate,
        
        // Actions
        createCandidate,
        updateCandidate,
        getCandidate,
        deleteCandidate,
        searchCandidates,
        getAllCandidates,
        loadCandidates,
        clearCurrentCandidate,
        refreshCandidates,
        uploadResume,
    downloadResume,

    };
};

