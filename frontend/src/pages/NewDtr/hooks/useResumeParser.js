import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import toast from 'react-hot-toast';

export const useResumeParser = () => {
  const { resume } = useApi();
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  const parseResume = useCallback(async (file, options = {}) => {
    const { candidateId = null, autoMap = true } = options;
    
    if (!file) {
      toast.error('Please select a resume file');
      return null;
    }

    setIsParsing(true);
    try {
      const result = candidateId 
        ? await resume.upload(candidateId, file)
        : await resume.parse(file);

      setParsedData(result.data);
      
      if (autoMap) {
        return mapToCandidateFields(result.data);
      }
      return result.data;
    } catch (error) {
      toast.error('Failed to parse resume');
      console.error('Resume parsing error:', error);
      return null;
    } finally {
      setIsParsing(false);
    }
  }, [resume]);

  const mapToCandidateFields = (data) => {
    return {
      candidate_name: data.name || '',
      email: data.email || '',
      mobile1: data.mobile_number || data.phone || '',
      skills: data.skills?.join(', ') || '',
      experience: data.total_experience || 0,
      education: data.education?.degree || '',
      languages: data.language?.join(', ') || '',
      // Add other field mappings as needed
    };
  };

  const downloadResume = useCallback(async (candidateId, fileName = 'resume.pdf') => {
    try {
      const blob = await resume.download(candidateId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Resume downloaded successfully');
    } catch (error) {
      toast.error('Failed to download resume');
      throw error;
    }
  }, [resume]);

  return {
    isParsing,
    parsedData,
    parseResume,
    downloadResume,
    mapToCandidateFields,
  };
};