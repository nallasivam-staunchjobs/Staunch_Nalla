/**
 * Feedback Processing Utilities
 * Centralized functions for parsing and processing feedback data
 */

/**
 * Extract latest feedback data from client job feedback
 * @param {Object} clientJob - The client job object
 * @param {string} field - The field to extract ('remarks', 'nfd', 'ejd', 'ifd')
 * @returns {string} - The latest feedback data for the specified field
 */
export const getLatestFeedbackData = (clientJob, field) => {
  if (!clientJob?.feedback) return "";

  const rawFeedback = clientJob.feedback;

  // Split by ;;;;; separator and get entries
  const feedbackEntries = rawFeedback.split(';;;;;')
    .filter(entry => entry.trim())
    .map(entry => {
      const parsed = {};

      // Extract remarks
      const remarksMatch = entry.match(/Remarks-([^:]+)/);
      parsed.remarks = remarksMatch ? remarksMatch[1].trim() : '';

      // Extract NFD date
      const nfdMatch = entry.match(/NFD-([^:]+)/);
      parsed.nfd = nfdMatch ? nfdMatch[1].trim() : '';

      // Extract EJD date
      const ejdMatch = entry.match(/EJD-([^:]+)/);
      parsed.ejd = ejdMatch ? ejdMatch[1].trim() : '';

      // Extract IFD date
      const ifdMatch = entry.match(/IFD-([^:]+)/);
      parsed.ifd = ifdMatch ? ifdMatch[1].trim() : '';

      // Extract entry time for sorting - handle the exact format from your data
      const entryTimeMatch = entry.match(/Entry Time([^;]+)/);
      let entryTimeStr = entryTimeMatch ? entryTimeMatch[1].trim() : '';
      
      // Parse the DD-MM-YYYY HH:MM:SS format
      if (entryTimeStr) {
        // Handle format like "13-09-2025 12:52:48"
        const timeMatch = entryTimeStr.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
          const [, day, month, year, hour, minute, second] = timeMatch;
          // Create proper ISO date string for parsing
          entryTimeStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        }
      }
      
      parsed.entry_time = entryTimeStr;

      return parsed;
    });

  if (feedbackEntries.length === 0) return "";

  // Sort by entry_time (most recent first)
  const sortedFeedback = feedbackEntries.sort((a, b) => {
    const timeA = new Date(a.entry_time).getTime();
    const timeB = new Date(b.entry_time).getTime();
    return timeB - timeA;
  });

  // Return the latest value for the requested field
  const latestEntry = sortedFeedback[0];
  return latestEntry[field] || "";
};

/**
 * Check if a candidate is assignable based on remarks and NFD status
 * @param {Object} candidate - The candidate object
 * @returns {boolean} - True if the candidate is assignable
 */
export const isAssignable = (candidate) => {
  const clientJob = candidate?.selectedClientJob;
  const latestRemarks = getLatestFeedbackData(clientJob, 'remarks');
  
  // Check if remarks are explicitly 'open profile'
  if (latestRemarks && latestRemarks.toLowerCase() === 'open profile') {
    return true;
  }
  
  // Check if NFD has expired (making it assignable)
  const latestNfd = getLatestFeedbackData(clientJob, 'nfd');
  if (!latestNfd) {
    return false;
  }
  
  // Check if NFD contains "(open profile)" indicating it's expired
  if (latestNfd.includes('(open profile)')) {
    return true;
  }
  
  // Calculate if NFD has expired (same logic as backend)
  try {
    // Parse NFD date and check if expired
    const nfdDateStr = latestNfd.replace(/\(open profile\)/g, '').trim();
    const dateParts = nfdDateStr.split(/[-\/]/);
    if (dateParts.length === 3) {
      const nfdDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
      const currentDate = new Date();
      
      // Calculate expiry threshold: NFD date + 1 day + 12 hours + 1 minute
      const expiryThreshold = new Date(nfdDate);
      expiryThreshold.setDate(expiryThreshold.getDate() + 1);
      expiryThreshold.setHours(12, 1, 0, 0);
      
      return currentDate >= expiryThreshold;
    }
  } catch (error) {
    console.log('Error parsing NFD date:', error);
  }
  
  return false;
};

