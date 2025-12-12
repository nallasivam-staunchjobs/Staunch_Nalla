// Utility functions to map between frontend and backend data structures

// Map frontend form data to backend candidate model
export const mapFormDataToCandidate = (formData, executiveCode = null) => {
  return {
    profile_number: formData.profileNumber,
    executive_name: executiveCode ? executiveCode : (formData.executiveName || 'Unknown'), // Use executiveCode for DB storage if provided
    candidate_name: formData.candidateName,
    mobile1: formData.mobile1,
    mobile2: formData.mobile2 || null,
    email: formData.email,
    dob: formData.dob ? (() => {
      // Handle different date formats
      if (typeof formData.dob === 'string' && formData.dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return formData.dob;
      }
      try {
        const date = new Date(formData.dob);
        if (isNaN(date.getTime())) {
          return null;
        }
        return date.toISOString().split('T')[0];
      } catch (error) {
        return null;
      }
    })() : null,
    gender: formData.gender || null,
    country: formData.country || null,
    state: formData.state || null,
    city: formData.city || null,
    pincode: formData.pincode || null,
    education: formData.education || null,
    experience: formData.experience || null,
    source: formData.source || null,
    communication: formData.communication || null,
    skills: Array.isArray(formData.skills)
      ? formData.skills
      : formData.skills
      ? [formData.skills]
      : [],
    languages: Array.isArray(formData.languages)
      ? formData.languages
      : formData.languages
      ? [formData.languages]
      : [],
    resume_file: formData.resumeFile || null, // Handle resume file from formData
    resume_preview: formData.resumePreview || null,
  };
};

// Map frontend form data to backend client job model
export const mapFormDataToClientJob = (formData, candidateId) => {
  return {
    candidate: candidateId,
    client_name: formData.clientName,
    designation: formData.designation,
    industry: formData.industry ? [formData.industry] : [],
    current_ctc: formData.currentCtc || null,
    expected_ctc: formData.expectedCtc || null,
    remarks: formData.remarks || null,
    interview_date: formData.interviewDate || null,
    expected_joining_date: formData.expectedJoiningDate || null,
    next_follow_up_date: formData.nextFollowUpDate ? (() => {
      if (typeof formData.nextFollowUpDate === 'string' && formData.nextFollowUpDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return formData.nextFollowUpDate;
      }
      try {
        const date = new Date(formData.nextFollowUpDate);
        if (isNaN(date.getTime())) {
          return null;
        }
        return date.toISOString().split('T')[0];
      } catch (error) {
        return null;
      }
    })() : null,
    profile_submission: formData.profileSubmission === 'Yes' ? true : false,
    profile_submission_date: formData.submissionDate || null,
    attend: formData.attend === 'Yes' ? 1 : 0,
    attend_date: formData.attendDate || formData.attendedDate || null,
    // Keep backward compatibility
    attended: formData.attend === 'Yes' || formData.attended === true || formData.attended === 'Yes',
    attended_date: formData.attendDate || formData.attendedDate || null,
  };
};

// Map frontend form data to backend education certificate model
export const mapFormDataToEducationCertificate = (formData, candidateId) => {
  const certificates = [];

  // 10th Certificate
  if (formData.tenthCertificate !== undefined) {
    certificates.push({
      candidate: candidateId,
      type: '10th',
      has_certificate: formData.tenthCertificate,
      reason: formData.tenthCertificateReason || null,
    });
  }

  // 12th Certificate
  if (formData.twelfthCertificate !== undefined) {
    certificates.push({
      candidate: candidateId,
      type: '12th',
      has_certificate: formData.twelfthCertificate,
      reason: formData.twelfthCertificateReason || null,
    });
  }

  // Diploma Certificate
  if (formData.diplomaCertificate !== undefined) {
    certificates.push({
      candidate: candidateId,
      type: 'Diploma',
      has_certificate: formData.diplomaCertificate,
      reason: formData.diplomaCertificateReason || null,
    });
  }

  // UG Certificate
  if (formData.ugCertificate !== undefined) {
    certificates.push({
      candidate: candidateId,
      type: 'UG',
      has_certificate: formData.ugCertificate,
      reason: formData.ugCertificateReason || null,
    });
  }

  // PG Certificate
  if (formData.pgCertificate !== undefined) {
    certificates.push({
      candidate: candidateId,
      type: 'PG',
      has_certificate: formData.pgCertificate,
      reason: formData.pgCertificateReason || null,
    });
  }

  // Education Gap
  if (formData.educationGap !== undefined) {
    certificates.push({
      candidate: candidateId,
      type: 'Education Gap',
      has_certificate: !formData.educationGap, // Inverted logic: if there's a gap, has_certificate = false
      reason: formData.educationGapReason || null,
    });
  }

  return certificates;
};

