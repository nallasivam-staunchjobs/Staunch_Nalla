// Utility functions for date calculations

/**
 * Calculate next follow-up date (skip Sunday to Monday)
 * @param {Date} baseDate - Base date to calculate from (default: today)
 * @returns {string} - Next follow-up date in YYYY-MM-DD format
 */
export const calculateNextFollowUpDate = (baseDate = new Date()) => {
  const nextDay = new Date(baseDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // If next day is Sunday (0), move to Monday (1)
  if (nextDay.getDay() === 0) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay.toISOString().split('T')[0]; // Return YYYY-MM-DD format
};

/**
 * Format date to YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDateToYMD = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} - Current date string
 */
export const getCurrentDate = () => {
  return formatDateToYMD(new Date());
};
