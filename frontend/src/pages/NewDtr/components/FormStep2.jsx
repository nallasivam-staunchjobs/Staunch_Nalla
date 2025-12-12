import { CustomDropdown, CustomMultiSelect } from '../../../components/UIComponents';
import { saveFormProgress } from '../utils/localStorage'
import toast from 'react-hot-toast'
import { useState, useEffect } from 'react';
import { useAppContext, useAppActions } from '../../../context/AppContext'
import ResumePreview from './ResumePreview'
import { useMasterData } from '../../../hooks/useMasterData';
import { API_URL } from '../../../api/config';

const FormStep2 = () => {
  const { state } = useAppContext()
  const actions = useAppActions()
  const { formData, resumeFile, resumePreview, currentStep } = state
  const { masterData, loading: masterLoading, error: masterError } = useMasterData();
  const [formattedCurrentCtc, setFormattedCurrentCtc] = useState('');
  const [formattedExpectedCtc, setFormattedExpectedCtc] = useState('');
  const [dateErrors, setDateErrors] = useState({});
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [designations, setDesignations] = useState([]);
  const [loadingDesignations, setLoadingDesignations] = useState(false);

  // NFD Allocation Function - Automatically sets Next Follow-up Date based on remark
  const allocateNfd = (remark) => {
    if (!remark) return '';

    // Mapping of remarks to days (easy to edit later)
    const remarkToDaysMapping = {
      // 1 day
      'call later': 1,
      'nnr/nso': 1,
      'attend & fb': 1,
      'attend & fp': 1,
      'no show': 1,
      'next round': 1,

      // 2 days
      'interview fixed': 2,
      'interested': 2,
      'no show & reschedule': 2,
      'noshow & rescheduled': 2,
      'in process': 2,

      // 3 days
      'offer denied': 3,
      'profile validation': 3,
      'profile duplicate': 3,
      'think and get back': 3,

      // 15 days
      'selected': 15,
      'golden egg': 15,
      'position freeze': 15,
      'hold': 15,

      // 90 days
      'joined': 90,
      'not looking for job change': 90
    };

    // Normalize remark for case-insensitive matching
    const normalizedRemark = remark.toString().trim().toLowerCase();
    const daysToAdd = remarkToDaysMapping[normalizedRemark];

    if (!daysToAdd) {
      return '';
    }

    // Calculate the target date
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);

    // Ensure the date falls on a weekday (Mon-Fri)
    const getNextWeekday = (date) => {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      if (dayOfWeek === 0) { // Sunday
        date.setDate(date.getDate() + 1); // Move to Monday
      } else if (dayOfWeek === 6) { // Saturday
        date.setDate(date.getDate() + 2); // Move to Monday
      }

      return date;
    };

    const weekdayDate = getNextWeekday(targetDate);

    // Return in YYYY-MM-DD format
    return weekdayDate.toISOString().split('T')[0];
  };

  // Feedback Allocation Function - Automatically sets feedback based on remark
  const allocateFeedback = (remark) => {
    if (!remark) return '';

    // Mapping of remarks to feedback messages
    const remarkToFeedbackMapping = {
      // Communication related
      'call later': 'Candidate requested to call back later. Will follow up as scheduled.',
      'nnr/nso': 'No response from candidate. Phone not reachable or switched off.',
      'attend & fb': 'Candidate attended the call. Provided feedback and next steps discussed.',
      'attend & fp': 'Candidate attended the call. Provided feedback and next steps discussed.',
      'no show': 'Candidate did not show up for the scheduled call/interview.',
      'interested': 'Candidate showed interest in the position. Proceeding with next steps.',

      // Interview related
      'interview fixed': 'Interview has been scheduled with the client. Date and time confirmed.',
      'no show & reschedule': 'Candidate did not show up. Rescheduling the interview.',
      'noshow & rescheduled': 'Candidate missed the appointment. New schedule arranged.',
      'next round': 'Candidate cleared current round. Moving to next interview stage.',

      // Decision related
      'offer denied': 'Candidate declined the job offer. Reason documented for future reference.',
      'think and get back': 'Candidate needs time to consider the offer. Will respond shortly.',
      'profile validation': 'Validating candidate profile and credentials with client requirements.',
      'profile duplicate': 'Duplicate profile found in system. Consolidating information.',

      // Status related
      'selected': 'Candidate has been selected by the client. Offer process initiated.',
      'hold': 'Candidate is on hold. Follow-up after 15 days.',
      'joined': 'Candidate successfully joined the organization. Onboarding completed.',
      'golden egg': 'High-potential candidate identified. Priority follow-up required.',
      'position freeze': 'Client has temporarily frozen the position. Candidate on hold.',
      'not looking for job change': 'Candidate not actively seeking new opportunities currently.'
    };

    // Normalize remark for case-insensitive matching
    const normalizedRemark = remark.toString().trim().toLowerCase();
    const feedback = remarkToFeedbackMapping[normalizedRemark];

    if (!feedback) {
      return '';
    }

    return feedback;
  };

  // Fetch vendors from API
  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const response = await fetch(`${API_URL}/vendors/vendors/`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      } else {
        console.error('Failed to fetch vendors:', response.statusText);
        toast.error('Failed to load vendors');
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Error loading vendors');
    } finally {
      setLoadingVendors(false);
    }
  };

  // Fetch designations from masters/positions API
  const fetchDesignations = async () => {
    setLoadingDesignations(true);
    try {
      const response = await fetch(`${API_URL}/masters/positions/`);
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 Fetched positions from masters:', data);
        
        // Transform the data to dropdown format
        const formattedDesignations = data
          .filter(item => !item.status || item.status === 'Active') // Only active positions
          .map(item => ({
            value: item.name || item.position_name || item.title,
            label: item.name || item.position_name || item.title
          }));
        
        setDesignations(formattedDesignations);
      } else {
        console.error('Failed to fetch positions:', response.statusText);
        toast.error('Failed to load positions');
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Error loading positions');
    } finally {
      setLoadingDesignations(false);
    }
  };

  // Fetch vendors and designations on component mount
  useEffect(() => {
    fetchVendors();
    fetchDesignations();
  }, []);

  // Convert master data to dropdown formatx
  const industryOptions = masterData.industries.map(industry => ({
    value: industry.name,
    label: industry.name
  }));

  // designationOptions now comes from dynamic API fetch (designations state)

  // Define restricted remarks that should be hidden
  const restrictedRemarks = [
    'Selected', 'Rejected', 'IN process',
    'Next Round', 'Feedback Pending', 'No Show'
  ];

  // Filter out restricted remarks from the options
  const remarkOptions = masterData.remarks
    .filter(remark => !restrictedRemarks.includes(remark.name))
    .map(remark => ({
      value: remark.name,
      label: remark.name
    }));

  // Convert vendors to dropdown options
  const vendorOptions = vendors.map(vendor => ({
    value: vendor.name || vendor.vendor_name || vendor.id,
    label: vendor.name || vendor.vendor_name || `Vendor ${vendor.id}`
  }));


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const fieldValue = type === "checkbox" ? checked : value

    // Auto-set submission date to today when "Yes" is selected
    if (name === "profileSubmission" && value === "Yes") {
      const today = new Date().toISOString().split('T')[0]
      actions.updateFormField("submissionDate", today)
    }

    // Handle date fields - store in YYYY-MM-DD format (backend expected format)
    if (['nextFollowUpDate', 'interviewFixedDate', 'expectedJoiningDate'].includes(name)) {
      // Clear any existing error for this field
      setDateErrors(prev => ({ ...prev, [name]: null }));


      // Store the date directly in YYYY-MM-DD format (no conversion needed)
      actions.updateFormField(name, value);
      return;
    }

    actions.updateFormField(name, fieldValue)
  }

  const formatIndianNumber = (num) => {
    if (!num) return '';
    const x = num.toString().replace(/\D/g, '');
    let lastThree = x.slice(-3);
    let rest = x.slice(0, -3);
    if (rest !== '') {
      lastThree = ',' + lastThree;
    }
    const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    return formatted;
  };

  useEffect(() => {
    setFormattedCurrentCtc(formatIndianNumber(formData.currentCtc));
    setFormattedExpectedCtc(formatIndianNumber(formData.expectedCtc));
  }, [formData.currentCtc, formData.expectedCtc]);

  const nextStep = () => {
    const newStep = currentStep + 1
    actions.addCompletedStep(currentStep)
    actions.setCurrentStep(newStep)
    saveFormProgress(newStep, formData, resumeFile, resumePreview)
    // toast.success(`Step ${currentStep} completed and saved!`)
  }

  const prevStep = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1
      actions.setCurrentStep(newStep)
      saveFormProgress(newStep, formData, resumeFile, resumePreview)
    }
  }


  // Get date fields to show based on selected remark
  const getDateFieldsForRemark = (remarkName) => {

    // Use case-insensitive matching and trim whitespace
    const normalizedRemark = remarkName ? remarkName.toString().trim().toLowerCase() : '';

    // Show NFD for all remarks
    const showNextFollowUp = true;

    const interviewDateRemarks = ['interview fixed', 'noshow & rescheduled'];
    const joiningDateRemarks = ['selected'];

    const showInterviewDate = interviewDateRemarks.includes(normalizedRemark);
    const showJoiningDate = joiningDateRemarks.includes(normalizedRemark);

    return { showNextFollowUp, showInterviewDate, showJoiningDate };
  };



  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1  gap-3">
        {/* Left Side - Professional Details */}
        <div className="bg-white rounded-lg overflow-hidden flex flex-col">
          <div className="border-b border-gray-200 p-3">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6z"
                />
              </svg>
              Client Information

            </h4>
          </div>
          <div className="flex-1 p-2 space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Client Name</label>
                <CustomDropdown
                  value={formData.clientName}
                  onChange={(selected) => {
                    actions.updateFormField('clientName', selected ? selected.value : '');
                  }}
                  options={vendorOptions}
                  placeholder={loadingVendors ? "Loading vendors..." : "Select Vendor"}
                  isSearchable={true}
                  isClearable={true}
                  isDisabled={loadingVendors}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Designation</label>
                <CustomDropdown
                  value={formData.designation}
                  onChange={(selected) => {
                    actions.updateFormField('designation', selected ? selected.value : '');
                  }}
                  options={designations}
                  placeholder={loadingDesignations ? "Loading designations..." : "Select Designation"}
                  isDisabled={loadingDesignations}
                  noOptionsMessage={loadingDesignations ? "Loading designations..." : "No designations found"}
                  isSearchable={true}
                  isClearable={true}
                />
                {loadingDesignations && (
                  <p className="mt-1 text-xs text-blue-500">Loading designations from database...</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Industry</label>
                <CustomMultiSelect
                  value={formData.industry || []}
                  onChange={(selected) => {
                    const values = selected ? selected.map((option) => option.value) : [];
                    actions.updateFormField("industry", values);
                  }}
                  options={industryOptions}
                  placeholder="Select industries..."
                  isDisabled={masterLoading}
                  noOptionsMessage={masterLoading ? "Loading industries..." : "No industries found"}
                  isSearchable={true}
                  error={masterError}
                />
                {masterError && (
                  <p className="mt-1 text-xs text-red-500">Error loading industries</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Current CTC (in LPA)</label>
                <input
                  type="text"
                  name="currentCtc"
                  value={formattedCurrentCtc}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '');
                    if (!isNaN(raw)) {
                      actions.updateFormField('currentCtc', raw);
                    }
                  }}
                  className="w-full px-2 py-1 text-xs font-light border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter in ₹ (e.g. 1250000)"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Expected CTC (in LPA)</label>
                <input
                  type="text"
                  name="expectedCtc"
                  value={formattedExpectedCtc}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '');
                    if (!isNaN(raw)) {
                      actions.updateFormField('expectedCtc', raw);
                    }
                  }}
                  className="w-full px-2 py-1 text-xs font-light border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter in ₹ (e.g. 1500000)"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
                <CustomDropdown
                  value={formData.remarks}
                  onChange={(selected) => {
                    const remarkValue = selected ? selected.value : '';
                    actions.updateFormField('remarks', remarkValue);

                    // Clear date fields when remark changes
                    if (remarkValue !== formData.remarks) {
                      actions.updateFormField('nextFollowUpDate', '');
                      actions.updateFormField('interviewFixedDate', '');
                      actions.updateFormField('expectedJoiningDate', '');
                      setDateErrors({});

                      // Auto-calculate and set NFD and Feedback based on the selected remark
                      if (remarkValue) {
                        const autoNfd = allocateNfd(remarkValue);
                        const autoFeedback = allocateFeedback(remarkValue);

                        if (autoNfd) {
                          actions.updateFormField('nextFollowUpDate', autoNfd);
                        }

                        if (autoFeedback) {
                          actions.updateFormField('feedback', autoFeedback);
                        }

                        // Auto-fill completed silently
                      }
                    }
                  }}
                  options={remarkOptions}
                  placeholder="Select Remarks"
                  isDisabled={masterLoading}
                  noOptionsMessage={masterLoading ? "Loading remarks..." : "No remarks found"}
                  isSearchable={true}
                  isClearable={true}
                  error={masterError}
                />
                {masterError && (
                  <p className="mt-1 text-xs text-red-500">Error loading remarks</p>
                )}
              </div>

              {/* Dynamic Date Fields Based on Selected Remark */}
              {formData.remarks && (() => {
                const { showNextFollowUp, showInterviewDate, showJoiningDate } = getDateFieldsForRemark(formData.remarks);

                return (
                  <>
                    {showNextFollowUp && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Next Follow-up Date
                        </label>
                        <input
                          type="date"
                          name="nextFollowUpDate"
                          value={formData.nextFollowUpDate || ''}
                          onChange={handleInputChange}
                          onClick={(e) => e.target.showPicker && e.target.showPicker()}
                          className={`w-full px-2 py-1 text-xs font-light border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${dateErrors.nextFollowUpDate ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {dateErrors.nextFollowUpDate && (
                          <p className="mt-1 text-xs text-red-500">{dateErrors.nextFollowUpDate}</p>
                        )}
                      </div>
                    )}

                    {showInterviewDate && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Interview Fixed Date
                        </label>
                        <input
                          type="date"
                          name="interviewFixedDate"
                          value={formData.interviewFixedDate || ''}
                          onChange={handleInputChange}
                          onClick={(e) => e.target.showPicker && e.target.showPicker()}
                          className={`w-full px-2 py-1 text-xs font-light border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${dateErrors.interviewFixedDate ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {dateErrors.interviewFixedDate && (
                          <p className="mt-1 text-xs text-red-500">{dateErrors.interviewFixedDate}</p>
                        )}
                      </div>
                    )}

                    {showJoiningDate && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Expected Joining Date
                        </label>
                        <input
                          type="date"
                          name="expectedJoiningDate"
                          value={formData.expectedJoiningDate || ''}
                          onChange={handleInputChange}
                          onClick={(e) => e.target.showPicker && e.target.showPicker()}
                          className={`w-full px-2 py-1 text-xs font-light border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${dateErrors.expectedJoiningDate ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {dateErrors.expectedJoiningDate && (
                          <p className="mt-1 text-xs text-red-500">{dateErrors.expectedJoiningDate}</p>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="grid md:grid-cols-3 gap-4 items-end">
            
              {/* Profile Submission */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Profile Submission</label>
                <div className="flex items-center space-x-6">
                  <label className="inline-flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="radio"
                        name="profileSubmission"
                        value="Yes"
                        checked={formData.profileSubmission === "Yes"}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.profileSubmission === "Yes"
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}>
                        {formData.profileSubmission === "Yes" && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    <span className={`ml-2 text-sm font-medium ${formData.profileSubmission === "Yes" ? 'text-blue-600' : 'text-gray-700'
                      }`}>Yes</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="radio"
                        name="profileSubmission"
                        value="No"
                        checked={formData.profileSubmission === "No"}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.profileSubmission === "No"
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}>
                        {formData.profileSubmission === "No" && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    <span className={`ml-2 text-sm font-medium ${formData.profileSubmission === "No" ? 'text-blue-600' : 'text-gray-700'
                      }`}>No</span>
                  </label>
                </div>
              </div>

              {/* Conditional Submission Date */}
              {formData.profileSubmission === "Yes" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Submission Date</label>
                  <input
                    type="date"
                    name="submissionDate"
                    value={formData.submissionDate}
                    onChange={handleInputChange}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-2 py-1 text-xs font-light border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>


            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Feedback</label>
              <textarea
                name="feedback"
                value={formData.feedback}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="border-t border-gray-200 p-2 flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                // Check for date validation errors before proceeding
                const hasDateErrors = Object.values(dateErrors).some(error => error !== null);
                if (hasDateErrors) {
                  toast.error('Please fix date validation errors before proceeding');
                  return;
                }
                nextStep();
              }}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* Right Side - Resume Preview */}

      </div>
    </div>
  )
}

export default FormStep2