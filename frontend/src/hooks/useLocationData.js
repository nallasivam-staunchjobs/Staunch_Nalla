import { useState, useEffect } from 'react';
import { candidates } from '../api/api';

export const useLocationData = () => {
  const [locationData, setLocationData] = useState({
    states: [],
    cities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all candidates to get unique states and cities
        const response = await candidates.getAll();
        console.log('Raw candidates response:', response);
        
        // Handle different response structures
        let candidatesData = [];
        if (Array.isArray(response)) {
          candidatesData = response;
        } else if (response && Array.isArray(response.data)) {
          candidatesData = response.data;
        } else if (response && Array.isArray(response.results)) {
          candidatesData = response.results;
        } else {
          console.warn('Unexpected response structure:', response);
          candidatesData = [];
        }
        
        console.log('Processed candidates data:', candidatesData);
        
        // Extract unique states
        const uniqueStates = [...new Set(
          candidatesData
            .map(candidate => candidate.state)
            .filter(state => state && state.trim() !== '')
        )].sort();
        
        // Extract unique cities
        const uniqueCities = [...new Set(
          candidatesData
            .map(candidate => candidate.city)
            .filter(city => city && city.trim() !== '')
        )].sort();
        
        console.log('Unique states found:', uniqueStates);
        console.log('Unique cities found:', uniqueCities);
        
        setLocationData({
          states: uniqueStates.map(state => ({ value: state, label: state })),
          cities: uniqueCities.map(city => ({ value: city, label: city }))
        });
        
      } catch (err) {
        console.error('Error fetching location data:', err);
        setError(err.message || 'Failed to load location data');
      } finally {
        setLoading(false);
      }
    };

    fetchLocationData();
  }, []);

  return {
    locationData,
    loading,
    error
  };
};
