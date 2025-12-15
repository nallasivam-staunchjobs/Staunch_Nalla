import api from '../../../api/api';

/**
 * Assignment Service - Handles candidate assignment operations
 */
export const assignmentService = {
  /**
   * Assign a candidate to an executive for a specific client job
   * @param {number} clientJobId - The client job ID
   * @param {object} assignmentPayload - Assignment data including feedback
   * @returns {Promise} Assignment response
   */
  assignCandidate: async (clientJobId, assignmentPayload) => {
    try {
      console.log('🎯 Assignment Service - Assigning candidate:', {
        clientJobId,
        assignmentPayload
      });

      const response = await api.post(`/client-jobs/${clientJobId}/assign-candidate/`, assignmentPayload);

      console.log('✅ Assignment successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Assignment failed:', error);
      
      // Extract error message from response
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Assignment failed';
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Get assignment information for a client job
   * @param {number} clientJobId - The client job ID
   * @returns {Promise} Assignment information
   */
  getAssignmentInfo: async (clientJobId) => {
    try {
      console.log('📋 Getting assignment info for client job:', clientJobId);

      const response = await api.get(`/client-jobs/${clientJobId}/assignment-info/`);

      console.log('✅ Assignment info retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get assignment info:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to get assignment info';
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Get list of employees available for assignment
   * @returns {Promise} List of employees
   */
  getAvailableEmployees: async () => {
    try {
      console.log('👥 Fetching available employees for assignment');

      const response = await api.get('/empreg/employees/');

      // Filter active employees and format for dropdown
      const employees = response.data
        .filter(emp => {
          // Only active employees with names and not inactive status
          return emp.del_state === 0 && 
                 emp.firstName && 
                 emp.status !== 'Inactive';
        })
        .map(emp => ({
          value: emp.employeeCode || emp.firstName, 
          label: `${emp.firstName} ${emp.lastName || ''}`.trim(),
          level: emp.level,
          department: emp.department,
          position: emp.position,
          uniqueKey: `${emp.id}-${emp.employeeCode || emp.firstName}`, // Create unique key for React
          employeeCode: emp.employeeCode || emp.firstName, // Ensure employeeCode is available
          ...emp
        }))
        .sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically

      console.log('✅ Available employees:', employees.length);
      return employees;
    } catch (error) {
      console.error('❌ Failed to fetch employees:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to fetch employees';
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Get current user's employee information for assign_by
   * @returns {Promise} Current user employee info
   */
  getCurrentUserInfo: async () => {
    try {
      console.log('👤 Getting current user info from localStorage and Redux');

      // Try localStorage first (for backward compatibility)
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const parsedUserInfo = JSON.parse(userInfo);
        console.log('✅ Current user info from localStorage:', parsedUserInfo);

        const storedRole =
          parsedUserInfo.userRole ||
          parsedUserInfo.role ||
          localStorage.getItem('userRole') ||
          localStorage.getItem('temp_auth_userRole') ||
          null;

        return {
          employeeCode: parsedUserInfo.employeeCode,
          firstName: parsedUserInfo.firstName || parsedUserInfo.name,
          userRole: storedRole,
        };
      }

      // Try getting from localStorage with different keys
      const token = localStorage.getItem('token');
      const firstName = localStorage.getItem('firstName');
      const employeeCode = localStorage.getItem('employeeCode');
      const phone = localStorage.getItem('phone');
      const storedRole =
        localStorage.getItem('userRole') ||
        localStorage.getItem('temp_auth_userRole') ||
        null;

      if (token && firstName && employeeCode) {
        console.log('✅ Current user info from localStorage keys:', { firstName, employeeCode, phone, userRole: storedRole });

        return {
          employeeCode: employeeCode,
          firstName: firstName,
          userRole: storedRole,
        };
      }

      // If no user info found, throw error
      throw new Error('User info not found. Please login again.');
    } catch (error) {
      console.error('❌ Failed to get current user info:', error);
      throw new Error('Unable to get current user information. Please login again.');
    }
  }
};

export default assignmentService;
