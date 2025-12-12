// Transform backend candidate data to frontend format
export const transformBackendToFrontend = (backendCandidate) => {
  return {
    id: backendCandidate.id,
    serialNo: 1, // This will be set by the component
    executiveName: backendCandidate.executive_name || "N/A",
    candidateName: backendCandidate.candidate_name || backendCandidate.name || "N/A",
    contactNumber1: backendCandidate.can_mobile_no_1 || backendCandidate.phone || "N/A",
    contactNumber2: backendCandidate.can_mobile_no_2 || "",
    email: backendCandidate.can_email || backendCandidate.email || "N/A",
    education: backendCandidate.can_edu || backendCandidate.education || "N/A",
    experience: backendCandidate.can_exp || backendCandidate.experience || "N/A",
    address: backendCandidate.address || "N/A",
    vendorName: backendCandidate.vendor_name || "N/A",
    desigination: backendCandidate.designation || "N/A",
    ctc: backendCandidate.ctc || backendCandidate.current_ctc || "N/A",
    profileNumber: backendCandidate.profile_number || `PROF-${backendCandidate.id}`,
    lastUpdated: backendCandidate.updated_at || backendCandidate.created_at || "N/A",
    source: "existing",
    backendData: backendCandidate
  };
};

// Transform frontend form data to backend format
export const transformFrontendToBackend = (formData, resumeFile) => {
  return {
    pinno: formData.pinno || formData.profileNumber || "N/A",
    executive_name: formData.executiveName || formData.executive_name || "N/A",
    candidate_name: formData.candidateName || formData.candidate_name || `${formData.firstName || ""} ${formData.lastName || ""}`.trim() || "N/A",
    can_email: formData.email || formData.can_email || "N/A",
    can_mobile_no_1: formData.mobile1 || formData.phone || formData.primaryNumber || formData.can_mobile_no_1 || "N/A",
    can_mobile_no_2: formData.mobile2 || formData.alternatePhone || formData.secondaryNumber || formData.can_mobile_no_2 || "",
    can_dob: formData.dob || formData.dateOfBirth || formData.can_dob || null,
    can_gender: formData.gender || formData.can_gender || "N/A",
    can_country: formData.country || formData.can_country || "N/A",
    can_state: formData.state || formData.can_state || "N/A",
    can_city: formData.city || formData.can_city || "N/A",
    can_pin: formData.pincode || formData.zipCode || formData.can_pin || "N/A",
    can_edu: formData.education || formData.can_edu || "N/A",
    can_exp: formData.experience || formData.can_exp || "N/A",
    can_c_ctc: formData.currentCtc || formData.can_c_ctc || "N/A",
    can_e_ctc: formData.expectedCtc || formData.can_e_ctc || "N/A",
    can_skill: formData.skills?.join(", ") || formData.can_skill || "N/A",
    can_language: formData.languages?.join(", ") || formData.can_language || "N/A",
    can_resume: resumeFile,
    // Additional fields from form
    address: formData.address || "N/A",
    notice_period: formData.noticePeriod || "N/A",
    current_company: formData.currentCompany || "N/A",
    current_designation: formData.currentDesignation || "N/A",
    total_experience: formData.totalExperience || "N/A",
    relevant_experience: formData.relevantExperience || "N/A",
    source: formData.source || "N/A",
    industry: formData.industry || "N/A",
    department: formData.department || "N/A",
    designation: formData.designation || "N/A",
    remarks: formData.remarks || "N/A",
    // Handle both attend and attended fields for backward compatibility
    attend: formData.attend === 'Yes' ? 1 : (formData.attend === 'No' ? 0 : (formData.attend === 1 || formData.attend === '1' || formData.attend === true ? 1 : 0)),
    attend_date: formData.attendDate || formData.attendedDate || null,
    // Keep backward compatibility
    attended: formData.attend === 'Yes' || formData.attended === true || formData.attend === 1 || formData.attend === '1',
    attended_date: formData.attendDate || formData.attendedDate || null,
    profile_submission: formData.profileSubmission === 'Yes' ? true : false,
    profile_submission_date: formData.submissionDate || null,
  };
};