// Map frontend form data to backend experience company model
export const mapFormDataToExperienceCompany = (formData, candidateId) => {
  // Get current company data (first item in experienceCompanies array)
  const currentCompany =
    formData.experienceCompanies && formData.experienceCompanies.length > 0
      ? formData.experienceCompanies[0]
      : {};

  return {
    candidate: candidateId,
    offer_letter: currentCompany.offerLetter,
    offer_letter_reason: currentCompany.offerLetterReason || null,
    payslip: currentCompany.payslip,
    payslip_reason: currentCompany.payslipReason || null,
    relieving_letter: currentCompany.relievingLetter,
    relieving_letter_reason: currentCompany.relievingLetterReason || null,
    notice_period: formData.noticePeriod || null,
    incentives: currentCompany.incentives,
    incentive_amount: currentCompany.incentiveAmount || null,
    incentive_proof: currentCompany.incentiveProof,
    incentive_proof_reason: currentCompany.incentiveProofReason || null,
    more_than_15_months: currentCompany.moreThan15Months || false,
    first_salary: currentCompany.firstSalary || null,
    current_salary: currentCompany.currentSalary || null,
  };
};

// Map frontend form data to backend additional info model
export const mapFormDataToAdditionalInfo = (formData, candidateId) => {
  return {
    candidate: candidateId,
    has_two_wheeler: formData['two-wheeler'] !== undefined ? formData['two-wheeler'] : null,
    two_wheeler_license: formData.twoWheelerLicense !== undefined ? formData.twoWheelerLicense : null,
    license_expected_date: formData.licenseExpectedDate || null,
    has_laptop: formData.laptop !== undefined ? formData.laptop : null,
  };
};

// Map frontend form data to backend feedback model
export const mapFormDataToFeedback = (formData, candidateId, clientJobId = null) => {
  return {
    candidate: candidateId,
    feedback_text: formData.feedback || '',
    
    client_job: clientJobId,
  };
};

// Map backend candidate model to frontend form data
export const mapCandidateToFormData = (candidate) => {
  return {
    profileNumber: candidate.profile_number,
    executiveName: candidate.executive_name,
    candidateName: candidate.candidate_name,
    mobile1: candidate.mobile1,
    mobile2: candidate.mobile2 || '',
    email: candidate.email,
    dob: candidate.dob || '',
    gender: candidate.gender || '',
    country: candidate.country || '',
    state: candidate.state || '',
    city: candidate.city || '',
    pincode: candidate.pincode || '',
    education: candidate.education || '',
    experience: candidate.experience || '',
    source: candidate.source || '',
    communication: candidate.communication || '',
    skills: Array.isArray(candidate.skills)
      ? candidate.skills
      : candidate.skills
      ? [candidate.skills]
      : [],
    languages: Array.isArray(candidate.languages)
      ? candidate.languages
      : candidate.languages
      ? [candidate.languages]
      : [],
    resumeFile: null, // Cannot map file from backend
    resumePreview: candidate.resume_preview || null,
  };
};

// Helper function to format time in Indian format with AM/PM
const formatIndianTime = (timeString) => {
  if (!timeString) return '';
  
  try {
    // Parse the ISO time string
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return timeString; // Return original if invalid
    
    // Format in Indian timezone with AM/PM
    const options = {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true // This adds AM/PM
    };
    
    return date.toLocaleString('en-IN', options);
  } catch (error) {
    return timeString; // Return original if formatting fails
  }
};

// Helper function to parse ClientJob feedback entries
const parseClientJobFeedback = (feedbackString) => {
  if (!feedbackString) return [];
  
  try {
    // console.log('DataMapper Debug - Raw feedback string:', feedbackString);
    
    // Split by semicolons and filter out empty entries
    const entries = feedbackString.split(';;;;;')
      .filter(entry => entry.trim());
    // console.log('DataMapper Debug - Split entries:', entries);
    
    const parsedEntries = entries.map((entry, index) => {
        const parsed = {};
        
        // Extract feedback text
        const feedbackMatch = entry.match(/Feedback-([^:]+)/);
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
        
        // Extract entry time - handle the exact format from your data
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
        parsed.original_entry_time = entryTimeMatch ? entryTimeMatch[1].trim() : '';
        
        // Add formatted Indian time for display
        parsed.formatted_entry_time = formatIndianTime(entryTimeStr);
        
        // Extract entry by
        const entryByMatch = entry.match(/Entry By-([^:]+)/);
        parsed.entry_by = entryByMatch ? entryByMatch[1].trim() : '';
        
        // console.log(`DataMapper Debug - Entry ${index}:`, parsed);
        return parsed;
      });
    
    // Sort by entry_time (most recent first)
    const sortedEntries = parsedEntries.sort((a, b) => {
        const timeA = new Date(a.entry_time || 0);
        const timeB = new Date(b.entry_time || 0);
        // console.log('DataMapper Debug - Sorting:', { 
        //   entryA: a.original_entry_time, 
        //   entryB: b.original_entry_time,
        //   timeA, 
        //   timeB, 
        //   result: timeB - timeA 
        // });
        return timeB - timeA;
      });
    
    // console.log('DataMapper Debug - Final sorted entries:', sortedEntries);
    return sortedEntries;
  } catch (error) {
    console.error('DataMapper Error parsing feedback:', error);
    return [];
  }
};

