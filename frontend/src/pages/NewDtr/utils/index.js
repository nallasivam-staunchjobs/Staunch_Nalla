/**
 * NewDtr Utils Index
 * Central export point for all utility functions
 */

// Executive and Employee utilities
export {
  displayValue,
  getDisplayExecutiveName,
  fetchEmployeeName,
  fetchEmployeeNames,
  getEmployeeNameFromCache,
  clearEmployeeNameCache,
  getCacheStats
} from './executiveUtils';

// Feedback processing utilities
export {
  getLatestFeedbackData,
  isAssignable,
  parseFeedbackEntries,
  sortFeedbackByTime,
  getFeedbackStats
} from './feedbackUtils';

// Common utilities
export {
  formatDateToIndian,
  formatCurrency,
  truncateText,
  isValidPhone,
  isValidEmail,
  getInitials,
  debounce,
  deepClone,
  isEmpty,
  capitalizeWords,
  generateId,
  formatFileSize,
  isBusinessHours,
  getRelativeTime
} from './commonUtils';

// Re-export existing utilities for backward compatibility
export * from './dataMapper';
export * from './dataTransformers';
export * from './dateUtils';
export * from './searchUtils';
export * from './localStorage';
export * from './candidateScoring';
export * from './apiHelpers';
