/**
 * API Helper functions for file validation and other utilities
 */

/**
 * Validates a file based on the provided options
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxSize - Maximum file size in bytes
 * @param {string[]} options.allowedTypes - Array of allowed file extensions (e.g., ['.pdf', '.doc', '.docx'])
 * @param {boolean} options.required - Whether the file is required
 * @returns {string|null} - Returns error message if validation fails, null if valid
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // Default 10MB
    allowedTypes = ['.pdf', '.doc', '.docx'],
    required = false
  } = options;

  // Check if file is required but not provided
  if (required && !file) {
    return 'File is required';
  }

  // If file is not provided and not required, it's valid
  if (!file && !required) {
    return null;
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return `File size must be less than ${maxSizeMB}MB`;
  }

  // Check file type
  if (allowedTypes && allowedTypes.length > 0) {
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.some(type => 
      fileName.endsWith(type.toLowerCase())
    );

    if (!isValidType) {
      return `Only ${allowedTypes.join(', ')} files are allowed`;
    }
  }

  // Check MIME type as additional validation
  const allowedMimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  if (allowedTypes && allowedTypes.length > 0) {
    const validMimeTypes = allowedTypes
      .map(ext => allowedMimeTypes[ext.toLowerCase()])
      .filter(Boolean);

    if (validMimeTypes.length > 0 && !validMimeTypes.includes(file.type)) {
      return `Invalid file type. Only ${allowedTypes.join(', ')} files are supported`;
    }
  }

  return null; // File is valid
};

/**
 * Formats file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Gets file extension from filename
 * @param {string} filename - The filename
 * @returns {string} - File extension with dot (e.g., '.pdf')
 */
export const getFileExtension = (filename) => {
  if (!filename) return '';
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
};

/**
 * Checks if a file type is supported for resume parsing
 * @param {string} fileType - MIME type or file extension
 * @returns {boolean} - True if supported
 */
export const isResumeFileSupported = (fileType) => {
  const supportedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pdf',
    '.doc',
    '.docx'
  ];

  return supportedTypes.includes(fileType.toLowerCase());
};
