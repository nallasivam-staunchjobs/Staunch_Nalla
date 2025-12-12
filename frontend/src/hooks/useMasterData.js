import { useState, useEffect } from 'react';
import { masterService } from '../api/masterService';

export const useMasterData = () => {
  const [masterData, setMasterData] = useState({
    genders: [],
    sources: [],
    communications: [],
    designations: [],
    industries: [],
    remarks: [],
    educations: [],
    experiences: [],
    maritalStatuses: [],
    bloodGroups: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load all master data at once for better performance
        const data = await masterService.fetchAllMasterData();
        
        // Also load additional master data
        const [educations, experiences, maritalStatuses, bloodGroups] = await Promise.all([
          masterService.fetchEducations(),
          masterService.fetchExperiences(),
          masterService.fetchMaritalStatuses(),
          masterService.fetchBloodGroups()
        ]);

        setMasterData({
          ...data,
          educations,
          experiences,
          maritalStatuses,
          bloodGroups
        });
      } catch (err) {
        console.error('Error loading master data:', err);
        setError(err.message || 'Failed to load master data');
      } finally {
        setLoading(false);
      }
    };

    loadMasterData();
  }, []);

  const refreshMasterData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await masterService.fetchAllMasterData();
      const [educations, experiences, maritalStatuses, bloodGroups] = await Promise.all([
        masterService.fetchEducations(),
        masterService.fetchExperiences(),
        masterService.fetchMaritalStatuses(),
        masterService.fetchBloodGroups()
      ]);

      setMasterData({
        ...data,
        educations,
        experiences,
        maritalStatuses,
        bloodGroups
      });
    } catch (err) {
      console.error('Error refreshing master data:', err);
      setError(err.message || 'Failed to refresh master data');
    } finally {
      setLoading(false);
    }
  };

  return {
    masterData,
    loading,
    error,
    refreshMasterData
  };
};
