import API from './api.js';

// Master data service for fetching dropdown options
export const masterService = {
  // Fetch all genders
  fetchGenders: async () => {
    try {
      const response = await API.get('masters/genders/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching genders:', error);
      throw error;
    }
  },

  // Fetch all sources
  fetchSources: async () => {
    try {
      const response = await API.get('masters/sources/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching sources:', error);
      throw error;
    }
  },

  // Fetch all communications
  fetchCommunications: async () => {
    try {
      const response = await API.get('masters/communications/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching communications:', error);
      throw error;
    }
  },

  // Fetch all designations (alias for positions - both use masters/positions API)
  fetchDesignations: async () => {
    try {
      const response = await API.get('masters/positions/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching designations from positions:', error);
      throw error;
    }
  },

  // Fetch all positions
  fetchPositions: async () => {
    try {
      const response = await API.get('masters/positions/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  },

  // Fetch all industries
  fetchIndustries: async () => {
    try {
      const response = await API.get('masters/industries/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching industries:', error);
      throw error;
    }
  },

  // Fetch all remarks
  fetchRemarks: async () => {
    try {
      const response = await API.get('masters/remarks/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching remarks:', error);
      throw error;
    }
  },

  // Fetch all master data at once for better performance
  fetchAllMasterData: async () => {
    try {
      const [genders, sources, communications, positions, industries, remarks] = await Promise.all([
        API.get('masters/genders/'),
        API.get('masters/sources/'),
        API.get('masters/communications/'),
        API.get('masters/positions/'),
        API.get('masters/industries/'),
        API.get('masters/remarks/')
      ]);

      return {
        genders: genders.data.filter(item => item.status === 'Active'),
        sources: sources.data.filter(item => item.status === 'Active'),
        communications: communications.data.filter(item => item.status === 'Active'),
        designations: positions.data.filter(item => item.status === 'Active'), // Use positions data for designations
        positions: positions.data.filter(item => item.status === 'Active'),
        industries: industries.data.filter(item => item.status === 'Active'),
        remarks: remarks.data.filter(item => item.status === 'Active')
      };
    } catch (error) {
      console.error('Error fetching master data:', error);
      throw error;
    }
  },

  // Additional master data that might be useful
  fetchEducations: async () => {
    try {
      const response = await API.get('masters/educations/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching educations:', error);
      throw error;
    }
  },

  fetchExperiences: async () => {
    try {
      const response = await API.get('masters/experience/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching experiences:', error);
      throw error;
    }
  },

  fetchMaritalStatuses: async () => {
    try {
      const response = await API.get('masters/maritalstatuses/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching marital statuses:', error);
      throw error;
    }
  },

  fetchBloodGroups: async () => {
    try {
      const response = await API.get('masters/bloodgroups/');
      return response.data.filter(item => item.status === 'Active');
    } catch (error) {
      console.error('Error fetching blood groups:', error);
      throw error;
    }
  }
};

export default masterService;