// Transform backend search results to frontend format
export const transformSearchResults = (backendResults) => {
  return backendResults.map((candidate, index) => ({
    id: candidate.id,
    serialNo: index + 1,
    executiveName: candidate.executive_name || "N/A",
    candidateName: candidate.candidate_name || candidate.name || "N/A",
    contactNumber1: candidate.can_mobile_no_1 || candidate.phone || "N/A",
    contactNumber2: candidate.can_mobile_no_2 || "",
    email: candidate.can_email || candidate.email || "N/A",
    education: candidate.can_edu || candidate.education || "N/A",
    experience: candidate.can_exp || candidate.experience || "N/A",
    address: candidate.address || "N/A",
    vendorName: candidate.vendor_name || "N/A",
    desigination: candidate.designation || "N/A",
    ctc: candidate.ctc || candidate.current_ctc || "N/A",
    profileNumber: candidate.profile_number || `PROF-${candidate.id}`,
    lastUpdated: candidate.updated_at || candidate.created_at || "N/A",
    source: "existing",
    backendData: candidate
  }));
};

// Transform frontend candidate to backend format for updates
export const transformForUpdate = (frontendCandidate, formData) => {
  return {
    pinno: formData.pinno || frontendCandidate.backendData?.pinno || "N/A",
    executive_name: formData.executiveName || frontendCandidate.backendData?.executive_name || "N/A",
    candidate_name: formData.candidateName || frontendCandidate.backendData?.candidate_name || "N/A",
    can_email: formData.email || frontendCandidate.backendData?.can_email || "N/A",
    can_mobile_no_1: formData.contactNumber1 || frontendCandidate.backendData?.can_mobile_no_1 || "N/A",
    can_mobile_no_2: formData.contactNumber2 || frontendCandidate.backendData?.can_mobile_no_2 || "",
    can_edu: formData.education || frontendCandidate.backendData?.can_edu || "N/A",
    can_skill: formData.skills?.join(", ") || frontendCandidate.backendData?.can_skill || "N/A",
    can_exp: formData.experience || frontendCandidate.backendData?.can_exp || "N/A",
    address: formData.address || frontendCandidate.backendData?.address || "N/A",
    city: formData.city || frontendCandidate.backendData?.city || "N/A",
    state: formData.state || frontendCandidate.backendData?.state || "N/A",
    zip_code: formData.zipCode || frontendCandidate.backendData?.zip_code || "N/A",
    country: formData.country || frontendCandidate.backendData?.country || "N/A",
    gender: formData.gender || frontendCandidate.backendData?.gender || "N/A",
    date_of_birth: formData.dateOfBirth || frontendCandidate.backendData?.date_of_birth || null,
    current_ctc: formData.currentCtc || frontendCandidate.backendData?.current_ctc || "N/A",
    expected_ctc: formData.expectedCtc || frontendCandidate.backendData?.expected_ctc || "N/A",
    notice_period: formData.noticePeriod || frontendCandidate.backendData?.notice_period || "N/A",
    current_company: formData.currentCompany || frontendCandidate.backendData?.current_company || "N/A",
    current_designation: formData.currentDesignation || frontendCandidate.backendData?.current_designation || "N/A",
    total_experience: formData.totalExperience || frontendCandidate.backendData?.total_experience || "N/A",
    relevant_experience: formData.relevantExperience || frontendCandidate.backendData?.relevant_experience || "N/A",
    source: formData.source || frontendCandidate.backendData?.source || "N/A",
    industry: formData.industry || frontendCandidate.backendData?.industry || "N/A",
    department: formData.department || frontendCandidate.backendData?.department || "N/A",
    designation: formData.designation || frontendCandidate.backendData?.designation || "N/A",
    remarks: formData.remarks || frontendCandidate.backendData?.remarks || "N/A",
    profile_submission: formData.profileSubmission === 'Yes' ? true : false,
    profile_submission_date: formData.submissionDate || null,
    // Handle both attend and attended fields for backward compatibility
    attend: formData.attend === 'Yes' ? 1 : (formData.attend === 'No' ? 0 : (formData.attend === 1 || formData.attend === '1' || formData.attend === true ? 1 : 0)),
    attend_date: formData.attendDate || formData.attendedDate || null,
    // Keep backward compatibility
    attended: formData.attend === 'Yes' || formData.attended === true || formData.attend === 1 || formData.attend === '1',
    attended_date: formData.attendDate || formData.attendedDate || null,
  };
};
