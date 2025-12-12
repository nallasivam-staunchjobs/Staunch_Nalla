/**
 * Utility functions for search term detection and pre-filling
 */

/**
 * Detects the type of search term (email, phone, or name)
 * @param {string} searchTerm - The search term to analyze
 * @returns {object} - Object containing type and value for pre-filling
 */
export const detectSearchTermType = (searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) {
    return { type: null, value: null };
  }

  const term = searchTerm.trim();

  // Email detection (contains @ and domain)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(term)) {
    return {
      type: 'email',
      value: term,
      field: 'email'
    };
  }

  // Phone number detection (contains only digits, spaces, +, -, (, ))
  const phoneRegex = /^[\d\s\+\-\(\)]+$/;
  const cleanedPhone = term.replace(/[\s\-\(\)]/g, '');
  
  if (phoneRegex.test(term) && cleanedPhone.length >= 7 && cleanedPhone.length <= 15) {
    return {
      type: 'phone',
      value: cleanedPhone,
      field: 'mobile1' // Primary phone field
    };
  }

  // If not email or phone, assume it's a name
  return {
    type: 'name',
    value: term,
    field: 'candidateName'
  };
};

/**
 * Creates pre-fill data object for registration form
 * Handles both single terms and multiple terms (post-submission scenario)
 * @param {string} searchTerm - The original search term
 * @returns {object} - Pre-fill data object
 */
export const createPreFillData = (searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) {
    return null;
  }

  // Handle multiple search terms (space-separated)
  const terms = searchTerm.trim().split(/\s+/);
  const preFillData = {
    searchTerm: searchTerm,
    timestamp: Date.now()
  };

  // Process each term and map to appropriate fields
  terms.forEach(term => {
    const detection = detectSearchTermType(term);
    
    if (detection.type === 'email') {
      preFillData.email = detection.value;
    } else if (detection.type === 'phone') {
      // Fill mobile1 first, then mobile2 if mobile1 is already filled
      if (!preFillData.mobile1) {
        preFillData.mobile1 = detection.value;
      } else if (!preFillData.mobile2) {
        preFillData.mobile2 = detection.value;
      }
    } else if (detection.type === 'name') {
      preFillData.candidateName = detection.value;
    }
  });

  return preFillData;
};
