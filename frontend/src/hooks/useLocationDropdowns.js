import { useState, useEffect } from 'react';

export const useLocationDropdowns = () => {
  const [locationData, setLocationData] = useState({
    countries: [],
    states: [],
    cities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch countries, states, and cities with proper ID mapping
  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Static countries (can be expanded to API call if needed)
        const countries = [
          { id: 1, name: 'India', value: 'India', label: 'India' },
          { id: 2, name: 'USA', value: 'USA', label: 'USA' },
          { id: 3, name: 'UK', value: 'UK', label: 'UK' },
          { id: 4, name: 'Canada', value: 'Canada', label: 'Canada' },
          { id: 5, name: 'Australia', value: 'Australia', label: 'Australia' }
        ];

        // Fetch states from API
        const statesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/states/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (!statesResponse.ok) {
          throw new Error('Failed to fetch states');
        }
        
        const statesData = await statesResponse.json();
        console.log('States API response:', statesData);
        
        // Transform states data to match the structure you need
        // Remove duplicates by using a Map with state name as key
        const statesMap = new Map();
        (statesData.results || statesData || []).forEach(state => {
          const stateName = state.state.trim();
          if (!statesMap.has(stateName)) {
            statesMap.set(stateName, {
              value: stateName, // Use state name as value for proper matching
              label: stateName, // Display name as label (trim whitespace)
              id: state.id,
              stateid: state.id,
              state: stateName, // Keep name for storage (trim whitespace)
              country: 'India', // Default to India since API doesn't provide country field
              country_id: 1
            });
          }
        });
        const states = Array.from(statesMap.values());

        // Fetch cities from API
        const citiesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/candidate/cities/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (!citiesResponse.ok) {
          throw new Error('Failed to fetch cities');
        }
        
        const citiesData = await citiesResponse.json();
        console.log('Cities API response:', citiesData);
        
        // Transform cities data to match the structure you need
        // Remove duplicates by using a Map with city+state as key
        const citiesMap = new Map();
        (citiesData.results || citiesData || []).forEach(city => {
          const cityName = city.city;
          const stateName = city.state ? city.state.trim() : '';
          const uniqueKey = `${cityName}-${stateName}`; // Unique key combining city and state
          
          if (!citiesMap.has(uniqueKey)) {
            citiesMap.set(uniqueKey, {
              value: cityName, // Use city name as value for form submission
              label: `${cityName}, ${stateName}`, // Display city with state for clarity
              id: city.id,
              city_id: city.id,
              city: cityName, // Keep name for storage
              state: stateName, // Trim whitespace from state name
              state_id: city.state_ids,
              uniqueKey: uniqueKey // Add unique key for React rendering
            });
          }
        });
        const cities = Array.from(citiesMap.values());

        setLocationData({
          countries,
          states,
          cities
        });
        
        console.log('Processed location data:', { countries, states, cities });
        
      } catch (err) {
        console.error('Error fetching location data:', err);
        setError(err.message || 'Failed to load location data');
      } finally {
        setLoading(false);
      }
    };

    fetchLocationData();
  }, []);

  // Filter cities by selected state name
  const getCitiesByState = (stateName) => {
    if (!stateName || !stateName.trim()) return locationData.cities;
    
    const normalizedStateName = stateName.trim().toLowerCase();
    const filteredCities = locationData.cities.filter(city => 
      city.state && city.state.trim().toLowerCase() === normalizedStateName
    );
    
    console.log(`Filtering cities for state: "${stateName}" -> Found ${filteredCities.length} cities`);
    return filteredCities;
  };

  // Filter states by selected country name
  const getStatesByCountry = (countryName) => {
    if (!countryName) return locationData.states;
    
    // Since your API doesn't provide country field for states, 
    // assume all states belong to India
    if (countryName.toLowerCase() === 'india') {
      return locationData.states;
    }
    
    // For other countries, return empty array
    return [];
  };

  // Get location info by name (useful for getting IDs when needed)
  const getLocationInfo = (type, name) => {
    const data = locationData[type] || [];
    return data.find(item => item.name && item.name.toLowerCase() === name.toLowerCase());
  };

  return {
    locationData,
    loading,
    error,
    getCitiesByState,
    getStatesByCountry,
    getLocationInfo
  };
};
