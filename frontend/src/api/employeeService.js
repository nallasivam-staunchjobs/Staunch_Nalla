// Employee API Service
import API from './api.js';

// Level mappings removed - we now store L1, L2, L3, L4, L5 directly in database

// Transform form data before sending to backend
const transformDataForBackend = (data) => {
  const transformedData = { ...data };
  
  console.log('🔄 Transform - Level will be stored as:', transformedData.level);
  
  // Level conversion removed - we now store L1, L2, L3, L4, L5 directly
  
  // Ensure experienceDetails is always included (fix for database null constraint)
  if (!transformedData.experienceDetails) {
    transformedData.experienceDetails = '';
    console.log('🔧 Transform - Set empty experienceDetails for database compatibility');
  }
  
  // Ensure other potentially required fields have default values
  if (!transformedData.lastCompany) {
    transformedData.lastCompany = '';
  }
  
  return transformedData;
};

// Transform data received from backend for frontend use
const transformDataFromBackend = (data) => {
  const transformedData = { ...data };
  
  // Level conversion removed - database now stores L1, L2, L3, L4, L5 directly
  
  return transformedData;
};

export const employeeService = {
  // Create new employee with all form data
  create: async (employeeData) => {
    try {
      console.log('🚀 Creating employee with data:', employeeData);
      console.log('🚀 Original level in employeeData:', employeeData.level);
      
      // Transform data for backend (convert L1 to employee, etc.)
      const transformedData = transformDataForBackend(employeeData);
      console.log('🚀 Transformed data for backend:', transformedData);
      console.log('🚀 Final level after transformation:', transformedData.level);
      
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Handle all form fields including files
      Object.entries(transformedData).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          return; // Skip null/undefined values
        }
        
        if (value instanceof FileList) {
          // Handle multiple files
          Array.from(value).forEach(file => {
            formData.append(key, file);
          });
        } else if (value instanceof File) {
          // Handle single file
          formData.append(key, value);
        } else if (Array.isArray(value)) {
          // Handle arrays (for multiple file fields)
          value.forEach(item => {
            if (item instanceof File) {
              formData.append(key, item);
            } else {
              formData.append(key, item);
            }
          });
        } else {
          // Handle regular form fields
          formData.append(key, value);
        }
      });

      const response = await API.post('/empreg/employees/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating employee:', error.response?.data || error.message);
      throw error;
    }
  },

  // Update existing employee
  update: async (id, employeeData) => {
    try {
      console.log('Updating employee with ID:', id, 'Data:', employeeData);
      
      // Transform data for backend (convert L1 to employee, etc.)
      const transformedData = transformDataForBackend(employeeData);
      console.log('Transformed data for backend:', transformedData);
      
      // Check if we have any file uploads
      const hasFiles = Object.values(transformedData).some(value => 
        value instanceof File || 
        value instanceof FileList || 
        (Array.isArray(value) && value.some(item => item instanceof File))
      );
      
      let response;
      
      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        Object.entries(transformedData).forEach(([key, value]) => {
          if (value === null || value === undefined) {
            return;
          }
          
          if (value instanceof FileList) {
            Array.from(value).forEach(file => {
              formData.append(key, file);
            });
          } else if (value instanceof File) {
            formData.append(key, value);
          } else if (Array.isArray(value)) {
            value.forEach(item => {
              if (item instanceof File) {
                formData.append(key, item);
              } else {
                formData.append(key, item);
              }
            });
          } else {
            formData.append(key, value);
          }
        });

        response = await API.put(`/empreg/employees/${id}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Use regular JSON for simple field updates
        response = await API.put(`/empreg/employees/${id}/`, transformedData, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      return response.data;
    } catch (error) {
      console.error('Error updating employee:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get all employees
  getAll: async () => {
    try {
      const response = await API.get('/empreg/employees/');
      // No transformation needed - database now stores L1, L2, L3, L4, L5 directly
      const transformedData = Array.isArray(response.data) 
        ? response.data.map(emp => transformDataFromBackend(emp))
        : response.data;
      return transformedData;
    } catch (error) {
      console.error('Error fetching employees:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get employee by ID
  getById: async (id) => {
    try {
      const response = await API.get(`/empreg/employees/${id}/`);
      // No transformation needed - database now stores L1, L2, L3, L4, L5 directly
      return transformDataFromBackend(response.data);
    } catch (error) {
      console.error('Error fetching employee:', error.response?.data || error.message);
      throw error;
    }
  },

  // Delete employee
  delete: async (id) => {
    try {
      const response = await API.delete(`/empreg/employees/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting employee:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get employee info by employee code
  getByEmployeeCode: async (employeeCode) => {
    try {
      const response = await API.get(`/empreg/employee-info/?employeeCode=${employeeCode}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching employee by code:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get current user's profile
  getMyProfile: async () => {
    try {
      const response = await API.get('/empreg/employees/my_profile/');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error.response?.data || error.message);
      throw error;
    }
  },

  // Update current user's profile
  updateMyProfile: async (profileData) => {
    try {
      const formData = new FormData();
      
      Object.entries(profileData).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          return;
        }
        
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value);
        }
      });

      const response = await API.patch('/empreg/employees/my_profile/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error.response?.data || error.message);
      throw error;
    }
  },

  // Fix user-employee mapping
  fixUserMapping: async () => {
    try {
      const response = await API.post('/empreg/fix-user-mapping/');
      return response.data;
    } catch (error) {
      console.error('Error fixing user mapping:', error.response?.data || error.message);
      throw error;
    }
  },

  // Validate employee data before submission
  validateEmployeeData: (employeeData) => {
    const errors = {};
    
    // Required fields validation
    const requiredFields = [
      'firstName',
      'lastName', 
      'phone1',
      'officialEmail',
      'level',
      'department',
      'position'
    ];
    
    requiredFields.forEach(field => {
      if (!employeeData[field] || employeeData[field].trim() === '') {
        errors[field] = `${field} is required`;
      }
    });
    
    // Email validation
    if (employeeData.officialEmail && !/\S+@\S+\.\S+/.test(employeeData.officialEmail)) {
      errors.officialEmail = 'Invalid email format';
    }
    
    if (employeeData.personalEmail && !/\S+@\S+\.\S+/.test(employeeData.personalEmail)) {
      errors.personalEmail = 'Invalid email format';
    }
    
    // Phone validation
    if (employeeData.phone1 && employeeData.phone1.length < 10) {
      errors.phone1 = 'Phone number must be at least 10 digits';
    }
    
    if (employeeData.phone2 && employeeData.phone2.length < 10) {
      errors.phone2 = 'Phone number must be at least 10 digits';
    }
    
    return errors;
  }
};

export default employeeService;