/**
 * Parse feedback entries into structured format
 * @param {string} rawFeedback - Raw feedback string
 * @returns {Array} - Array of parsed feedback entries
 */
export const parseFeedbackEntries = (rawFeedback) => {
  if (!rawFeedback) return [];

  return rawFeedback.split(';;;;;')
    .filter(entry => entry.trim())
    .map(entry => {
      const parsed = {
        feedback: '',
        remarks: '',
        nfd: '',
        ejd: '',
        ifd: '',
        call_status: '',
        entry_by: '',
        entry_time: '',
        raw_entry: entry
      };

      // Extract feedback text (everything before first colon)
      const feedbackMatch = entry.match(/^Feedback-([^:]+):/);
      parsed.feedback = feedbackMatch ? feedbackMatch[1].trim() : '';

      // Extract remarks
      const remarksMatch = entry.match(/Remarks-([^:]+)/);
      parsed.remarks = remarksMatch ? remarksMatch[1].trim() : '';

      // Extract NFD date
      const nfdMatch = entry.match(/NFD-([^:]+)/);
      parsed.nfd = nfdMatch ? nfdMatch[1].trim() : '';

      // Extract EJD date
      const ejdMatch = entry.match(/EJD-([^:]+)/);
      parsed.ejd = ejdMatch ? ejdMatch[1].trim() : '';

      // Extract IFD date
      const ifdMatch = entry.match(/IFD-([^:]+)/);
      parsed.ifd = ifdMatch ? ifdMatch[1].trim() : '';

      // Extract call status
      const callStatusMatch = entry.match(/CallStatus-([^:]+)/);
      parsed.call_status = callStatusMatch ? callStatusMatch[1].trim() : '';

      // Extract entry by
      const entryByMatch = entry.match(/Entry By-([^:]+)/);
      parsed.entry_by = entryByMatch ? entryByMatch[1].trim() : '';

      // Extract entry time
      const entryTimeMatch = entry.match(/Entry Time([^;]+)/);
      let entryTimeStr = entryTimeMatch ? entryTimeMatch[1].trim() : '';
      
      // Parse the DD-MM-YYYY HH:MM:SS format
      if (entryTimeStr) {
        const timeMatch = entryTimeStr.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
          const [, day, month, year, hour, minute, second] = timeMatch;
          entryTimeStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        }
      }
      
      parsed.entry_time = entryTimeStr;

      return parsed;
    });
};

/**
 * Sort feedback entries by entry time (most recent first)
 * @param {Array} feedbackEntries - Array of feedback entries
 * @returns {Array} - Sorted feedback entries
 */
export const sortFeedbackByTime = (feedbackEntries) => {
  return feedbackEntries.sort((a, b) => {
    const timeA = new Date(a.entry_time).getTime();
    const timeB = new Date(b.entry_time).getTime();
    return timeB - timeA; // Most recent first
  });
};

/**
 * Get feedback statistics for a candidate
 * @param {Object} candidate - The candidate object
 * @returns {Object} - Feedback statistics
 */
export const getFeedbackStats = (candidate) => {
  const clientJob = candidate?.selectedClientJob;
  if (!clientJob?.feedback) {
    return {
      totalEntries: 0,
      latestRemarks: '',
      latestNfd: '',
      isAssignable: false
    };
  }

  const entries = parseFeedbackEntries(clientJob.feedback);
  const sortedEntries = sortFeedbackByTime(entries);

  return {
    totalEntries: entries.length,
    latestRemarks: getLatestFeedbackData(clientJob, 'remarks'),
    latestNfd: getLatestFeedbackData(clientJob, 'nfd'),
    isAssignable: isAssignable(candidate),
    allEntries: sortedEntries
  };
};