// Get latest feedback data from parsed entries
const getLatestFeedbackField = (feedbackEntries, field) => {
  if (!feedbackEntries || feedbackEntries.length === 0) return '';
  return feedbackEntries[0][field] || '';
};

// Map backend client job model to frontend form data
export const mapClientJobToFormData = (clientJob = {}) => {
  // Handle null or undefined clientJob
  if (!clientJob || typeof clientJob !== 'object') {
    clientJob = {};
  }
  
  // Parse feedback entries
  const feedbackEntries = parseClientJobFeedback(clientJob.feedback);
  
  return {
    clientName: clientJob.client_name || '',
    designation: clientJob.designation || '',
    industry: Array.isArray(clientJob.industry)
      ? clientJob.industry[0]
      : clientJob.industry || '',
    currentCtc: clientJob.current_ctc || '',
    expectedCtc: clientJob.expected_ctc || '',
    remarks: getLatestFeedbackField(feedbackEntries, 'remarks'),
    // Use actual database fields instead of feedback entries for dates
    nextFollowUpDate: clientJob.next_follow_up_date || '',
    interviewDate: clientJob.interview_date || '',
    expectedJoiningDate: clientJob.expected_joining_date || '',
    profileSubmission: (clientJob.profile_submission === true || clientJob.profile_submission === 1 || clientJob.profile_submission === '1' || clientJob.profile_submission === 'Yes') ? 'Yes' : 'No',
    profileSubmissionDate: clientJob.profile_submission_date || '',
    // Keep submissionDate for backward compatibility
    submissionDate: clientJob.profile_submission_date || '',
    // Additional fields for ViewModal display
    vendorStatus: clientJob.vendor_status || 'Pending',
    clientStatus: clientJob.client_status || 'Pending',
    feedback: getLatestFeedbackField(feedbackEntries, 'feedback'),
    feedbackEntries: feedbackEntries, // Return full array for advanced usage
    // Keep feedback-based fields for backward compatibility
    nfd: getLatestFeedbackField(feedbackEntries, 'nfd'),
    interviewFixedDate: clientJob.interview_date || '',
    profileSubmissionDate: clientJob.profile_submission_date || '',
    // Map attend/attend_date from backend to form data
    attend: clientJob.attend === 1 || clientJob.attend === '1' || clientJob.attend === true ? 'Yes' : 'No',
    attendDate: clientJob.attend_date || clientJob.attended_date || '',
    // Keep backward compatibility
    attended: clientJob.attend === 1 || clientJob.attend === '1' || clientJob.attend === true || clientJob.attended === true,
    attendedDate: clientJob.attend_date || clientJob.attended_date || '',
  };
};

// Map backend education certificate model to frontend form data
export const mapEducationCertificateToFormData = (educationCertificates) => {
  const formData = {
    tenthCertificate: undefined,
    tenthCertificateReason: '',
    twelfthCertificate: undefined,
    twelfthCertificateReason: '',
    diplomaCertificate: undefined,
    diplomaCertificateReason: '',
    ugCertificate: undefined,
    ugCertificateReason: '',
    pgCertificate: undefined,
    pgCertificateReason: '',
    educationGap: undefined,
    educationGapReason: '',
  };

  educationCertificates.forEach((cert) => {
    switch (cert.type) {
      case '10th':
        formData.tenthCertificate = cert.has_certificate;
        formData.tenthCertificateReason = cert.reason || '';
        break;
      case '12th':
        formData.twelfthCertificate = cert.has_certificate;
        formData.twelfthCertificateReason = cert.reason || '';
        break;
      case 'Diploma':
        formData.diplomaCertificate = cert.has_certificate;
        formData.diplomaCertificateReason = cert.reason || '';
        break;
      case 'UG':
        formData.ugCertificate = cert.has_certificate;
        formData.ugCertificateReason = cert.reason || '';
        break;
      case 'PG':
        formData.pgCertificate = cert.has_certificate;
        formData.pgCertificateReason = cert.reason || '';
        break;
      case 'Education Gap':
        formData.educationGap = !cert.has_certificate; // Inverted logic: if has_certificate = false, then there's a gap
        formData.educationGapReason = cert.reason || '';
        break;
    }
  });

  return formData;
};

