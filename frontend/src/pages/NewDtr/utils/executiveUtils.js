/**
 * Executive Name Utilities
 * Centralized functions for handling executive names and employee lookups
 */

import { employeeAPI } from '../../../api/api';

// Global cache for employee names to prevent duplicate API calls
let employeeNameCache = {};
let failedEmployeeCodesCache = new Set();

/**
 * Helper function to display null/undefined values as dash
 * @param {any} value - The value to display
 * @returns {string} - The formatted display value
 */
export const displayValue = (value) => {
  if (value === null || value === undefined || value === '' || value === 'null') {
    return '-';
  }
  return value;
};

/**
 * Get the correct executive name based on assignment status
 * @param {Object} candidate - The candidate object
 * @param {Object} clientJob - The client job object
 * @returns {string} - The display executive name
 */
export const getDisplayExecutiveName = (candidate, clientJob) => {
  // Priority 1: Use backend's computed display_executive_name if available
  if (clientJob?.display_executive_name) {
    return clientJob.display_executive_name;
  }
  
  // Priority 2: Use backend's computed current_executive_name if available
  if (clientJob?.current_executive_name) {
    return clientJob.current_executive_name;
  }
  
  // Priority 3: Check if this client job has been assigned (assign field is 'assigned')
  if (clientJob?.assign === 'assigned' && clientJob?.assign_to) {
    // Return the assigned executive name (assign_to should contain the name)
    return clientJob.assign_to;
  }
  
  // Priority 4: Fallback to original candidate executive name
  return candidate?.executive_name || candidate?.executiveName || 'N/A';
};

/**
 * Fetch employee name by employee code with caching
 * @param {string} employeeCode - The employee code to lookup
 * @returns {Promise<string>} - The employee name or code if not found
 */
export const fetchEmployeeName = async (employeeCode) => {
  // Return cached name if available
  if (employeeNameCache[employeeCode]) {
    return employeeNameCache[employeeCode];
  }

  // Skip if previously failed
  if (failedEmployeeCodesCache.has(employeeCode)) {
    return employeeCode;
  }

  // Skip if employeeCode looks like a full name instead of employee code
  const isValidEmployeeCode = employeeCode && (
    employeeCode.startsWith('Emp/') ||  // Standard employee codes like "Emp/00101"
    /^[A-Z]{2,4}\d{3,6}$/.test(employeeCode) // Alternative codes like "HR001", "IT1234"
  );
  
  if (!employeeCode || 
      employeeCode.includes(' ') || 
      employeeCode.length > 20 ||
      employeeCode.length < 3 ||
      !isValidEmployeeCode) {
    console.log(`⚠️ Skipping employee lookup for "${employeeCode}" - appears to be a name, not employee code`);
    // Cache as-is to avoid future lookups
    employeeNameCache[employeeCode] = employeeCode;
    return employeeCode;
  }

  try {
    const employeeInfo = await employeeAPI.getEmployeeInfo(employeeCode);
    const firstName = employeeInfo.firstName || employeeCode;
    
    // Cache the result
    employeeNameCache[employeeCode] = firstName;
    return firstName;
  } catch (error) {
    // Suppress console errors for employee lookups to reduce noise
    console.log(`⚠️ Employee "${employeeCode}" not found in system`);
    // Add to failed cache to prevent future requests
    failedEmployeeCodesCache.add(employeeCode);
    // Cache the employeeCode as fallback
    employeeNameCache[employeeCode] = employeeCode;
    return employeeCode;
  }
};

/**
 * Fetch multiple employee names by employee codes with batch optimization
 * @param {Array<string>} employeeCodes - Array of employee codes to lookup
 * @returns {Promise<Object>} - Object mapping employee codes to names
 */
export const fetchEmployeeNames = async (employeeCodes) => {
  const newEmployeeNames = { ...employeeNameCache };
  const codesToFetch = employeeCodes.filter(code => code && !newEmployeeNames[code]);

  if (codesToFetch.length === 0) {
    return newEmployeeNames;
  }

  try {
    // Batch fetch employee names
    const employeePromises = codesToFetch.map(async (code) => {
      try {
        const employeeInfo = await employeeAPI.getEmployeeInfo(code);
        return { code, name: employeeInfo.firstName || code };
      } catch (error) {
        console.log(`⚠️ Employee "${code}" not found`);
        failedEmployeeCodesCache.add(code);
        return { code, name: code };
      }
    });

    const results = await Promise.all(employeePromises);
    
    // Update cache with results
    results.forEach(({ code, name }) => {
      newEmployeeNames[code] = name;
      employeeNameCache[code] = name;
    });

    return newEmployeeNames;
  } catch (error) {
    console.error('Error fetching employee names:', error);
    return newEmployeeNames;
  }
};

/**
 * Get employee name from cache or return code if not cached
 * @param {string} employeeCode - The employee code
 * @returns {string} - The employee name or code
 */
export const getEmployeeNameFromCache = (employeeCode) => {
  return employeeNameCache[employeeCode] || employeeCode || 'Unknown';
};

/**
 * Clear the employee name cache (useful for testing or forced refresh)
 */
export const clearEmployeeNameCache = () => {
  employeeNameCache = {};
  failedEmployeeCodesCache.clear();
};

/**
 * Get current cache statistics (useful for debugging)
 * @returns {Object} - Cache statistics
 */
export const getCacheStats = () => {
  return {
    cachedNames: Object.keys(employeeNameCache).length,
    failedCodes: failedEmployeeCodesCache.size,
    cache: employeeNameCache
  };
};