// Map backend experience company model to frontend form data
export const mapExperienceCompanyToFormData = (experienceCompany) => {
  const experienceCompanies = [
    {
      offerLetter: experienceCompany.offer_letter,
      offerLetterReason: experienceCompany.offer_letter_reason || '',
      payslip: experienceCompany.payslip,
      payslipReason: experienceCompany.payslip_reason || '',
      relievingLetter: experienceCompany.relieving_letter,
      relievingLetterReason: experienceCompany.relieving_letter_reason || '',
      incentives: experienceCompany.incentives,
      incentiveAmount: experienceCompany.incentive_amount || '',
      incentiveProof: experienceCompany.incentive_proof,
      incentiveProofReason: experienceCompany.incentive_proof_reason || '',
      moreThan15Months: experienceCompany.more_than_15_months || false,
      firstSalary: experienceCompany.first_salary || '',
      currentSalary: experienceCompany.current_salary || '',
    },
  ];

  return {
    noticePeriod: experienceCompany.notice_period || '',
    experienceCompanies,
  };
};

// Map backend additional info model to frontend form data
export const mapAdditionalInfoToFormData = (additionalInfo) => {
  return {
    'two-wheeler': additionalInfo.has_two_wheeler || false,
    twoWheelerLicense: additionalInfo.two_wheeler_license || false,
    licenseExpectedDate: additionalInfo.license_expected_date || '',
    laptop: additionalInfo.has_laptop || false,
  };
};

// Map backend feedback model to frontend form data
export const mapFeedbackToFormData = (feedback) => {
  return {
    feedback: feedback.feedback_text || '',
    feedbackFile: null, // Cannot map file from backend
  };
};

// Map frontend experienceCompanies to backend previousCompanies format
export const mapExperienceCompaniesToPreviousCompanies = (formData) => {
  if (
    !formData.experienceCompanies ||
    formData.experienceCompanies.length <= 1
  ) {
    return [];
  }

  // Skip index 0 (current company) and map the rest as previous companies
  return formData.experienceCompanies.slice(1).map((company, index) => ({
    company_name: `Previous Company ${index + 1}`, // Default name since not collected in form

    offer_letter: company.offerLetter || false,
    offer_letter_reason: company.offerLetterReason || '',
    payslip: company.payslip || false,
    payslip_reason: company.payslipReason || '',
    relieving_letter: company.relievingLetter || false,
    relieving_letter_reason: company.relievingLetterReason || '',
  }));
};

// Map backend previous companies to frontend form data
export const mapPreviousCompaniesToFormData = (previousCompanies) => {
  const mappedPreviousCompanies = previousCompanies.map((company) => ({
    offer_letter: company.offer_letter || false,
    offer_letter_reason: company.offer_letter_reason || '',
    payslip: company.payslip || false,
    payslipReason: company.payslip_reason || '',
    relievingLetter: company.relieving_letter || false,
    relievingLetterReason: company.relieving_letter_reason || '',
  }));

  return {
    previousCompanies: mappedPreviousCompanies,
  };
};

// Combine all backend data into a single form data object
export const combineBackendDataToFormData = (
  candidate,
  clientJobs,
  educationCertificates,
  experienceCompanies,
  previousCompanies,
  additionalInfo,
  feedbacks
) => {
  return {
    ...mapCandidateToFormData(candidate),
    ...(clientJobs && clientJobs.length > 0
      ? mapClientJobToFormData(clientJobs[0])
      : {}),
    ...(educationCertificates && educationCertificates.length > 0
      ? mapEducationCertificateToFormData(educationCertificates)
      : {}),
    ...(experienceCompanies && experienceCompanies.length > 0
      ? mapExperienceCompanyToFormData(experienceCompanies[0])
      : {}),
    ...(previousCompanies && previousCompanies.length > 0
      ? mapPreviousCompaniesToFormData(previousCompanies)
      : { previousCompanies: [] }),
    ...(additionalInfo && additionalInfo.length > 0
      ? mapAdditionalInfoToFormData(additionalInfo[0])
      : {}),
    ...(feedbacks && feedbacks.length > 0
      ? mapFeedbackToFormData(feedbacks[0])
      : {}),
  };
};
