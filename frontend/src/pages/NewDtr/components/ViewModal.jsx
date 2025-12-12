import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { triggerCalendarRefresh } from '../../../Redux/calendarSlice';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import { BASE_URL, API_URL } from '../../../api/config';
import { clientJobs as clientJobsAPI } from '../../../api/api';
import {
  getDisplayExecutiveName,
  fetchEmployeeName,
  mapClientJobToFormData
} from '../utils';
import { StatusHistoryService } from '../services/statusHistoryService';
import { formatCurrency } from '../utils/commonUtils';

// Utility functions now imported from shared utils
import {
  Pencil,
  SquareArrowOutUpRight,
  UploadIcon,
  X,
  Clock,
  Eye,
  Download,
  FileText,
  PhoneOff,
  Search,
  Phone,
} from 'lucide-react';
import { twMerge } from "tailwind-merge";
import { useAppContext, useAppActions } from '../../../context/AppContext';
import { CustomDropdown, CustomMultiSelect } from '../../../components/UIComponents';
import { useApi } from '../hooks/useApi';
import { useMasterData } from '../../../hooks/useMasterData';
import { useLocationDropdowns } from '../../../hooks/useLocationDropdowns';
import CandidateScoreDisplay from './CandidateScoreDisplay';
import { nfdStatusService, previousCompanyService, jobOpeningService } from '../services/api';
import JobAssignmentModal from '../JobAssignment/JobAssignment';
import FeedbackModal from './FeedbackModal';
import { calculateNextFollowUpDate } from '../utils/dateUtils';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

// Reusable component for detail items
const DetailItem = ({ label, value }) => (
  <div className='flex items-center gap-0.5'>
    <span className="text-xs font-normal text-gray-500">{label} :</span>

    <span className="text-xs font-semibold text-gray-800 mt-0.5">{value}</span>
  </div>
);

// Tag-based display component for skills and languages
const TagItem = ({ label, items, type = 'skills' }) => {
  const colorClasses = {
    skills: 'bg-green-100 text-green-800',
    languages: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className=''>
      <p className="text-xs font-normal text-gray-500 mb-1">{label} :</p>
      <div className="flex flex-wrap gap-1">
        {Array.isArray(items) && items.length > 0 ? (
          items.map((item, index) => (
            <span
              key={`${type}-${index}`}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[type]}`}
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-500">-</span>
        )}
      </div>
    </div>
  );
};

// Reusable component for status items
const StatusItem = ({
  label,
  value,
  isEditMode,
  onChange,
  type = "text",
  options = [],
  formatDateToDDMMYYYY,
  fullWidth = false,
  isFieldEditable = false,
  onToggleEdit = () => { },
  isSubmitting = false
}) => {
  // Determine if this is a future date field
  const isFutureDateField = label === "Interview Date" || label === "Expected Joining Date";

  // Check if the field should be in edit mode
  const shouldShowEdit = isEditMode || isFieldEditable;
  // Check if the field is empty or has a default value that should be editable
  const isDefaultValue = !value || value === "NA" || value === "Not Specified" || value === "Not specified";

  // Determine if we should show the edit control
  const showEditControl = (label === "Client" || label === "Designation") && isEditMode && !isFieldEditable && isDefaultValue;

  return (
    <div className={`${fullWidth ? "w-full" : ""} relative`}>
      {shouldShowEdit ? (
        // Edit Mode → Label above input (matching Basic Information style)
        <div>
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            {(label === "Client" || label === "Designation") && (
              <button
                type="button"
                onClick={() => onToggleEdit(false)}
                className="text-xs text-blue-600 hover:text-blue-800"
                disabled={isSubmitting}
              >
                Done
              </button>
            )}
          </div>
          {type === "select" ? (
            <select
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              autoFocus={isFieldEditable}
            >
              <option value="">Select {label}</option>
              {options.map((opt, idx) => (
                <option key={idx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : type === "date" ? (
            <input
              type="date"
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
              value={value && value.match(/^\d{4}-\d{2}-\d{2}$/) ? value : (value ? new Date(value + 'T00:00:00').toISOString().split("T")[0] : "")}
              min={isFutureDateField ? new Date().toISOString().split('T')[0] : undefined}
              max={!isFutureDateField ? new Date().toISOString().split('T')[0] : undefined}
              onChange={(e) => onChange(e.target.value)}
              onClick={(e) => e.target.showPicker && e.target.showPicker()}
            />
          ) : type === "textarea" ? (
            <textarea
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
              rows={3}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <input
              type="text"
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              autoFocus={isFieldEditable}
            />
          )}
        </div>
      ) : (
        // View Mode → Label: Value inline (matching DetailItem style)
        <div className='flex items-center gap-0.5 group'>
          <span className="text-xs font-normal text-gray-500">{label} :</span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-gray-800 mt-0.5">
              {(() => {
                let displayValue;
                if (type === "date" && value) {
                  displayValue = formatDateToDDMMYYYY(value);
                } else {
                  displayValue = value || "Not specified";
                }

                // Special handling for NFD field with "(open profile)" indicator
                if (label === "NFD" && displayValue && displayValue.includes("(open profile)")) {
                  const parts = displayValue.split("(open profile)");
                  return (
                    <span className="text-red-600 font-semibold">
                      {parts[0]}
                      <span className="bg-red-100 text-red-800 px-1 py-0.5 rounded text-xs font-medium">
                        (open profile)
                      </span>
                      {parts[1]}
                    </span>
                  );
                }

                return displayValue;
              })()}
            </span>
            {showEditControl && (
              <button
                onClick={() => onToggleEdit(true)}
                className="text-gray-400 hover:text-blue-600 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


const CandidateDetailsModal = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  candidate: propCandidate,
  clientJob: propClientJob
} = {}) => {
  const { state } = useAppContext();
  const actions = useAppActions();
  const dispatch = useDispatch();
  const searchResults = state.searchResults;

  // Use props if provided, otherwise fall back to context
  const isViewModalOpen = propIsOpen !== undefined ? propIsOpen : state.isViewModalOpen;
  const selectedCandidate = propCandidate || state.selectedCandidate;
  const closeModal = propOnClose || actions.closeViewModal;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { candidates, clientJobs, educationCertificates, experienceCompanies, additionalInfo } = useApi();

  const [isWaOpen, setIsWaOpen] = useState(false);
  const [waMenuPos, setWaMenuPos] = useState({ x: 0, y: 0 });

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // Your save logic here
      // For example:
      // await saveData(formData);
      toast.success('Changes saved successfully');
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSubmitting(false);
    }
  };
  const { masterData } = useMasterData();
  const {
    locationData,
    loading: locationLoading,
    error: locationError,
    getCitiesByState,
    getStatesByCountry
  } = useLocationDropdowns();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isBasicInfoEditMode, setIsBasicInfoEditMode] = useState(false);
  const [isHeaderInfoEditMode, setIsHeaderInfoEditMode] = useState(false);
  const [scoringDataUpdates, setScoringDataUpdates] = useState({});

  const safeSearchResults = Array.isArray(state.searchResults) ? state.searchResults : [];
  const getJoinedOrSelectedMobileNumbers = (results) => {
    const s = new Set();
    if (!Array.isArray(results)) return s;
    results.forEach(c => {
      const profileStatus = c?.selectedClientJob?.profilestatus;
      const m1 = c?.contactNumber1 || c?.phone;
      const m2 = c?.contactNumber2 || c?.mobile2;
      if (profileStatus === 'Joined' || profileStatus === 'Selected') {
        if (m1 && m1 !== '-' && typeof m1 === 'string' && m1.toLowerCase() !== 'null' && m1.toLowerCase() !== 'nil' && m1.trim() !== '') s.add(m1);
        if (m2 && m2 !== '-' && typeof m2 === 'string' && m2.toLowerCase() !== 'null' && m2.toLowerCase() !== 'nil' && m2.trim() !== '') s.add(m2);
      }
    });
    return s;
  };
  const getGlobalJoiningDates = (results) => {
    const m = new Map();
    if (!Array.isArray(results)) return m;
    results.forEach(c => {
      const join = c?.candidaterevenue?.[0]?.joining_date || c?.backendData?.candidaterevenue?.[0]?.joining_date || c?.originalCandidate?.candidaterevenue?.[0]?.joining_date;
      const push = (num) => {
        if (!num) return;
        if (!m.has(num)) m.set(num, []);
        if (join && join !== '0000-00-00') m.get(num).push(join);
      };
      push(c?.contactNumber1 || c?.phone);
      push(c?.contactNumber2 || c?.mobile2);
    });
    return m;
  };
  const joinedMobiles = getJoinedOrSelectedMobileNumbers(safeSearchResults);
  const globalJoiningDates = getGlobalJoiningDates(safeSearchResults);

  useEffect(() => {
    if (isWaOpen) {
      const onDocClick = () => setIsWaOpen(false);
      document.addEventListener('click', onDocClick);
      return () => document.removeEventListener('click', onDocClick);
    }
  }, [isWaOpen]);

  // Get current user from Redux for permission checking
  const currentUser = useSelector((state) => state.auth);

  // Permission check: Only allow original creator to edit client job details
  const canEditClientJob = () => {
    if (!detailedCandidate || !currentUser) return false;

    // Compare current user's employeeCode with candidate's executive_name
    const candidateCreator = detailedCandidate.executive_name;
    const currentUserCode = currentUser.employeeCode || currentUser.username;

    return candidateCreator === currentUserCode;
  };

  // Check if this is from job assignment context
  const isJobAssignmentContext = selectedCandidate?.isJobAssignmentContext || false;
  const [activeMobileTab, setActiveMobileTab] = useState("profile");
  const [uploadedFile, setUploadedFile] = useState(null);

  // Auto-update expired NFD jobs function
  const autoUpdateExpiredNfd = async () => {
    try {
      const result = await nfdStatusService.autoUpdateExpiredNfd();
      if (result) {
        // Show a subtle notification if jobs were updated

      }
      return result;
    } catch (error) {
      console.error('❌ ViewModal: Error auto-updating expired NFD jobs:', error);
      // Don't show error toast to avoid disrupting user experience
      return false;
    }
  };
  const [pdfUrl, setPdfUrl] = useState(null);

  // Feedback Modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [showFeedbackError, setShowFeedbackError] = useState(false);
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState(null);

  // Phone masking utility functions (ported from SearchView)
  const maskPhoneNumber = (number) => {
    if (!number || number.length !== 10) return number;

    // Pattern: 9xxx6x3xx7 (show digits at indexes 0, 4, 6, 9)
    // Example: "9876563127" becomes "9xxx6x3xx7"
    const digits = number.split('');
    return `${digits[0]}xxx${digits[4]}x${digits[6]}xx${digits[9]}`;
  };

  // Function to determine if mobile should be masked based on joining date
  const shouldMaskMobile = (candidaterevenue) => {
    if (!candidaterevenue || candidaterevenue.length === 0) {
      return false; // No joining date, don't mask
    }

    const joiningDate = candidaterevenue[0]?.joining_date;
    if (!joiningDate || joiningDate === "0000-00-00") {
      return false; // Invalid joining date, don't mask
    }

    try {
      const joinDate = new Date(joiningDate);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate - joinDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Mask if less than 100 days since joining
      return diffDays < 100;
    } catch (error) {
      console.error('Error calculating days since joining:', error);
      return false; // On error, don't mask
    }
  };

  // Check if any joining date for this mobile number is > 100 days old
  const hasValidOldJoiningDate = (mobileNumber, globalJoiningDates) => {
    const joiningDates = globalJoiningDates.get(mobileNumber);
    if (!joiningDates || joiningDates.length === 0) {
      return false;
    }

    const currentDate = new Date();
    return joiningDates.some(joiningDate => {
      if (!joiningDate || joiningDate === "0000-00-00") return false;

      try {
        const joinDate = new Date(joiningDate);
        const diffTime = Math.abs(currentDate - joinDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 100;
      } catch (error) {
        console.error('Error checking joining date:', error);
        return false;
      }
    });
  };

  // Main function to get display mobile number (global 100-day rule overrides cross-vendor)
  const getDisplayMobileNumber = (phoneNumber, joinedMobiles, candidaterevenue, globalJoiningDates) => {
    if (!phoneNumber) return phoneNumber;

    // RULE 1: Individual 100-day rule - Check if less than 100 days since joining for this candidate
    const shouldMaskByDate = shouldMaskMobile(candidaterevenue);

    // RULE 2: Global 100-day rule - Check if ANY joining date for this mobile number is > 100 days old
    const hasGlobalOldJoiningDate = hasValidOldJoiningDate(phoneNumber, globalJoiningDates);

    // RULE 3: Cross-vendor rule - Check if this mobile number is taken (joined/selected) anywhere
    const isTakenGlobally = isMobileNumberTaken(phoneNumber, joinedMobiles);

    // PRIORITY LOGIC: Global 100-day rule overrides everything
    let shouldMask;
    let maskingReason;

    if (hasGlobalOldJoiningDate) {
      // ANY joining date for this mobile is > 100 days - show full number (highest priority)
      shouldMask = false;
      maskingReason = "global 100+ days rule - show full number";
    } else if (shouldMaskByDate) {
      // Individual candidate < 100 days since joining - mask
      shouldMask = true;
      maskingReason = "< 100 days since joining (individual)";
    } else if (isTakenGlobally) {
      // No valid old joining date but taken globally - mask
      shouldMask = true;
      maskingReason = "taken globally (joined/selected)";
    } else {
      // Free number - show full number
      shouldMask = false;
      maskingReason = "free number";
    }



    if (shouldMask) {
      return maskPhoneNumber(phoneNumber);
    }

    // Show full number
    return phoneNumber;
  };

  const isMobileNumberTaken = (mobileNumber, joinedMobiles) => {
    if (!mobileNumber || !joinedMobiles) return false;
    return joinedMobiles.has(mobileNumber);
  };

  // Function to get color for remarks based on profilestatus
  const getRemarkColorClass = (remarks, remarkSource) => {
    const normalizedRemarks = (remarks || '').toLowerCase();

    // Only apply special colors if remark comes from profilestatus
    if (remarkSource === 'profilestatus') {
      if (normalizedRemarks === 'joined') return 'text-green-600 hover:text-green-800';
      if (normalizedRemarks === 'abscond') return 'text-red-600 hover:text-red-800';
    }

    // Default blue for all other cases (remarks field or no special status)
    return 'text-blue-600 hover:text-blue-800';
  };

  // Function to get color class for candidate name based on profilestatus
  const getCandidateNameColorClass = (candidate) => {
    // Try to get profilestatus from different sources
    let profileStatus = null;
    let source = 'none';

    // Method 1: From selectedCandidate.selectedClientJob (SearchView structure)
    if (candidate?.selectedClientJob?.profilestatus) {
      profileStatus = candidate.selectedClientJob.profilestatus;
      source = 'selectedClientJob';
    }
    // Method 2: From relatedData.clients (ViewModal structure)
    else if (selectedCandidate?.clientJobId && relatedData?.clients) {
      const currentClientJob = relatedData.clients.find(job => job.id === selectedCandidate.clientJobId);
      if (currentClientJob?.profilestatus) {
        profileStatus = currentClientJob.profilestatus;
        source = 'relatedData.clients.current';
      }
    }
    // Method 3: Fallback to first client job
    else if (relatedData?.clients?.length > 0) {
      const firstClientJob = relatedData.clients[0];
      if (firstClientJob?.profilestatus) {
        profileStatus = firstClientJob.profilestatus;
        source = 'relatedData.clients.first';
      }
    }

    const normalizedStatus = (profileStatus || '').toLowerCase();

    // Debug logging


    // Apply colors based on profilestatus
    if (normalizedStatus === 'joined') return 'text-green-600 hover:text-green-800';
    if (normalizedStatus === 'abscond') return 'text-red-600 hover:text-red-800';
    if (normalizedStatus === 'selected') return 'text-orange-600 hover:text-orange-800';

    // Default color for other statuses
    return 'text-gray-900 hover:text-blue-600';
  };

  // Function to get hover title for phone numbers (exactly mirrors SearchView behavior)
  const getPhoneHoverTitle = (phoneNumber, candidate, isMasked, joinedMobiles, globalJoiningDates) => {
    if (!phoneNumber) return "No phone number available";

    let hoverTitle = 'Phone number';
    let profileStatus = candidate?.selectedClientJob?.profilestatus;
    const candidaterevenue = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
    let joiningDate = candidaterevenue?.[0]?.joining_date;
    const displayName = candidate?.candidateName || candidate?.name || 'Candidate';
    let clientName = candidate?.clientJob?.clientName || candidate?.selectedClientJob?.clientName || 'Unknown Client';

    // Derive profilestatus and clientName similar to SearchView when missing
    if (!profileStatus) {
      if (selectedCandidate?.clientJobId && Array.isArray(relatedData?.clients)) {
        const currentJob = relatedData.clients.find(j => j.id === selectedCandidate.clientJobId);
        if (currentJob) {
          profileStatus = currentJob.profilestatus || profileStatus;
          clientName = currentJob.client_name || currentJob.clientName || clientName;
        }
      } else if (Array.isArray(relatedData?.clients) && relatedData.clients.length > 0) {
        const firstJob = relatedData.clients[0];
        profileStatus = firstJob?.profilestatus || profileStatus;
        clientName = firstJob?.client_name || firstJob?.clientName || clientName;
      }
    }

    const isTakenGlobally = isMobileNumberTaken(phoneNumber, joinedMobiles);
    const safeResults = Array.isArray(safeSearchResults) ? safeSearchResults : [];
    const hasAbscondGlobally = safeResults.some(c =>
      (c.contactNumber1 === phoneNumber || c.contactNumber2 === phoneNumber) &&
      c.selectedClientJob?.profilestatus === 'Abscond'
    );

    const isAbscond = profileStatus === 'Abscond';
    if (isMasked || isAbscond || isTakenGlobally || hasAbscondGlobally) {
      if (profileStatus === 'Joined' && joiningDate && joiningDate !== '0000-00-00') {
        const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
        hoverTitle = isMasked
          ? `${displayName} joined on ${formattedDate} in ${clientName}, Don't contact them`
          : `${displayName} joined on ${formattedDate} in ${clientName}`;
      } else if (profileStatus === 'Abscond' && joiningDate && joiningDate !== '0000-00-00') {
        const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
        hoverTitle = `${displayName} joined on ${formattedDate} in ${clientName} but absconded`;
      } else if (profileStatus === 'Selected') {
        hoverTitle = `${displayName} is selected in ${clientName}, Don't contact them`;
      } else if (isTakenGlobally || hasAbscondGlobally) {
        const joinedCandidate = safeResults.find(c =>
          (c.contactNumber1 === phoneNumber || c.contactNumber2 === phoneNumber) &&
          c.selectedClientJob?.profilestatus === 'Joined'
        );
        const abscondCandidate = safeResults.find(c =>
          (c.contactNumber1 === phoneNumber || c.contactNumber2 === phoneNumber) &&
          c.selectedClientJob?.profilestatus === 'Abscond'
        );

        if (joinedCandidate) {
          const joinedCandidateRevenue = joinedCandidate.candidaterevenue || joinedCandidate.backendData?.candidaterevenue || joinedCandidate.originalCandidate?.candidaterevenue;
          const joinedDate = joinedCandidateRevenue?.[0]?.joining_date;
          const joinedClientName = joinedCandidate.clientJob?.clientName || joinedCandidate.selectedClientJob?.clientName || 'Unknown Client';
          if (joinedDate && joinedDate !== '0000-00-00') {
            const formattedDate = new Date(joinedDate).toLocaleDateString('en-IN');
            hoverTitle = `${displayName} joined on ${formattedDate} in ${joinedClientName}, Don't contact them`;
          } else {
            hoverTitle = `${displayName} is joined/selected elsewhere, Don't contact them`;
          }
        } else if (abscondCandidate) {
          const abscondCandidateRevenue = abscondCandidate.candidaterevenue || abscondCandidate.backendData?.candidaterevenue || abscondCandidate.originalCandidate?.candidaterevenue;
          const abscondDate = abscondCandidateRevenue?.[0]?.joining_date;
          const abscondClientName = abscondCandidate.clientJob?.clientName || abscondCandidate.selectedClientJob?.clientName || 'Unknown Client';
          if (abscondDate && abscondDate !== '0000-00-00') {
            const formattedDate = new Date(abscondDate).toLocaleDateString('en-IN');
            hoverTitle = `${displayName} joined on ${formattedDate} in ${abscondClientName} but absconded`;
          } else {
            hoverTitle = `${displayName} absconded, Don't contact them`;
          }
        } else {
          hoverTitle = `${displayName} is joined/selected elsewhere, Don't contact them`;
        }
      }
    }

    // If none of the special cases applied and 100-day rule is satisfied globally, show info
    if (hoverTitle === 'Phone number') {
      const hasGlobalOld = hasValidOldJoiningDate(phoneNumber, globalJoiningDates);
      if (hasGlobalOld) {
        hoverTitle = '100 days completed — full number visible';
      }
    }

    return hoverTitle;
  };

  // Handler to open FeedbackModal when candidate name is clicked
  const handleCandidateNameClick = () => {
    // Enhanced candidate data for FeedbackModal - especially for DataBank candidates
    const candidateForFeedback = {
      ...selectedCandidate,

      // Core identification
      candidateId: selectedCandidate?.candidateId || selectedCandidate?.id,
      id: selectedCandidate?.candidateId || selectedCandidate?.id,
      name: candidate?.name || candidate?.candidateName || selectedCandidate?.name || selectedCandidate?.candidateName,
      candidateName: candidate?.name || candidate?.candidateName || selectedCandidate?.name || selectedCandidate?.candidateName,

      // Contact information
      phone: detailedCandidate?.mobile1 || selectedCandidate?.mobile1 || selectedCandidate?.phone || 'Not Available',
      mobile1: detailedCandidate?.mobile1 || selectedCandidate?.mobile1 || selectedCandidate?.phone || 'Not Available',
      contactNumber1: detailedCandidate?.mobile1 || selectedCandidate?.mobile1 || selectedCandidate?.phone || 'Not Available', // FeedbackModal expects this field
      email: detailedCandidate?.email || selectedCandidate?.email || 'Not Available',

      // Location and profile
      city: detailedCandidate?.city || selectedCandidate?.city || selectedCandidate?.location || 'Not Available',
      location: detailedCandidate?.city || selectedCandidate?.city || selectedCandidate?.location || 'Not Available',
      profileNumber: detailedCandidate?.profile_number || selectedCandidate?.profile_number || selectedCandidate?.profileNumber,
      profile_number: detailedCandidate?.profile_number || selectedCandidate?.profile_number || selectedCandidate?.profileNumber,

      // Executive information
      executiveName: detailedCandidate?.executive_name || selectedCandidate?.executive_name || selectedCandidate?.executiveName,
      executive_name: detailedCandidate?.executive_name || selectedCandidate?.executive_name || selectedCandidate?.executiveName,

      // Client job context - CRITICAL for proper feedback filtering
      clientJobId: selectedCandidate?.clientJobId || selectedCandidate?.selectedClientJob?.id,
      selectedClientJob: selectedCandidate?.selectedClientJob,
      clientName: selectedCandidate?.clientName || selectedCandidate?.selectedClientJob?.client_name,

      // Backend data structure that FeedbackModal expects
      backendData: detailedCandidate || selectedCandidate || {
        id: selectedCandidate?.candidateId || selectedCandidate?.id,
        candidate_name: candidate?.name || candidate?.candidateName || selectedCandidate?.name,
        executive_name: detailedCandidate?.executive_name || selectedCandidate?.executive_name || selectedCandidate?.executiveName,
        mobile1: detailedCandidate?.mobile1 || selectedCandidate?.mobile1 || selectedCandidate?.phone,
        email: detailedCandidate?.email || selectedCandidate?.email,
        city: detailedCandidate?.city || selectedCandidate?.city || selectedCandidate?.location
      },

      // DataBank specific fields
      isFromDataBank: selectedCandidate?.isFromDataBank || false,
      _source: selectedCandidate?._source || 'ViewModal',
      _forceRefresh: Date.now()
    };

    setSelectedCandidateForFeedback(candidateForFeedback);
    setIsFeedbackModalOpen(true);
  };

  const handleCloseFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
    setSelectedCandidateForFeedback(null);
  };
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [detailedCandidate, setDetailedCandidate] = useState(null);
  const [relatedData, setRelatedData] = useState({
    clients: [],
    education: [],
    experience: [],
    additionalInfo: [],
    previousCompanies: [],
    feedback: [],
    revenues: []
  });

  // Call statistics state - moved to component level
  const [callStats, setCallStats] = useState({ answered: 0, notAnswered: 0, totalCallsWithStatus: 0 });
  const [relevantFeedback, setRelevantFeedback] = useState("");
  const [jobOpenings, setJobOpenings] = useState([]);
  const [employeeNames, setEmployeeNames] = useState({});
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [isJobSearchOpen, setIsJobSearchOpen] = useState(false);

  // Client Job Modal State
  const [isClientJobModalOpen, setIsClientJobModalOpen] = useState(false);
  const [clientJobCallStatus, setClientJobCallStatus] = useState(''); // 'call answered' or 'call not answered'
  const [clientJobFormSubmitted, setClientJobFormSubmitted] = useState(false); // Track if form has been submitted

  // API dropdown data state
  const [vendorOptions, setVendorOptions] = useState([]);
  const [positionOptions, setPositionOptions] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [isDateFromBackend, setIsDateFromBackend] = useState(false);
  const [clientJobFormData, setClientJobFormData] = useState({
    clientName: '',
    designation: '',
    feedback: '',
    remarks: '',
    nfdDate: '',
    ejdDate: '',
    ifdDate: '',
    profileSubmission: 'No',
    profileSubmissionDate: '',
    currentCtc: '',
    expectedCtc: '',
    industry: '',
    callStatus: '',
    attend: 'No',
    attendDate: ''
  });

  // Reset modal data when modal opens
  useEffect(() => {
    if (isClientJobModalOpen && selectedCandidate?.clientJobId) {
      const clientJob = relatedData.clients?.find(job => job.id === selectedCandidate.clientJobId);
      if (clientJob) {
        console.log('Client Job Data:', {
          profile_submission: clientJob.profile_submission,
          profile_submission_date: clientJob.profile_submission_date,
          hasExistingSubmission: clientJob.profile_submission === true ||
            clientJob.profile_submission === 1 ||
            clientJob.profile_submission === "1" ||
            !!clientJob.profile_submission_date
        });

        const clientJobMappedData = mapClientJobToFormData(clientJob);
        const hasExistingSubmission = clientJob.profile_submission === true ||
          clientJob.profile_submission === 1 ||
          clientJob.profile_submission === "1" ||
          !!clientJob.profile_submission_date;

        console.log('Setting isDateFromBackend to:', hasExistingSubmission);

        setClientJobFormData(prev => ({
          ...prev,
          clientName: clientJobMappedData.clientName || "",
          designation: clientJobMappedData.designation || "",
          currentCtc: clientJobMappedData.currentCtc || "",
          expectedCtc: clientJobMappedData.expectedCtc || "",
          remarks: clientJobMappedData.remarks || "",
          nfdDate: clientJobMappedData.nextFollowUpDate || "",
          ejdDate: clientJobMappedData.expectedJoiningDate || "",
          ifdDate: clientJobMappedData.interviewFixedDate || "",
          profileSubmission: clientJobMappedData.profileSubmission || "No",
          profileSubmissionDate: clientJobMappedData.profileSubmissionDate || "",
          feedback: clientJobMappedData.feedback || "",
          attend: clientJobMappedData.attend === 1 || clientJobMappedData.attend === true || clientJobMappedData.attend === '1' || clientJobMappedData.attend === 'Yes' ? 'Yes' : 'No',
          attendDate: clientJobMappedData.attendDate || ""
        }));

        setIsDateFromBackend(hasExistingSubmission);
      }
    }
  }, [isClientJobModalOpen, selectedCandidate?.clientJobId, relatedData.clients]);

  // Fetch vendors from API (for Client Name dropdown)
  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const response = await fetch(`${API_URL}/vendors/vendors/`);
      if (response.ok) {
        const data = await response.json();
        const vendorOptions = data.map(vendor => ({
          value: vendor.name || vendor.vendor_name || vendor.id,
          label: vendor.name || vendor.vendor_name || `Vendor ${vendor.id}`
        }));
        setVendorOptions(vendorOptions);
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

  // Fetch positions from masters/positions API (used for both designations and employee positions)
  const fetchPositions = async () => {
    setLoadingPositions(true);
    try {
      const response = await fetch(`${API_URL}/masters/positions/`);
      if (response.ok) {
        const data = await response.json();
        const positionOptions = data
          .filter(item => !item.status || item.status === 'Active')
          .map(item => ({
            value: item.name || item.position_name || item.title,
            label: item.name || item.position_name || item.title
          }));

        // Set position options (used for both designation dropdown and professional section)
        setPositionOptions(positionOptions);
      } else {
        console.error('Failed to fetch positions from masters/positions:', response.statusText);
        toast.error('Failed to load positions');
      }
    } catch (error) {
      console.error('Error fetching positions from masters/positions:', error);
      toast.error('Error loading positions');
    } finally {
      setLoadingPositions(false);
    }
  };

  // Fetch API data when modal opens
  useEffect(() => {
    if (isClientJobModalOpen) {
      fetchVendors();
      fetchPositions(); // This will set position options for designation dropdown
    }
  }, [isClientJobModalOpen]);

  // Fetch positions when modal opens (for employee data)
  useEffect(() => {
    if (isViewModalOpen) {
      fetchPositions(); // This will set position options for professional section
    }
  }, [isViewModalOpen]);

  const [loadingJobs, setLoadingJobs] = useState(false);
  const [isJobAssignmentModalOpen, setIsJobAssignmentModalOpen] = useState(false);
  const [selectedJobAssignmentData, setSelectedJobAssignmentData] = useState(null);

  // Using shared fetchEmployeeName utility

  // NFD Allocation Function - From FormStep2
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

  // Feedback Allocation Function - From FormStep2
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
      'interview fixed': 'Interview has been scheduled with the candidate. Date and time confirmed.',
      'no show & reschedule': 'Candidate did not attend the scheduled interview. Rescheduling requested.',
      'noshow & rescheduled': 'Candidate did not attend the scheduled interview. Rescheduling requested.',
      'in process': 'Candidate is currently in the interview process. Awaiting further updates.',
      'next round': 'Candidate has progressed to the next round of interviews.',

      // Decision related
      'offer denied': 'Candidate has declined the job offer. Position remains open.',
      'profile validation': 'Candidate profile is under validation. Verification in progress.',
      'profile duplicate': 'Duplicate profile detected. Consolidating candidate information.',
      'think and get back': 'Candidate needs time to consider the opportunity. Will respond shortly.',

      // Success related
      'selected': 'Candidate has been selected for the position. Offer process initiated.',
      'golden egg': 'High-value candidate identified. Priority processing recommended.',
      'position freeze': 'Position has been temporarily frozen. Candidate on hold.',
      'hold': 'Candidate application is on hold. Awaiting further instructions.',

      // Final status
      'joined': 'Candidate has successfully joined the organization. Process completed.',
      'not looking for job change': 'Candidate is not currently seeking new opportunities. Future consideration possible.'
    };

    // Normalize remark for case-insensitive matching
    const normalizedRemark = remark.toString().trim().toLowerCase();
    return remarkToFeedbackMapping[normalizedRemark] || '';
  };

  // Handle remarks change with automatic NFD and feedback allocation (matching FormStep2)
  const handleRemarksChange = async (selectedRemark) => {
    // Clear/update fields when remark changes (matching FormStep2 behavior)
    if (selectedRemark !== clientJobFormData.remarks) {

      // Auto-calculate and set NFD and Feedback based on the selected remark
      if (selectedRemark) {
        const autoNfd = allocateNfd(selectedRemark);
        const autoFeedback = allocateFeedback(selectedRemark);

        // Get date field requirements for this remark (kept for future use / parity)
        const { showInterviewDate, showJoiningDate } = getDateFieldsForRemark(selectedRemark);

        // Only auto-set NFD, keep manual IFD and EJD entries
        setClientJobFormData(prev => ({
          ...prev,
          remarks: selectedRemark,
          nfdDate: autoNfd || '',
          // Keep existing ejdDate and ifdDate values - no auto-setting
          feedback: autoFeedback || ''
        }));
      } else {
        // Clear all fields if no remark selected
        setClientJobFormData(prev => ({
          ...prev,
          remarks: '',
          nfdDate: '',
          ejdDate: '',
          ifdDate: '',
          feedback: ''
        }));
      }
    }
  };

  // Handle Profile Submission change
  const handleProfileSubmissionChange = (value) => {
    const isNewSubmission = value === "Yes" && !clientJobFormData.profileSubmissionDate;

    setClientJobFormData(prev => ({
      ...prev,
      profileSubmission: value,
      // Only set today's date if this is a new submission
      profileSubmissionDate: value === "Yes"
        ? (prev.profileSubmissionDate || new Date().toISOString().split('T')[0])
        : ''
    }));

    // If this is a new submission, mark it as not from backend
    if (isNewSubmission) {
      setIsDateFromBackend(false);
    }
  };

  // Handle Attend change
  const handleAttendChange = (value) => {
    setClientJobFormData(prev => ({
      ...prev,
      attend: value,
      // Reset remarks when attend value changes
      remarks: '',
      // Only set today's date if this is a new submission
      attendDate: value === "Yes"
        ? (prev.attendDate || new Date().toISOString().split('T')[0])
        : ''
    }));
  };

  // Convert database profile submission values (1/0) to display values (Yes/No)
  const getProfileSubmissionDisplay = (dbValue) => {
    if (dbValue === true || dbValue === 1 || dbValue === "1") return "Yes";
    if (dbValue === false || dbValue === 0 || dbValue === "0") return "No";
    return dbValue; // Return as-is if already "Yes"/"No"
  };

  // Convert display values (Yes/No) to database values (1/0)
  const getProfileSubmissionDbValue = (displayValue) => {
    if (displayValue === "Yes") return 1;
    if (displayValue === "No") return 0;
    return displayValue;
  };

  // Get date fields to show based on selected remark (matching FormStep2)
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


  // Extract main feedback text from structured format
  const extractMainFeedback = (structuredFeedback) => {
    if (!structuredFeedback) return '';

    // Split by entry separator and get the latest entry
    const entries = structuredFeedback.split(';;;;;')
      .filter(entry => entry.trim())
      .map(entry => entry.replace(/^;+/, '')) // Remove leading semicolons
      .filter(entry => entry.trim()); // Filter again after cleanup
    if (entries.length === 0) return '';

    const latestEntry = entries[entries.length - 1];

    // Extract feedback text - handle periods in feedback text
    let feedbackMatch = latestEntry.match(/Feedback-(.+?)\.\s*:\s*NFD-/);
    if (!feedbackMatch) {
      // Try without period requirement
      feedbackMatch = latestEntry.match(/Feedback-(.+?):\s*NFD-/);
    }
    if (!feedbackMatch) {
      // Fallback pattern
      feedbackMatch = latestEntry.match(/Feedback-([^:]+)/);
    }
    if (feedbackMatch && feedbackMatch[1]) {
      let feedbackText = feedbackMatch[1].trim();
      // Handle cases where feedback starts with " -" (space dash)
      if (feedbackText.startsWith('- ')) {
        feedbackText = feedbackText.substring(2).trim();
      } else if (feedbackText.startsWith('-')) {
        feedbackText = feedbackText.substring(1).trim();
      }
      return feedbackText;
    }

    // Fallback: if no structured format found, return as is
    return structuredFeedback;
  };

  // Reset scoring data updates when modal opens/closes or candidate changes
  useEffect(() => {
    setScoringDataUpdates({});
  }, [isViewModalOpen, selectedCandidate?.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchDetailedData = async () => {
      if (isViewModalOpen && selectedCandidate && (selectedCandidate.candidateId || selectedCandidate.id)) {
        try {
          // Check if this is a DataBank candidate - skip API fetch and use provided data
          if (selectedCandidate.isFromDataBank) {
            // Use the selectedCandidate as detailedCandidate for DataBank entries
            setDetailedCandidate(selectedCandidate);

            // Set up related data structure for DataBank candidates
            setRelatedData({
              clients: selectedCandidate.client_jobs || [],
              education: selectedCandidate.education_certificates || [],
              experience: selectedCandidate.experience_companies || [],
              extra: selectedCandidate.additional_info || [],
              feedback: [],
              previousCompanies: selectedCandidate.previous_companies || []
            });

            // Reset resume-related state
            setPdfUrl(null);
            setUploadedFile(null);

            return; // Skip the API fetch for DataBank candidates
          }

          // Use candidateId if available (for multi-client rows), otherwise use id
          // For compound IDs like "35-44", extract the numeric candidate ID
          let candidateId = selectedCandidate.candidateId || selectedCandidate.id;

          // If it's a compound ID (contains hyphen), extract the candidate part
          if (typeof candidateId === 'string' && candidateId.includes('-')) {
            candidateId = candidateId.split('-')[0];
          }

          // Ensure it's a number for API calls
          candidateId = parseInt(candidateId, 10);

          // Add validation to check if candidateId is valid
          if (!candidateId || isNaN(candidateId)) {
            console.error('Invalid candidate ID:', candidateId, 'selectedCandidate:', selectedCandidate);
            return;
          }

          const candidateData = await candidates.getById(candidateId);

          if (!isMounted) return;

          // Handle case where candidate is not found
          if (!candidateData) {
            console.error(`Candidate ${candidateId} not found, closing modal`);
            actions.setIsViewModalOpen(false);
            return;
          }

          setDetailedCandidate(candidateData);

          // Initialize relatedData to prevent null reference
          setRelatedData({
            clients: [],
            education: [],
            experience: [],
            extra: [],
            feedback: [],
            previousCompanies: []
          });

          // Reset resume-related state first
          setPdfUrl(null);
          setUploadedFile(null);
          setUploadError(null);

          if (candidateData.resume_file) {
            let resumeUrl;
            if (candidateData.resume_file.startsWith(BASE_URL)) {
              resumeUrl = candidateData.resume_file;
            } else if (candidateData.resume_file.startsWith('/media/')) {
              resumeUrl = `${BASE_URL}${candidateData.resume_file}`;
            } else {
              resumeUrl = `${BASE_URL}/media/resumes/${candidateData.resume_file}`;
            }

            setPdfUrl(resumeUrl);
          }

          const [clientsData, educationData, experienceData, extraData, feedbackData, previousCompaniesData] = await Promise.all([
            clientJobs.getByCandidate(candidateId).catch(err => {
              return [];
            }),
            educationCertificates.getByCandidate(candidateId).catch(err => {
              return [];
            }),
            experienceCompanies.getByCandidate(candidateId).catch(err => {
              return [];
            }),
            additionalInfo.getByCandidate(candidateId).catch(err => {
              return [];
            }),
            // Get feedback entries from all client jobs for this candidate
            clientJobs.getByCandidate(candidateId).then(clientJobsData => {
              // Extract feedback from all client jobs
              const allFeedbackEntries = [];
              clientJobsData.forEach(job => {
                if (job.feedback) {
                  const entries = job.feedback.split(';;;;;')
                    .filter(entry => entry.trim())
                    .map(entry => entry.replace(/^;+/, '')) // Remove leading semicolons
                    .filter(entry => entry.trim()) // Filter again after cleanup
                    .map(entry => {
                      const parsed = {};

                      // Extract feedback text - handle periods in feedback text
                      let feedbackMatch = entry.match(/Feedback-(.+?)\.\s*:\s*NFD-/);
                      if (!feedbackMatch) {
                        // Try without period requirement
                        feedbackMatch = entry.match(/Feedback-(.+?):\s*NFD-/);
                      }
                      if (!feedbackMatch) {
                        // Fallback pattern
                        feedbackMatch = entry.match(/Feedback-([^:]+)/);
                      }
                      let feedbackText = feedbackMatch ? feedbackMatch[1].trim() : '';
                      // Handle cases where feedback starts with " -" (space dash)
                      if (feedbackText.startsWith('- ')) {
                        feedbackText = feedbackText.substring(2).trim();
                      } else if (feedbackText.startsWith('-')) {
                        feedbackText = feedbackText.substring(1).trim();
                      }
                      parsed.feedback = feedbackText;

                      // Extract NFD date
                      const nfdMatch = entry.match(/NFD-([^:]+)/);
                      parsed.nfd_date = nfdMatch ? nfdMatch[1].trim() : '';

                      // Extract EJD date
                      const ejdMatch = entry.match(/EJD-([^:]+)/);
                      parsed.ejd_date = ejdMatch ? ejdMatch[1].trim() : '';

                      // Extract IFD date (if present)
                      const ifdMatch = entry.match(/IFD-([^:]+)/);
                      parsed.ifd_date = ifdMatch ? ifdMatch[1].trim() : '';

                      // Extract call status
                      const callStatusMatch = entry.match(/CallStatus-([^:]+)/);
                      parsed.call_status = callStatusMatch ? callStatusMatch[1].trim() : '';

                      // Extract remarks
                      const remarksMatch = entry.match(/Remarks-([^:]+)/);
                      parsed.remarks = remarksMatch ? remarksMatch[1].trim() : '';

                      // Extract entry time
                      const entryTimeMatch = entry.match(/Entry Time([^;]+)/);
                      let entryTimeStr = entryTimeMatch ? entryTimeMatch[1].trim() : '';

                      // TRIM: Extract only the datetime part (DD-MM-YYYY HH:MM:SS)
                      // This handles old corrupted data that has extra metadata appended
                      if (entryTimeStr) {
                        const datetimeMatch = entryTimeStr.match(/(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/);
                        if (datetimeMatch) {
                          entryTimeStr = datetimeMatch[1];
                        }
                      }

                      // Parse and format time in Indian format with AM/PM
                      if (entryTimeStr) {
                        // Handle format like "26-09-2025 12:52:48"
                        const timeMatch = entryTimeStr.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
                        if (timeMatch) {
                          const [, day, month, year, hour, minute, second] = timeMatch;
                          // Create proper ISO date string for parsing
                          const isoTimeStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

                          try {
                            const date = new Date(isoTimeStr);
                            if (!isNaN(date.getTime())) {
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
                              entryTimeStr = date.toLocaleString('en-IN', options);
                            }
                          } catch (error) {
                            // Keep original format if parsing fails
                          }
                        }
                      }

                      parsed.entry_time = entryTimeStr;

                      // Extract entry by
                      const entryByMatch = entry.match(/Entry By-([^:]*?)(?=\s*(?:Entry Time|$))/);
                      parsed.executive_name = entryByMatch ? entryByMatch[1].trim() : '';

                      return parsed;
                    });
                  allFeedbackEntries.push(...entries);
                }
              });
              return { feedback_entries: allFeedbackEntries, total_entries: allFeedbackEntries.length };
            }).catch(err => {
              return { feedback_entries: [], total_entries: 0 };
            }),
            previousCompanyService.getPreviousCompaniesByCandidate(candidateId).catch(err => {
              return [];
            })
          ]);

          if (!isMounted) return;

          setRelatedData({
            clients: clientsData,
            education: educationData,
            experience: experienceData,
            extra: extraData,
            feedback: feedbackData,
            previousCompanies: previousCompaniesData
          });
        } catch (error) {
          if (isMounted) {
          }
        }
      }
    };

    fetchDetailedData();

    return () => {
      isMounted = false;
    };
  }, [
    isViewModalOpen,
    selectedCandidate?.id,
    selectedCandidate?.candidateId
  ]);

  useEffect(() => {
    if (detailedCandidate) {
      // Filter client job data based on selected client assignment
      let clientJob = null;
      if (selectedCandidate?.clientJobId && relatedData.clients) {
        // Find the specific client job that matches the selected row
        clientJob = relatedData.clients.find(job => job.id === selectedCandidate.clientJobId);
      } else if (relatedData.clients && relatedData.clients.length > 0) {
        // Fallback to first client job if no specific selection
        clientJob = relatedData.clients[0];
      }


      // Use dataMapper to get consistent ClientJob data with LIFO feedback parsing
      // Ensure clientJob is not null before mapping
      const clientJobMappedData = mapClientJobToFormData(clientJob || {});


      // Update state with latest feedback from dataMapper (LIFO implementation)
      setRelevantFeedback(clientJobMappedData.feedback || "");

      const vendorData = {
        clientName: clientJobMappedData.clientName || "",
        designation: clientJobMappedData.designation || "",
        currentCtc: clientJobMappedData.currentCtc || "",
        expectedCtc: clientJobMappedData.expectedCtc || "",
        remarks: clientJobMappedData.remarks || "",
        nextFollowUpDate: clientJobMappedData.nextFollowUpDate || "",
        interviewFixedDate: clientJobMappedData.interviewFixedDate || "",
        expectedJoiningDate: clientJobMappedData.expectedJoiningDate || "",
        profileSubmission: clientJobMappedData.profileSubmission || "No",
        profileSubmissionDate: clientJobMappedData.profileSubmissionDate || "",
        feedback: clientJobMappedData.feedback || "",
        attend: clientJobMappedData.attend,
        attendDate: clientJobMappedData.attendDate || ""
      };

      // Also update clientJobFormData with the database values
      setClientJobFormData(prev => ({
        ...prev,
        clientName: clientJobMappedData.clientName || "",
        designation: clientJobMappedData.designation || "",
        currentCtc: clientJobMappedData.currentCtc || "",
        expectedCtc: clientJobMappedData.expectedCtc || "",
        remarks: clientJobMappedData.remarks || "",
        nfdDate: clientJobMappedData.nextFollowUpDate || "",
        ejdDate: clientJobMappedData.expectedJoiningDate || "",
        ifdDate: clientJobMappedData.interviewFixedDate || "",
        profileSubmission: clientJobMappedData.profileSubmission || "No",
        profileSubmissionDate: clientJobMappedData.profileSubmissionDate || "",
        feedback: clientJobMappedData.feedback || "",
        attend: clientJobMappedData.attend === 1 || clientJobMappedData.attend === true || clientJobMappedData.attend === '1' || clientJobMappedData.attend === 'Yes' ? 'Yes' : 'No',
        attendDate: clientJobMappedData.attendDate || ""
      }));

      setFormData(vendorData);
      setOriginalFormData(vendorData);
    }
  }, [detailedCandidate, relatedData.clients, relatedData.feedback, selectedCandidate?.clientJobId, selectedCandidate?._refreshTrigger, employeeNames]);

  useEffect(() => {
    if (detailedCandidate) {
      // Filter client data based on selected client assignment
      let clientData = null;
      if (selectedCandidate?.clientJobId && relatedData.clients) {
        // Find the specific client job that matches the selected row
        clientData = relatedData.clients.find(job => job.id === selectedCandidate.clientJobId);
      } else if (relatedData.clients && relatedData.clients.length > 0) {
        // Fallback to first client job if no specific selection
        clientData = relatedData.clients[0];
      }

      const basicData = {
        experience: detailedCandidate.experience || "",
        educationLevel: detailedCandidate.education || "",
        dateOfBirth: detailedCandidate.dob ?
          (typeof detailedCandidate.dob === 'string' && detailedCandidate.dob.match(/^\d{4}-\d{2}-\d{2}$/) ?
            detailedCandidate.dob :
            new Date(detailedCandidate.dob + 'T00:00:00').toISOString().split('T')[0]
          ) : "",
        gender: detailedCandidate.gender || "",
        currentCTC: clientData?.current_ctc || "",
        expectedCTC: clientData?.expected_ctc || "",
        skills: Array.isArray(detailedCandidate.skills) ? detailedCandidate.skills : (detailedCandidate.skills ? detailedCandidate.skills.split(',').map(s => s.trim()) : []),
        languages: Array.isArray(detailedCandidate.languages) ? detailedCandidate.languages : (detailedCandidate.languages ? detailedCandidate.languages.split(',').map(s => s.trim()) : [])
      };
      setBasicInfoData(basicData);
      setOriginalBasicInfoData(basicData);

      const headerData = {
        name: detailedCandidate.candidate_name || "",
        source: detailedCandidate.source || "",
        city: detailedCandidate.city || "",
        state: detailedCandidate.state || "",
        email: detailedCandidate.email || "",
        phone: detailedCandidate.mobile1 || "",
        mobile2: detailedCandidate.mobile2 || ""
      };
      setHeaderInfoData(headerData);
      setOriginalHeaderInfoData(headerData);
    }
  }, [detailedCandidate, relatedData.clients, selectedCandidate?.clientJobId]);

  // Fetch job openings and auto-update expired NFD when component mounts or candidate changes
  useEffect(() => {
    const initializeViewModal = async () => {
      if (isViewModalOpen && selectedCandidate) {
        // Auto-update expired NFD jobs before loading modal data
        // Note: This now uses smart caching (5min) to prevent frequent API calls
        await autoUpdateExpiredNfd();

        // Then fetch job openings
        fetchJobOpenings();
      }
    };

    initializeViewModal();
  }, [isViewModalOpen, selectedCandidate]);

  // Fetch employee names when ViewModal opens
  useEffect(() => {
    const fetchEmployeeNames = async () => {
      if (isViewModalOpen && selectedCandidate) {
        // Get unique employee codes from candidate and feedback data
        const employeeCodes = new Set();

        // Add executive name from selected candidate and detailed candidate
        if (selectedCandidate.executiveName && selectedCandidate.executiveName !== 'Loggers') {
          employeeCodes.add(selectedCandidate.executiveName);
        }
        if (detailedCandidate?.executive_name && detailedCandidate.executive_name !== 'Loggers') {
          employeeCodes.add(detailedCandidate.executive_name);
        }

        // Add assignment-aware executive name
        const assignmentAwareName = getDisplayExecutiveName(detailedCandidate, selectedCandidate?.selectedClientJob);
        if (assignmentAwareName && assignmentAwareName !== 'Loggers' && assignmentAwareName !== 'N/A') {
          employeeCodes.add(assignmentAwareName);
        }

        // Add executive names from feedback entries
        if (relatedData.feedback && relatedData.feedback.feedback_entries) {
          relatedData.feedback.feedback_entries.forEach(entry => {
            if (entry.executive_name && entry.executive_name !== 'Loggers' && !employeeNames[entry.executive_name]) {
              employeeCodes.add(entry.executive_name);
            }
          });
        }

        // Fetch names for all unique employee codes using shared utility
        for (const employeeCode of employeeCodes) {
          if (!employeeNames[employeeCode]) {
            const name = await fetchEmployeeName(employeeCode);
            setEmployeeNames(prev => ({
              ...prev,
              [employeeCode]: name
            }));
          }
        }
      }
    };

    fetchEmployeeNames();
  }, [isViewModalOpen, selectedCandidate, detailedCandidate, relatedData.feedback]);

  // Fetch call statistics from database - only for the specific client job
  const fetchCallStats = async () => {
    if (!selectedCandidate?.id && !selectedCandidate?.candidateId) return;

    try {
      let answered = 0;
      let notAnswered = 0;
      let totalCallsWithStatus = 0;

      // Get the specific client job being viewed
      let targetClientJob = null;
      if (selectedCandidate?.clientJobId && relatedData.clients) {
        targetClientJob = relatedData.clients.find(job => job.id === selectedCandidate.clientJobId);
      } else if (relatedData.clients && relatedData.clients.length > 0) {
        targetClientJob = relatedData.clients[0];
      }

      // Only count calls from the specific client job
      if (targetClientJob && targetClientJob.feedback) {
        const entries = targetClientJob.feedback.split(';;;;;')
          .filter(entry => entry.trim())
          .map(entry => {
            const parsed = {};

            // Extract call status from the structured feedback
            const callStatusMatch = entry.match(/CallStatus-([^:]+)/);
            parsed.call_status = callStatusMatch ? callStatusMatch[1].trim() : '';

            return parsed;
          });

        // Count call statistics from parsed entries
        entries.forEach(entry => {
          if (entry.call_status) {
            totalCallsWithStatus++;
            const status = entry.call_status.toLowerCase();
            if (status === 'call answered' || status === 'answered') {
              answered++;
            } else if (status === 'call not answered' || status === 'not answered' || status === 'no answer') {
              notAnswered++;
            }
          }
        });
      }

      setCallStats({ answered, notAnswered, totalCallsWithStatus });
    } catch (error) {
      console.error('Error fetching call statistics:', error);
    }
  };

  useEffect(() => {
    fetchCallStats();
  }, [selectedCandidate?.id, selectedCandidate?.candidateId, selectedCandidate?.clientJobId, selectedCandidate?._refreshTrigger, relatedData.clients]);


  // Update client job details in database
  const updateClientJobField = async (field, value) => {
    try {
      const candidateId = selectedCandidate?.candidateId || selectedCandidate?.id;
      if (!candidateId) return;

      // Get current client jobs
      const clientJobs = await clientJobsAPI.getByCandidate(candidateId);
      if (!clientJobs || clientJobs.length === 0) return;

      // Find the specific client job being viewed
      let targetClientJob = null;
      if (selectedCandidate?.clientJobId) {
        targetClientJob = clientJobs.find(job => job.id === selectedCandidate.clientJobId);
      } else {
        targetClientJob = clientJobs[0]; // Use first client job if no specific selection
      }

      if (targetClientJob) {
        // Prepare update data with all required fields to avoid validation errors
        const updateData = {
          candidate: targetClientJob.candidate || candidateId,
          client_name: field === 'clientName' ? value : targetClientJob.client_name,
          designation: field === 'designation' ? value : targetClientJob.designation,
          // Include other existing fields to maintain data integrity
          location: targetClientJob.location || '',
          experience: targetClientJob.experience || '',
          ctc: targetClientJob.ctc || '',
          notice_period: targetClientJob.notice_period || '',
          vendor_status: targetClientJob.vendor_status || 'pending'
        };

        // Update the client job in database
        await clientJobsAPI.update(targetClientJob.id, updateData);

        // Fetch updated client jobs data
        const updatedClientJobs = await clientJobsAPI.getByCandidate(candidateId);

        // Dispatch event to update SearchView in real-time
        window.dispatchEvent(new CustomEvent('candidateUpdated', {
          detail: {
            candidateId: candidateId,
            updatedData: {
              clientJobs: updatedClientJobs
            }
          }
        }));

        toast.success(`${field === 'clientName' ? 'Client Name' : 'Designation'} updated successfully`);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field === 'clientName' ? 'Client Name' : 'Designation'}`);
    }
  };

  // Listen for job assignment completion
  useEffect(() => {
    const handleAssignmentSuccess = async () => {
      const successData = localStorage.getItem('jobAssignmentSuccess');
      if (successData) {
        try {
          const data = JSON.parse(successData);
          toast.success(`Job assigned successfully!`);

          // Only refresh the client jobs data (vendor status) without reloading candidate details
          const candidateId = selectedCandidate?.candidateId || selectedCandidate?.id;
          if (candidateId) {
            try {
              const updatedClientsData = await clientJobs.getByCandidate(candidateId);
              setRelatedData(prev => ({
                ...prev,
                clients: updatedClientsData
              }));
            } catch (error) {
            }
          }

          // Refresh job openings to reflect assignment
          fetchJobOpenings();

          // Clear the success data
          localStorage.removeItem('jobAssignmentSuccess');
        } catch (error) {
        }
      }
    };

    // Check for assignment success when modal opens
    if (isViewModalOpen) {
      handleAssignmentSuccess();
    }

    // Listen for storage events (when new tab closes)
    const handleStorageChange = (e) => {
      if (e.key === 'jobAssignmentSuccess' && e.newValue) {
        handleAssignmentSuccess();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleAssignmentSuccess);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleAssignmentSuccess);
    };
  }, [isViewModalOpen, selectedCandidate]);

  const mobileTabs = [
    { id: "profile", label: "Profile" },
    { id: "resume", label: "Resume" },
    { id: "evaluation", label: "Evaluation" },

  ];

  // const [rating, setRating] = useState(selectedCandidate?.rating || 0);
  const [activeSection, setActiveSection] = useState('notes');
  const sections = [
    { id: 'notes', label: 'Score', icon: 'FileText' },
    { id: 'ratings', label: 'Remarks', icon: 'Star' },
    { id: 'matching', label: 'Job Match', icon: 'Target' },
  ];

  // Track edit mode for clientName and designation fields
  const [isClientNameEditable, setIsClientNameEditable] = useState(false);
  const [isDesignationEditable, setIsDesignationEditable] = useState(false);

  const [formData, setFormData] = useState({
    clientName: "",
    designation: "",
    currentCtc: "",
    expectedCtc: "",
    remarks: "",
    nextFollowUpDate: "",
    interviewFixedDate: "",
    expectedJoiningDate: "",
    profileSubmission: "No",
    profileSubmissionDate: "",
    feedback: "",
    attend: "No",
    attendDate: ""
  });

  const [originalFormData, setOriginalFormData] = useState({});

  const [basicInfoData, setBasicInfoData] = useState({
    experience: "",
    educationLevel: "",
    dateOfBirth: "",
    gender: "",
    currentCTC: "",
    expectedCTC: "",
    skills: [],
    languages: []
  });

  const [originalBasicInfoData, setOriginalBasicInfoData] = useState({});

  // Formatted CTC values for display
  const [formattedCurrentCTC, setFormattedCurrentCTC] = useState('');
  const [formattedExpectedCTC, setFormattedExpectedCTC] = useState('');

  // Indian number formatting function
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

  // Update formatted CTC when basicInfoData changes
  useEffect(() => {
    setFormattedCurrentCTC(formatIndianNumber(basicInfoData.currentCTC));
    setFormattedExpectedCTC(formatIndianNumber(basicInfoData.expectedCTC));
  }, [basicInfoData.currentCTC, basicInfoData.expectedCTC]);

  const [headerInfoData, setHeaderInfoData] = useState({
    name: "",
    source: "",
    city: "",
    state: "",
    email: "",
    phone: "",
    mobile2: ""
  });

  const [originalHeaderInfoData, setOriginalHeaderInfoData] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-fill NFD and feedback when remarks field changes
    if (field === 'remarks' && value && value !== 'Select') {
      // Clear existing date fields when remark changes
      setFormData(prev => ({
        ...prev,
        nextFollowUpDate: '',
        interviewFixedDate: '',
        expectedJoiningDate: ''
      }));

      // Auto-calculate and set NFD and Feedback based on the selected remark
      const autoNfd = allocateNfd(value);
      const autoFeedback = allocateFeedback(value);

      if (autoNfd) {
        setFormData(prev => ({
          ...prev,
          nextFollowUpDate: autoNfd
        }));
      }

      if (autoFeedback) {
        setFormData(prev => ({
          ...prev,
          feedback: autoFeedback
        }));
      }
    }

    // Auto-set submission date to today when "Yes" is selected, clear when "No" or "Select"
    if (field === "profileSubmission") {
      if (value === "Yes") {
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({
          ...prev,
          profileSubmissionDate: today
        }));
      } else if (value === "No" || value === "Select") {
        setFormData(prev => ({
          ...prev,
          profileSubmissionDate: ""
        }));
      }
    }
  };



  const handleBasicInfoChange = (field, value) => {
    setBasicInfoData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagChange = (field, tag, action) => {
    setBasicInfoData((prev) => {
      const currentTags = prev[field] || [];
      if (action === 'add' && !currentTags.includes(tag) && tag.trim()) {
        return {
          ...prev,
          [field]: [...currentTags, tag.trim()]
        };
      } else if (action === 'remove') {
        return {
          ...prev,
          [field]: currentTags.filter(t => t !== tag)
        };
      }
      return prev;
    });
  };

  const calculateAgeFromDate = (dateOfBirth) => {
    if (!dateOfBirth) return 'Not specified';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleHeaderInfoChange = (field, value) => {
    setHeaderInfoData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartHeaderInfoEdit = () => {
    // Disable header info editing in job assignment context
    if (isJobAssignmentContext) {
      toast.error('Header editing disabled in job assignment');
      return;
    }
    setIsHeaderInfoEditMode(true);
  };

  const handleSaveHeaderInfo = async () => {
    setIsSubmitting(true);
    try {
      if (!selectedCandidate?.id) {
        toast.error('No candidate selected');
        return;
      }

      const candidateId = selectedCandidate?.candidateId || selectedCandidate?.id;
      if (!candidateId) {
        toast.error('No candidate selected');
        return;
      }


      // Map frontend field names to backend field names
      // Include all required fields to avoid validation errors
      const mappedData = {
        executive_name: detailedCandidate?.executive_name || '', // Always preserve original executive name from database
        candidate_name: headerInfoData.name || '',
        email: headerInfoData.email || '',
        mobile1: headerInfoData.phone || '',
        mobile2: headerInfoData.mobile2 || '',
        source: headerInfoData.source || '',
        city: headerInfoData.city || '',
        state: headerInfoData.state || ''
      };


      const result = await candidates.update(candidateId, mappedData);

      // Update detailedCandidate with backend field names for immediate UI refresh
      setDetailedCandidate(prev => ({
        ...prev,
        candidate_name: headerInfoData.name,
        email: headerInfoData.email,
        mobile1: headerInfoData.phone,
        mobile2: headerInfoData.mobile2,
        source: headerInfoData.source,
        city: headerInfoData.city,
        state: headerInfoData.state
      }));

      // Update the candidate state that's used in the display (if available)
      if (typeof setCandidate === 'function') {
        setCandidate(prev => ({
          ...prev,
          name: headerInfoData.name,
          email: headerInfoData.email,
          phone: headerInfoData.phone,
          mobile2: headerInfoData.mobile2,
          source: headerInfoData.source,
          city: headerInfoData.city,
          state: headerInfoData.state
        }));
      }

      // Also update selectedCandidate if it exists
      if (typeof setSelectedCandidate === 'function') {
        setSelectedCandidate(prev => ({
          ...prev,
          candidateName: headerInfoData.name,
          email: headerInfoData.email,
          phone: headerInfoData.phone,
          contactNumber1: headerInfoData.phone,
          mobile2: headerInfoData.mobile2,
          source: headerInfoData.source,
          city: headerInfoData.city,
          state: headerInfoData.state
        }));
      }

      setOriginalHeaderInfoData(headerInfoData);

      setIsHeaderInfoEditMode(false);


      // Dispatch event to update SearchView in real-time
      window.dispatchEvent(new CustomEvent('candidateUpdated', {
        detail: {
          candidateId: candidateId,
          updatedData: {
            candidateName: headerInfoData.name,
            email: headerInfoData.email,
            contactNumber1: headerInfoData.phone,
            contactNumber2: headerInfoData.mobile2,
            source: headerInfoData.source,
            city: headerInfoData.city,
            state: headerInfoData.state
          }
        }
      }));
    } catch (error) {
      // More specific error messages
      if (error.response?.status === 400) {
        toast.error('Validation error');
      } else if (error.response?.status === 404) {
        toast.error('Candidate not found');
      } else if (error.response?.status === 500) {
        toast.error('Server error');
      } else {
        toast.error('Failed to update header');
      }
    }
  };

  const handleCancelHeaderInfo = () => {
    setHeaderInfoData(originalHeaderInfoData);
    setIsHeaderInfoEditMode(false);
  };

  // Handle Call Answered - Open modal with client job details
  const handleCallAnswered = async () => {
    try {
      // Get the correct client job for this candidate
      const candidateId = selectedCandidate?.candidateId || selectedCandidate?.id;
      const clientJobs = await clientJobsAPI.getByCandidate(candidateId);

      if (clientJobs && clientJobs.length > 0) {
        // Find the specific client job that matches current ViewModal display
        let clientJob = null;
        if (selectedCandidate?.clientJobId) {
          clientJob = clientJobs.find(job => job.id === selectedCandidate.clientJobId);
        }
        // If not found or no specific selection, find by client name and designation match
        if (!clientJob && formData.clientName && formData.designation) {
          clientJob = clientJobs.find(job =>
            job.client_name === formData.clientName &&
            job.designation === formData.designation
          );
        }
        // Fallback to first client job
        if (!clientJob) {
          clientJob = clientJobs[0];
        }

        // Pre-fill form data with existing client job details
        // Use correct backend field names: next_follow_up_date, expected_joining_date, interview_date

        // Helper function to convert date from DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD for date input
        const convertToDateInputFormat = (dateStr) => {
          if (!dateStr) return '';

          // Handle ISO 8601 format (e.g., "2025-11-06T00:00:00Z")
          if (dateStr.includes('T')) {
            return dateStr.split('T')[0]; // Extract YYYY-MM-DD part
          }

          // If already in YYYY-MM-DD format, return as is
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
          }

          // Handle DD-MM-YYYY or DD/MM/YYYY format
          const parts = dateStr.split(/[-\/]/);
          if (parts.length === 3) {
            const [day, month, year] = parts;
            // Return in YYYY-MM-DD format
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }

          return dateStr;
        };

        setClientJobFormData({
          clientName: clientJob.client_name || '',
          designation: clientJob.designation || '',
          feedback: extractMainFeedback(clientJob.feedback) || 'Call Answered',
          remarks: clientJob.remarks || '',
          nfdDate: convertToDateInputFormat(clientJob.next_follow_up_date) || '',
          ejdDate: convertToDateInputFormat(clientJob.expected_joining_date) || '',
          ifdDate: convertToDateInputFormat(clientJob.interview_date) || '',
          profileSubmission: (clientJob.profile_submission === true || clientJob.profile_submission === 1 || clientJob.profile_submission === '1' || clientJob.profile_submission === 'Yes') ? 'Yes' : 'No',
          profileSubmissionDate: convertToDateInputFormat(clientJob.profile_submission_date) || '',
          attend: (clientJob.attend === true || clientJob.attend === 1 || clientJob.attend === '1' || clientJob.attend === 'Yes') ? 'Yes' : 'No',
          attendDate: convertToDateInputFormat(clientJob.attend_date) || ''
        });

        setClientJobCallStatus('call answered');
        setIsClientJobModalOpen(true);
      } else {
        toast.error('No client job found for this candidate');
      }
    } catch (error) {
      console.error('Error loading client job data:', error);
      toast.error('Failed to load client job details');
    }
  };

  // Handle Call Not Answered - Directly update feedback like FormStep1
  const handleCallNotAnswered = async () => {
    try {
      toast.loading('Updating feedback with Call Not Answered status...', { id: 'cna-update' });

      const candidateId = selectedCandidate?.candidateId || selectedCandidate?.id;
      const clientJobs = await clientJobsAPI.getByCandidate(candidateId);

      if (clientJobs && clientJobs.length > 0) {
        // Find the specific client job that matches current ViewModal display
        let clientJob = null;
        if (selectedCandidate?.clientJobId) {
          clientJob = clientJobs.find(job => job.id === selectedCandidate.clientJobId);
        }
        // If not found or no specific selection, find by client name and designation match
        if (!clientJob && formData.clientName && formData.designation) {
          clientJob = clientJobs.find(job =>
            job.client_name === formData.clientName &&
            job.designation === formData.designation
          );
        }
        // Fallback to first client job
        if (!clientJob) {
          clientJob = clientJobs[0];
        }

        const clientJobId = clientJob.id;

        // Calculate next follow-up date (next working day, excluding Sundays)
        const nfdDate = calculateNextFollowUpDate();

        // Directly add feedback with CNA status like FormStep1
        // Explicitly clear EJD and IFD for "Call Not Answered" remark
        await clientJobsAPI.addFeedback(clientJobId, {
          feedback_text: 'Call Not Answered',
          remarks: 'Call Not Answered',
          nfd_date: nfdDate,
          ejd_date: null,  // Clear Expected Joining Date
          ifd_date: null,  // Clear Interview Fixed Date
          call_status: 'call not answered',
          entry_by: detailedCandidate?.executive_name || selectedCandidate?.backendData?.executive_name || 'Unknown'
        });

        toast.success(`Call Not Answered feedback added. Next follow-up: ${nfdDate}`, { id: 'cna-update' });

        // Refresh the candidate data
        const updatedCandidate = await candidates.getById(candidateId);
        setDetailedCandidate(updatedCandidate);

        // Refresh client jobs data
        const updatedClientJobs = await clientJobsAPI.getByCandidate(candidateId);
        setRelatedData(prev => ({
          ...prev,
          clients: updatedClientJobs
        }));

        // Force refresh of call statistics
        await fetchCallStats();

        // Dispatch event to update SearchView in real-time (don't trigger full data refresh)
        window.dispatchEvent(new CustomEvent('candidateUpdated', {
          detail: {
            candidateId: candidateId,
            updatedData: {
              remarks: 'call not answered',
              lastUpdated: new Date().toISOString()
            }
          }
        }));

      } else {
        toast.error('No client job found for this candidate', { id: 'cna-update' });
      }
    } catch (error) {
      console.error('Error updating Call Not Answered feedback:', error);
      toast.error('Failed to update feedback', { id: 'cna-update' });
    }
  };

  // Handle client job form submission
  const handleClientJobSubmit = async () => {
    console.log('🔵 Call Answered/Not Answered button clicked!');

    // Validate feedback before proceeding
    if (!clientJobFormData.feedback || clientJobFormData.feedback.trim() === '') {
      toast.error('Please enter feedback before submitting');
      setShowFeedbackError(true);
      return;
    }
    
    // Check if user is account holder and store it in a const
    const isAccountHolder = canEditClientJob();

    try {
      toast.loading('Saving client job details...', { id: 'client-job-save' });

      const candidateId = selectedCandidate?.candidateId || selectedCandidate?.id;
      const clientJobs = await clientJobsAPI.getByCandidate(candidateId);

      if (clientJobs && clientJobs.length > 0) {
        // Find the specific client job that matches current ViewModal display
        let clientJob = null;
        if (selectedCandidate?.clientJobId) {
          clientJob = clientJobs.find(job => job.id === selectedCandidate.clientJobId);
        }
        // If not found or no specific selection, find by client name and designation match
        if (!clientJob && formData.clientName && formData.designation) {
          clientJob = clientJobs.find(job =>
            job.client_name === formData.clientName &&
            job.designation === formData.designation
          );
        }
        // Fallback to first client job
        if (!clientJob) {
          clientJob = clientJobs[0];
        }

        const clientJobId = clientJob.id;

        // First update client job fields if they were changed
        const updateData = {
          candidate: clientJob.candidate || candidateId,
          client_name: clientJobFormData.clientName || clientJob.client_name,
          designation: clientJobFormData.designation || clientJob.designation,
          // Include other existing fields to maintain data integrity
          location: clientJob.location || '',
          experience: clientJob.experience || '',
          ctc: clientJob.ctc || '',
          notice_period: clientJob.notice_period || '',
          vendor_status: clientJob.vendor_status || 'pending',
          // Only include attend and attend_date if user is account holder
          ...(isAccountHolder && {
            attend: clientJobFormData.attend === 'Yes' ? 1 : 0,
            attend_date: clientJobFormData.attendDate
              ? (clientJobFormData.attendDate.match(/^\d{4}-\d{2}-\d{2}$/)
                ? clientJobFormData.attendDate
                : new Date(clientJobFormData.attendDate + 'T00:00:00').toISOString().split('T')[0])
              : null
          })
        };
        
        // Remove undefined values to prevent sending them to the API
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        // Update the client job in database
        await clientJobsAPI.update(clientJobId, updateData);


        // Add feedback with call status
        // For non-account holders: Clear date fields since they cannot see/edit them
        // This prevents stale NFD dates from being resubmitted

        // Helper function to ensure date is in YYYY-MM-DD format
        const ensureDateFormat = (dateStr) => {
          if (!dateStr) return null;
          // If already in YYYY-MM-DD format, return as is
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
          }
          // Otherwise convert to YYYY-MM-DD
          return new Date(dateStr + 'T00:00:00').toISOString().split('T')[0];
        };

        await clientJobsAPI.addFeedback(clientJobId, {
          feedback_text: clientJobFormData.feedback,
          remarks: clientJobFormData.remarks,
          // Only include date fields if user is account holder, otherwise send null to clear old dates
          nfd_date: isAccountHolder ? ensureDateFormat(clientJobFormData.nfdDate) : null,
          ejd_date: isAccountHolder ? ensureDateFormat(clientJobFormData.ejdDate) : null,
          ifd_date: isAccountHolder ? ensureDateFormat(clientJobFormData.ifdDate) : null,
          profile_submission: isAccountHolder ? getProfileSubmissionDbValue(clientJobFormData.profileSubmission) : null,
          profile_submission_date: isAccountHolder ? ensureDateFormat(clientJobFormData.profileSubmissionDate) : null,
          attend: isAccountHolder ? (clientJobFormData.attend === 'Yes' ? 1 : 0) : null,
          attend_date: isAccountHolder ? ensureDateFormat(clientJobFormData.attendDate) : null,
          call_status: clientJobCallStatus,
          entry_by: detailedCandidate?.executive_name || selectedCandidate?.backendData?.executive_name || 'Unknown'
        });

        // Create status history entry for the call answered action
        try {
          const today = new Date().toISOString().split('T')[0];
          const executiveCode = currentUser?.employeeCode || currentUser?.username || 'UNKNOWN';
          const callStatusText = clientJobCallStatus === 'call answered' ? 'Call Answered' : 'Call Not Answered';

          // Include attendance data in status history
          await StatusHistoryService.createStatusHistory({
            candidate_id: candidateId,
            client_job_id: clientJobId,
            vendor_id: null,
            client_name: clientJobFormData.clientName || clientJob.client_name,
            remarks: clientJobFormData.remarks || 'interested',
            change_date: today,
            created_by: executiveCode,
            extra_notes: `${callStatusText}. Feedback: ${clientJobFormData.feedback || 'No feedback provided'}`,
            attend_flag: clientJobFormData.attend === 'Yes',
          });

          console.log('✅ Status history created for call answered action:', {
            candidate_id: candidateId,
            client_job_id: clientJobId,
            call_status: callStatusText,
            remarks: clientJobFormData.remarks,
            created_by: executiveCode
          });

          // Trigger calendar refresh to show the new status
          dispatch(triggerCalendarRefresh());

        } catch (statusError) {
          console.error('❌ Failed to create status history for call answered:', statusError);
          // Don't block the main flow if status history fails
        }

        toast.success('Client job details saved successfully', { id: 'client-job-save' });

        // Mark form as submitted to switch to read mode
        setClientJobFormSubmitted(true);

        // Refresh the candidate data
        const updatedCandidate = await candidates.getById(candidateId);
        setDetailedCandidate(updatedCandidate);

        // Refresh client jobs data
        const updatedClientJobs = await clientJobsAPI.getByCandidate(candidateId);
        setRelatedData(prev => ({
          ...prev,
          clients: updatedClientJobs
        }));

        // Force refresh of call statistics
        await fetchCallStats();

        // Dispatch event to update SearchView in real-time
        // Include clientJobId to match the correct row when candidate has multiple client jobs
        window.dispatchEvent(new CustomEvent('candidateUpdated', {
          detail: {
            candidateId: candidateId,
            clientJobId: clientJobId, // Include clientJobId for precise matching
            updatedData: {
              remarks: clientJobFormData.remarks,
              clientName: clientJobFormData.clientName,
              designation: clientJobFormData.designation,
              profileSubmission: clientJobFormData.profileSubmission,
              profileSubmissionDate: clientJobFormData.profileSubmissionDate,
              attend: clientJobFormData.attend,
              attendDate: clientJobFormData.attendDate,
              feedback: clientJobFormData.feedback,
              nfd: clientJobFormData.nfdDate,
              interviewFixedDate: clientJobFormData.ifdDate,
              expectedJoiningDate: clientJobFormData.ejdDate,
              lastUpdated: new Date().toISOString()
            }
          }
        }));

        // Dispatch Redux action to trigger calendar refresh (current tab only)
        dispatch(triggerCalendarRefresh());

        // Broadcast to OTHER tabs using BroadcastChannel
        // Note: BroadcastChannel doesn't send to the same tab, only to other tabs
        try {
          const channel = new BroadcastChannel('calendar_refresh');
          channel.postMessage({
            type: 'CALENDAR_REFRESH_TRIGGER',
            timestamp: Date.now(),
            candidateId: candidateId,
            clientJobId: clientJobId
          });
          channel.close();
          console.log('📤 Broadcast sent to other tabs');
        } catch (error) {
          console.log('BroadcastChannel not supported:', error);
        }

        // Close modal after a brief delay to show the read mode
        setTimeout(() => {
          setIsClientJobModalOpen(false);
          setClientJobFormSubmitted(false); // Reset for next time
        }, 1000);
      } else {
        toast.error('No client job found for this candidate', { id: 'client-job-save' });
      }
    } catch (error) {
      console.error('Error saving client job details:', error);
      toast.error('Failed to save client job details', { id: 'client-job-save' });
    }
  };

  const handleStartBasicInfoEdit = () => {
    // Disable basic info editing in job assignment context
    if (isJobAssignmentContext) {
      toast.error('Basic editing disabled in job assignment');
      return;
    }
    setIsBasicInfoEditMode(true);
  };

  const handleSaveBasicInfo = async () => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }

    // Validate before setting isSubmitting
    if (!selectedCandidate?.id) {
      toast.error('No candidate selected');
      return;
    }

    const candidateId = selectedCandidate?.candidateId || selectedCandidate?.id;
    if (!candidateId) {
      toast.error('No candidate selected');
      return;
    }

    setIsSubmitting(true);
    try {

      // Map frontend field names to backend field names
      // Include all required fields to avoid validation errors
      const mappedData = {
        executive_name: detailedCandidate.executive_name, // Keep existing value
        candidate_name: detailedCandidate.candidate_name, // Keep existing value
        email: detailedCandidate.email, // Keep existing value
        mobile1: detailedCandidate.mobile1, // Keep existing value
        experience: basicInfoData.experience,
        education: basicInfoData.educationLevel,
        gender: basicInfoData.gender,
        skills: Array.isArray(basicInfoData.skills) ? basicInfoData.skills : (basicInfoData.skills ? [basicInfoData.skills] : []),
        languages: Array.isArray(basicInfoData.languages) ? basicInfoData.languages : (basicInfoData.languages ? [basicInfoData.languages] : [])
      };

      // Only include dob if it has a valid value
      if (basicInfoData.dateOfBirth && basicInfoData.dateOfBirth.trim()) {
        mappedData.dob = basicInfoData.dateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/) ?
          basicInfoData.dateOfBirth :
          new Date(basicInfoData.dateOfBirth + 'T00:00:00').toISOString().split('T')[0];
      }

      await candidates.update(candidateId, mappedData);

      // Update CTC values in ClientJob if they exist
      if (relatedData.clients && relatedData.clients.length > 0 && (basicInfoData.currentCTC || basicInfoData.expectedCTC)) {
        const clientJobId = relatedData.clients[0].id;
        const existingClientJob = relatedData.clients[0];
        const ctcData = {
          candidate: existingClientJob.candidate,
          client_name: existingClientJob.client_name,
          designation: existingClientJob.designation,
          current_ctc: basicInfoData.currentCTC || null,
          expected_ctc: basicInfoData.expectedCTC || null
        };
        await clientJobs.update(clientJobId, ctcData);

        // Dispatch event to update FeedbackModal
        window.dispatchEvent(new CustomEvent('feedbackUpdated', {
          detail: {
            candidateId: selectedCandidate?.candidateId || selectedCandidate?.id,
            timestamp: Date.now()
          }
        }));

        // Update relatedData to reflect CTC changes immediately
        setRelatedData(prev => ({
          ...prev,
          clients: prev.clients.map(client =>
            client.id === clientJobId
              ? { ...client, current_ctc: basicInfoData.currentCTC, expected_ctc: basicInfoData.expectedCTC }
              : client
          )
        }));
      }

      // Update detailedCandidate with the correct backend field names
      setDetailedCandidate(prev => ({
        ...prev,
        experience: basicInfoData.experience,
        education: basicInfoData.educationLevel,
        dob: basicInfoData.dateOfBirth,
        gender: basicInfoData.gender,
        skills: basicInfoData.skills,
        languages: basicInfoData.languages
      }));

      // Update selectedCandidate if it exists
      if (typeof setSelectedCandidate === 'function') {
        setSelectedCandidate(prev => ({
          ...prev,
          experience: basicInfoData.experience,
          education: basicInfoData.educationLevel,
          dateOfBirth: basicInfoData.dateOfBirth,
          gender: basicInfoData.gender,
          skills: basicInfoData.skills,
          languages: basicInfoData.languages
        }));
      }

      setOriginalBasicInfoData(basicInfoData);

      setIsBasicInfoEditMode(false);
      toast.success('Basic info updated successfully');

      // Dispatch event to update SearchView in real-time (same tab)
      window.dispatchEvent(new CustomEvent('candidateUpdated', {
        detail: {
          candidateId: candidateId,
          updatedData: {
            experience: basicInfoData.experience,
            education: basicInfoData.educationLevel,
            gender: basicInfoData.gender,
            currentCtc: basicInfoData.currentCTC,
            expectedCtc: basicInfoData.expectedCTC
          }
        }
      }));

      // Broadcast to other tabs using BroadcastChannel
      try {
        const channel = new BroadcastChannel('candidate_updates');
        channel.postMessage({
          type: 'candidateUpdated',
          candidateId: candidateId,
          updatedData: {
            experience: basicInfoData.experience,
            education: basicInfoData.educationLevel,
            gender: basicInfoData.gender,
            currentCtc: basicInfoData.currentCTC,
            expectedCtc: basicInfoData.expectedCTC
          }
        });
        channel.close();
      } catch (error) {
        // BroadcastChannel not supported
      }
    } catch (error) {
      console.error('❌ Error updating candidate:', error);
      console.error('❌ Error response:', error.response?.data);
      toast.error(`Failed to update basic info: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBasicInfo = () => {
    setBasicInfoData(originalBasicInfoData);
    setIsBasicInfoEditMode(false);
  };

  const handleSubmit = async (e) => {
    // Validate feedback before submitting
    if (clientJobFormData && (!clientJobFormData.feedback || clientJobFormData.feedback.trim() === '')) {
      setShowFeedbackError(true);
      toast.error('Please enter feedback before submitting');
      return;
    }
    // Exit edit mode for client and designation fields
    setIsClientNameEditable(false);
    setIsDesignationEditable(false);
    try {
      const candidateId = selectedCandidate?.candidateId || selectedCandidate?.id;
      if (!candidateId) {
        toast.error('No candidate selected');
        return;
      }


      // Ensure candidateId is a valid integer
      const validCandidateId = parseInt(candidateId) || selectedCandidate?.id || detailedCandidate?.id;

      if (!validCandidateId) {
        throw new Error('No valid candidate ID found');
      }

      const clientJobData = {
        candidate: validCandidateId,
        client_name: formData.clientName || '',
        designation: formData.designation || '',
        current_ctc: formData.currentCtc ? parseFloat(formData.currentCtc) : null,
        expected_ctc: formData.expectedCtc ? parseFloat(formData.expectedCtc) : null,
        profile_submission: formData.profileSubmission === "Yes" || formData.profileSubmission === true,
        profile_submission_date: formData.profileSubmissionDate ?
          (formData.profileSubmissionDate.match(/^\d{4}-\d{2}-\d{2}$/) ?
            formData.profileSubmissionDate :
            new Date(formData.profileSubmissionDate + 'T00:00:00').toISOString().split('T')[0]
          ) : null
      };



      // Find the correct client job by matching candidate and client name
      let targetClientJob = null;

      if (relatedData.clients && relatedData.clients.length > 0) {
        // First try to find by client name and designation match
        targetClientJob = relatedData.clients.find(job =>
          job.client_name === clientJobData.client_name &&
          job.designation === clientJobData.designation
        );

        // If not found by name/designation, try by clientJobId if available
        if (!targetClientJob && selectedCandidate?.clientJobId) {
          targetClientJob = relatedData.clients.find(job => job.id === selectedCandidate.clientJobId);
        }

        // If still not found, use the first one as fallback
        if (!targetClientJob) {
          targetClientJob = relatedData.clients[0];
        }
      }

      if (targetClientJob) {
        try {
          // Update the specific client job
          await clientJobsAPI.update(targetClientJob.id, clientJobData);
        } catch (error) {
          if (error.response?.status === 404) {
            // ClientJob doesn't exist, create a new one
            await clientJobsAPI.create(clientJobData);
          } else {
            throw error;
          }
        }
      } else {
        // Create new client job
        await clientJobsAPI.create(clientJobData);
      }

      // Handle feedback - only add new feedback if content has actually changed
      let updatedFeedbackData = null;
      if (formData.feedback && formData.feedback.trim()) {
        try {
          // Get fresh ClientJob data for this candidate to find the correct one
          const freshClientJobs = await clientJobsAPI.getByCandidate(validCandidateId);

          // Find the ClientJob that matches the client name and designation we just updated/created
          const matchingClientJob = freshClientJobs.find(job =>
            job.client_name === clientJobData.client_name &&
            job.designation === clientJobData.designation
          );

          if (matchingClientJob) {
            // Always add a new feedback entry for this client job
            updatedFeedbackData = await clientJobsAPI.addFeedback(matchingClientJob.id, {
              feedback_text: formData.feedback,
              remarks: formData.remarks || '',
              nfd_date: formData.nextFollowUpDate || null,
              ejd_date: formData.expectedJoiningDate || null,
              ifd_date: formData.interviewFixedDate || null,
              entry_by: detailedCandidate?.executive_name || 'Unknown'
            });
          }
        } catch (error) {
          toast.error('Error processing feedback');
        }
      }

      toast.success('Client job updated successfully');
      setIsEditMode(false);

      // Refresh data for the candidate
      const updatedClientData = await clientJobsAPI.getByCandidate(candidateId);

      // Refresh candidate data to get updated feedback
      const updatedCandidate = await candidates.getById(candidateId);
      setDetailedCandidate(updatedCandidate);

      // Update relatedData with fresh ClientJob data to refresh remarks section
      setRelatedData(prev => ({
        ...prev,
        clients: updatedClientData
      }));

      // Force refresh of call statistics
      await fetchCallStats();

      // Clear the feedback input field and force re-render
      setFormData(prev => ({
        ...prev,
        feedback: ""
      }));

      // Dispatch event to update SearchView in real-time (same tab)
      window.dispatchEvent(new CustomEvent('candidateUpdated', {
        detail: {
          candidateId: candidateId,
          updatedData: {
            clientName: formData.clientName,
            designation: formData.designation,
            profileSubmission: formData.profileSubmission,
            profileSubmissionDate: formData.profileSubmissionDate,
            remarks: formData.remarks,
            nfd: formData.nextFollowUpDate,
            interviewFixedDate: formData.interviewFixedDate,
            expectedJoiningDate: formData.expectedJoiningDate
          }
        }
      }));

      // Broadcast to other tabs using BroadcastChannel
      try {
        const channel = new BroadcastChannel('candidate_updates');
        channel.postMessage({
          type: 'candidateUpdated',
          candidateId: candidateId,
          updatedData: {
            clientName: formData.clientName,
            designation: formData.designation,
            profileSubmission: formData.profileSubmission,
            profileSubmissionDate: formData.profileSubmissionDate,
            remarks: formData.remarks,
            nfd: formData.nextFollowUpDate,
            interviewFixedDate: formData.interviewFixedDate,
            expectedJoiningDate: formData.expectedJoiningDate
          }
        });
        channel.close();
      } catch (error) {
        // BroadcastChannel not supported
      }

      // Force immediate recalculation of feedback display
      setTimeout(() => {
        // Trigger useEffect to recalculate feedback display with fresh data
        actions.setSelectedCandidate({ ...selectedCandidate, _refreshTrigger: Date.now() });

        // Dispatch event to update FeedbackModal if it's open
        window.dispatchEvent(new CustomEvent('feedbackUpdated', {
          detail: {
            candidateId: candidateId,
            timestamp: Date.now()
          }
        }));

        // Dispatch Redux action to trigger calendar refresh (current tab only)
        dispatch(triggerCalendarRefresh());

        // Broadcast to OTHER tabs using BroadcastChannel
        // Note: BroadcastChannel doesn't send to the same tab, only to other tabs
        try {
          const channel = new BroadcastChannel('calendar_refresh');
          channel.postMessage({
            type: 'CALENDAR_REFRESH_TRIGGER',
            timestamp: Date.now(),
            candidateId: candidateId
          });
          channel.close();
          console.log('📤 Broadcast sent to other tabs');
        } catch (error) {
          console.log('BroadcastChannel not supported:', error);
        }
      }, 100);

    } catch (error) {
      if (error.response?.status === 400) {
        toast.error('Validation error');
      } else if (error.response?.status === 404) {
        toast.error('Client job not found');
      } else if (error.response?.status === 500) {
        toast.error('Server error');
      } else {
        toast.error('Failed to save data');
      }
    }
  };

  const handleCancel = () => {
    // Exit edit mode for client and designation fields
    setIsClientNameEditable(false);
    setIsDesignationEditable(false);
    setFormData(originalFormData);
    setIsEditMode(false);
  };

  if (!isViewModalOpen || !selectedCandidate) return null;

  const candidate = {
    ...selectedCandidate,
    name: detailedCandidate?.candidate_name || selectedCandidate?.candidateName,
    email: detailedCandidate?.email || selectedCandidate?.email,
    phone: detailedCandidate?.mobile1 || selectedCandidate?.phone || selectedCandidate?.contactNumber1,
    mobile2: detailedCandidate?.mobile2 || selectedCandidate?.mobile2,
    profileNumber: detailedCandidate?.profile_number || selectedCandidate?.profile_number || selectedCandidate?.profileNumber || "Not available",
    source: detailedCandidate?.source || selectedCandidate?.source || "Not specified",
    city: detailedCandidate?.city || selectedCandidate?.city,
    state: detailedCandidate?.state || selectedCandidate?.state,
    gender: detailedCandidate?.gender || "Not specified",
    dateOfBirth: detailedCandidate?.dob,
    experience: detailedCandidate?.experience || "Not specified",
    skills: detailedCandidate?.skills || [],
    languages: detailedCandidate?.languages || [],
    educationLevel: detailedCandidate?.education,
    createdAt: detailedCandidate?.created_at,
    updatedAt: detailedCandidate?.updated_at,
  };


  const handleClose = () => {
    // Use closeModal if provided via props, otherwise use context action
    if (closeModal) {
      closeModal();
    } else {
      actions.setIsViewModalOpen(false);
    }
    // Don't clear search results when closing ViewModal
    // The real-time update system should handle any changes
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 px-2 py-1'
      case 'inactive':
        return 'bg-red-100 text-red-800 px-2 py-1'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 px-2 py-1'
      default:
        return 'bg-gray-100 text-gray-800 px-2 py-1'
    }
  }

  const openWhatsApp = (phoneNumber) => {
    if (!phoneNumber) return;

    // Clean the phone number (remove spaces, dashes, etc.)
    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');

    // Add country code if not present (assuming India +91)
    const formattedNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;

    // Open WhatsApp with the formatted number
    const whatsappUrl = `https://wa.me/${formattedNumber}`;
    window.open(whatsappUrl, '_blank');
  }

  const openEmail = (email) => {
    if (!email) return;

    // Open default email client with the email address
    const emailUrl = `mailto:${email}`;
    window.open(emailUrl, '_blank');
  }

  const validateAndSetPdf = (file) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase()?.endsWith('.pdf');
    if (!isPdf) {
      setUploadError('Please upload a PDF file.');
      setUploadedFile(null);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      return;
    }

    setUploadError(null);
    setUploadedFile(file);

    const nextUrl = URL.createObjectURL(file);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(nextUrl);
    setActiveMobileTab('resume');

    uploadResumeToBackend(file);
  };

  const handleFileUpload = (event) => {
    // Disable resume upload in job assignment context
    if (isJobAssignmentContext) {
      toast.error('Resume upload is disabled in job assignment context');
      return;
    }
    const file = event?.target?.files?.[0];
    validateAndSetPdf(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const file = event?.dataTransfer?.files?.[0];
    validateAndSetPdf(file);
  };

  const handleClearUpload = () => {
    setUploadedFile(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  };

  const handleReplaceResume = () => {
    setUploadedFile(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    document.getElementById('resume-upload')?.click();
  };

  const uploadResumeToBackend = async (file) => {
    if (!selectedCandidate?.id) {
      toast.error('No candidate selected');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('resume_file', file);

      // Extract numeric candidate ID from compound ID if needed
      let candidateId = selectedCandidate.candidateId || selectedCandidate.id;
      if (typeof candidateId === 'string' && candidateId.includes('-')) {
        candidateId = candidateId.split('-')[0];
      }
      candidateId = parseInt(candidateId, 10);

      const response = await fetch(`${BASE_URL}/api/candidates/${candidateId}/upload-resume/`, {
        method: 'POST',
        body: formData,
        headers: {
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      await response.json();

      const updatedCandidate = await candidates.getById(candidateId);
      if (updatedCandidate.resume_file) {
        let resumeUrl;
        if (updatedCandidate.resume_file.startsWith(BASE_URL)) {
          resumeUrl = updatedCandidate.resume_file;
        } else if (updatedCandidate.resume_file.startsWith('/media/')) {
          resumeUrl = `${BASE_URL}${updatedCandidate.resume_file}`;
        } else {
          resumeUrl = `${BASE_URL}/media/resumes/${updatedCandidate.resume_file}`;
        }

        setPdfUrl(resumeUrl);
        toast.success('Resume uploaded successfully!');
        setDetailedCandidate(updatedCandidate);
      }
    } catch (error) {
      toast.error(`Failed to upload resume: ${error.message}`);
    }
  };


  const mapCandidateDataForScoring = () => {
    // Only show warning if modal is open and data should be available
    if (!detailedCandidate || !relatedData) {
      // Reduce console noise - only warn if data is still missing after modal has been open for a while
      return null;
    }

    const baseData = {
      // Notice period from experience data
      noticePeriod: relatedData.experience?.[0]?.notice_period || '',

      // Education data - array format matching database schema
      education: relatedData.education?.map(cert => ({
        type: cert.certificate_type || cert.type || 'other',
        certificate_type: cert.certificate_type,
        has_certificate: cert.has_certificate || false,
        reason: cert.reason || '',
        candidate_id: detailedCandidate.id
      })) || [],

      // Experience data - array format matching scoring system expectation
      experience: relatedData.experience?.map(exp => ({
        offer_letter: exp.offer_letter || false,
        offerLetter: exp.offer_letter || false,
        payslip: exp.payslip || false,
        relieving_letter: exp.relieving_letter || false,
        relievingLetter: exp.relieving_letter || false,
        notice_period: exp.notice_period || '',
        incentives: exp.incentives || false,
        incentive_amount: exp.incentive_amount || 0,
        incentiveAmount: exp.incentive_amount || 0,
        incentive_proof: exp.incentive_proof || false,
        incentiveProof: exp.incentive_proof || false,
        more_than_15_months: exp.more_than_15_months || false,
        moreThan15Months: exp.more_than_15_months || false,
        first_salary: exp.first_salary || 0,
        firstSalary: exp.first_salary || 0,
        current_salary: exp.current_salary || 0,
        currentSalary: exp.current_salary || 0,
        candidate_id: detailedCandidate.id
      })) || [],

      // Also keep experienceCompanies for display compatibility
      experienceCompanies: relatedData.experience?.map(exp => ({
        offer_letter: exp.offer_letter || false,
        offerLetter: exp.offer_letter || false,
        payslip: exp.payslip || false,
        relieving_letter: exp.relieving_letter || false,
        relievingLetter: exp.relieving_letter || false,
        notice_period: exp.notice_period || '',
        noticePeriod: exp.notice_period || '',
        incentives: exp.incentives || false,
        incentive_amount: exp.incentive_amount || 0,
        incentiveAmount: exp.incentive_amount || 0,
        incentive_proof: exp.incentive_proof || false,
        incentiveProof: exp.incentive_proof || false,
        more_than_15_months: exp.more_than_15_months || false,
        moreThan15Months: exp.more_than_15_months || false,
        first_salary: exp.first_salary || 0,
        firstSalary: exp.first_salary || 0,
        current_salary: exp.current_salary || 0,
        currentSalary: exp.current_salary || 0,
        candidate_id: detailedCandidate.id
      })) || [],

      // Previous companies data - array format matching database schema
      previousCompanies: relatedData.previousCompanies?.map(company => ({
        id: company.id,
        candidate_id: company.candidate_id,
        company_name: company.company_name || '',
        designation: company.designation || '',
        start_date: company.start_date || null,
        end_date: company.end_date || null,
        salary: company.salary || null,
        offer_letter: company.offer_letter || false,
        offer_letter_reason: company.offer_letter_reason || '',
        payslip: company.payslip || false,
        payslip_reason: company.payslip_reason || '',
        relieving_letter: company.relieving_letter || false,
        relieving_letter_reason: company.relieving_letter_reason || '',
        reason: company.reason || '',
        experience_company_id: company.experience_company_id || null
      })) || [],

      // Additional info data - array format matching database schema
      additional: relatedData.extra?.map(info => ({
        has_two_wheeler: info.has_two_wheeler || false,
        two_wheeler_license: info.two_wheeler_license || false,
        has_laptop: info.has_laptop || false,
        candidate_id: detailedCandidate.id
      })) || [],

      // Add individual fields for EditScoreModal compatibility
      tenthCertificate: relatedData.education?.find(cert => cert.certificate_type === '10th')?.has_certificate,
      tenthCertificateReason: relatedData.education?.find(cert => cert.certificate_type === '10th')?.reason || '',
      twelfthCertificate: relatedData.education?.find(cert => cert.certificate_type === '12th')?.has_certificate,
      twelfthCertificateReason: relatedData.education?.find(cert => cert.certificate_type === '12th')?.reason || '',
      diplomaCertificate: relatedData.education?.find(cert => cert.certificate_type === 'diploma')?.has_certificate,
      diplomaCertificateReason: relatedData.education?.find(cert => cert.certificate_type === 'diploma')?.reason || '',
      ugCertificate: relatedData.education?.find(cert => cert.certificate_type === 'ug')?.has_certificate,
      ugCertificateReason: relatedData.education?.find(cert => cert.certificate_type === 'ug')?.reason || '',
      pgCertificate: relatedData.education?.find(cert => cert.certificate_type === 'pg')?.has_certificate,
      pgCertificateReason: relatedData.education?.find(cert => cert.certificate_type === 'pg')?.reason || '',

      // Additional fields from additional info
      'two-wheeler': relatedData.extra?.[0]?.has_two_wheeler,
      twoWheelerLicense: relatedData.extra?.[0]?.two_wheeler_license,
      licenseExpectedDate: relatedData.extra?.[0]?.license_expected_date,
      laptop: relatedData.extra?.[0]?.has_laptop
    };

    // Merge with any scoring data updates from EditScoreModal
    return { ...baseData, ...scoringDataUpdates };
  };

  const renderNotesSection = () => {
    const mappedData = mapCandidateDataForScoring();
    if (!mappedData) {
      return (
        <div className="space-y-4">
          <div className="text-center text-gray-500 py-8">
            <div>Loading candidate scoring data...</div>
            <div className="text-xs mt-2">
              Detailed Candidate: {detailedCandidate ? 'Available' : 'Missing'}
              <br />
              Related Data: {relatedData ? 'Available' : 'Missing'}
            </div>
          </div>
        </div>
      );
    }

    const handleDataUpdate = async (updatedScoringData) => {
      // If we receive updated scoring data, use it directly
      if (updatedScoringData) {
        // Store the updated scoring data in state to trigger re-render
        setScoringDataUpdates(prev => ({ ...prev, ...updatedScoringData }));
        return;
      }

      // Refresh the candidate data after update
      try {
        // Re-fetch the candidate data to get updated information
        if (selectedCandidate?.id) {
          const updatedCandidate = await candidates.getById(selectedCandidate.id);
          setDetailedCandidate(updatedCandidate);

          // Refresh related data
          const [clientJobsData, educationData, experienceData, additionalData, feedbackData] = await Promise.all([
            clientJobs.getByCandidate(selectedCandidate.id),
            educationCertificates.getByCandidate(selectedCandidate.id),
            experienceCompanies.getByCandidate(selectedCandidate.id),
            additionalInfo.getByCandidate(selectedCandidate.id),
            // Get structured feedback entries from client jobs
            candidateFeedback.getFeedbackByCandidate(selectedCandidate.id).catch(err => {
              return { feedback_entries: [], total_entries: 0 };
            })
          ]);

          setRelatedData({
            clients: clientJobsData || [],
            education: educationData || [],
            experience: experienceData || [],
            extra: additionalData || [],
            feedback: feedbackData || []
          });
        }
      } catch (error) {
        console.error('Error refreshing candidate data:', error);
      }
    };

    return (
      <CandidateScoreDisplay
        formData={mappedData}
        candidateData={candidate}
        onDataUpdate={handleDataUpdate}
      />
    );
  };

  // Calculate match percentage based on candidate skills and job requirements
  const calculateMatchPercentage = (candidate, job) => {
    if (!candidate || !job) return Math.floor(Math.random() * 30) + 70; // Fallback random 70-99%

    let matchScore = 0;
    let totalCriteria = 0;

    // Experience matching (30% weight)
    if (job.experience && candidate.experience) {
      const jobExpRange = job.experience.toLowerCase();
      const candidateExp = parseInt(candidate.experience) || 0;

      // Simple experience matching logic
      if (jobExpRange.includes(candidateExp.toString()) ||
        (candidateExp >= 2 && jobExpRange.includes('2-5')) ||
        (candidateExp >= 5 && jobExpRange.includes('5+'))) {
        matchScore += 30;
      } else if (Math.abs(candidateExp - 3) <= 2) { // Within 2 years of mid-range
        matchScore += 20;
      }
      totalCriteria += 30;
    }

    // Skills matching (40% weight)
    if (job.skills && Array.isArray(job.skills) && candidate.skills) {
      const candidateSkillsStr = typeof candidate.skills === 'string' ? candidate.skills :
        Array.isArray(candidate.skills) ? candidate.skills.join(',') : '';
      const candidateSkills = candidateSkillsStr.toLowerCase().split(',').map(s => s.trim());
      const jobSkills = job.skills.map(s => s.toLowerCase());

      const matchingSkills = jobSkills.filter(skill =>
        candidateSkills.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
      );

      const skillMatchPercentage = (matchingSkills.length / jobSkills.length) * 40;
      matchScore += skillMatchPercentage;
      totalCriteria += 40;
    }

    // Location matching (20% weight)
    if (job.city && candidate.current_location) {
      if (job.city.toLowerCase() === candidate.current_location.toLowerCase() ||
        job.state.toLowerCase() === candidate.current_location.toLowerCase()) {
        matchScore += 20;
      } else {
        matchScore += 10; // Partial match for different city but willing to relocate
      }
      totalCriteria += 20;
    }

    // Industry/designation matching (10% weight)
    if (job.designation && candidate.designation) {
      if (job.designation.toLowerCase().includes(candidate.designation.toLowerCase()) ||
        candidate.designation.toLowerCase().includes(job.designation.toLowerCase())) {
        matchScore += 10;
      }
      totalCriteria += 10;
    }

    // Normalize score to percentage
    const finalScore = totalCriteria > 0 ? Math.round((matchScore / totalCriteria) * 100) : 75;

    // Ensure score is between 65-99%
    return Math.max(65, Math.min(99, finalScore));
  };

  // Fetch job openings
  const fetchJobOpenings = async () => {
    setLoadingJobs(true);
    try {
      const response = await jobOpeningService.getAllJobOpenings();
      const jobsWithMatchScores = response.map(job => ({
        ...job,
        matchScore: calculateMatchPercentage(candidate, job)
      }));

      // Sort by match score descending (show all jobs)
      const sortedJobs = jobsWithMatchScores
        .sort((a, b) => b.matchScore - a.matchScore);

      setJobOpenings(sortedJobs);
    } catch (error) {
      setJobOpenings([]);
    } finally {
      setLoadingJobs(false);
    }
  };


  // Handle job assignment
  const handleAssignJob = async (job) => {
    const candidateId = selectedCandidate?.candidateId || selectedCandidate?.id;
    const clientJobId = selectedCandidate?.clientJobId;
    const candidateName = candidate?.name || candidate?.candidateName || 'this candidate';

    // Check if candidate is already assigned to this client
    const isAlreadyAssigned = relatedData.clients?.some(
      clientJob => clientJob.client_name?.toLowerCase() === job.company_name?.toLowerCase()
    );

    if (isAlreadyAssigned) {
      toast.error(`This candidate is already assigned to ${job.company_name}. Cannot assign to the same client again.`);
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to assign this job "${job.job_title}" to ${candidateName}?`);

    if (confirmed) {
      try {
        // Create assignment data to pass to new tab
        const assignmentData = {
          candidateId: candidateId,
          candidateName: candidateName,
          candidateEmail: candidate?.email,
          candidatePhone: candidate?.phone,
          executiveName: detailedCandidate?.executive_name || selectedCandidate?.executiveName, // Add candidate's executive
          jobId: job.id,
          jobTitle: job.job_title,
          companyName: job.company_name,
          designation: job.designation,
          clientJobId: clientJobId || null,
          ctc: job.ctc,
          experience: job.experience,
          location: `${job.city}, ${job.state}`,
          contactPerson: job.contact_person,
          contactNumber: job.contact_number
        };

        // Open job assignment modal instead of new tab
        setSelectedJobAssignmentData(assignmentData);
        setIsJobAssignmentModalOpen(true);

        // Mark this job as assigned for this specific candidate-client pair
        setJobOpenings(prevJobs =>
          prevJobs.map(j =>
            j.id === job.id
              ? { ...j, isAssigned: true, assignedToClientJob: clientJobId }
              : j
          )
        );
      } catch (error) {
        toast.error('Failed to prepare job assignment. Please try again.');
      }
    }
  };

  // Handle view job details
  const handleViewDetails = (job) => {
    // You can implement a modal or navigation to job details page
    alert(`Job Details:\n\nTitle: ${job.job_title}\nCompany: ${job.company_name}\nDesignation: ${job.designation}\nCTC: ${job.ctc}\nExperience: ${job.experience}\nLocation: ${job.city}, ${job.state}\nContact: ${job.contact_person} (${job.contact_number})\n\nDescription: ${job.short_description}`);
  };

  const renderJobMatchingSection = () => {
    // Filter jobs based on search term
    const filteredJobs = jobOpenings.filter(job => {
      if (!jobSearchTerm.trim()) return true;

      const searchLower = jobSearchTerm.toLowerCase();

      // Combined fields for better search
      const companyCity = `${job.company_name || ''} ${job.city || ''}`.toLowerCase();
      const companyCityState = `${job.company_name || ''} ${job.city || ''} ${job.state || ''}`.toLowerCase();

      return (
        job.job_title?.toLowerCase().includes(searchLower) ||
        job.company_name?.toLowerCase().includes(searchLower) ||
        job.designation?.toLowerCase().includes(searchLower) ||
        job.city?.toLowerCase().includes(searchLower) ||
        job.state?.toLowerCase().includes(searchLower) ||
        job.contact_person?.toLowerCase().includes(searchLower) ||
        companyCity.includes(searchLower) ||
        companyCityState.includes(searchLower)
      );
    });

    return (
      <div className="space-y-3 h-full flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-800">Job Matching Recommendations</h3>

          {/* Search Icon/Input */}
          <div className="flex items-center gap-2">
            {isJobSearchOpen ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={jobSearchTerm}
                  onChange={(e) => setJobSearchTerm(e.target.value)}
                  placeholder="Search jobs..."
                  className="text-xs border border-gray-300 rounded px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsJobSearchOpen(false);
                    setJobSearchTerm('');
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Close search"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsJobSearchOpen(true)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Search jobs"
              >
                <Search className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {loadingJobs ? (
          <div className="text-center py-4">
            <div className="text-sm text-gray-500">Loading job recommendations...</div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-sm text-gray-500">
              {jobSearchTerm ? `No jobs found matching "${jobSearchTerm}"` : 'No job openings available'}
            </div>
          </div>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto scrollbar-desktop max-h-140">
            {filteredJobs.map((job, index) => (
              <div key={job.id || index} className="bg-white border border-gray-200 rounded-lg p-2">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-800">{job.job_title}</h4>
                    <p className="text-gray-500 text-xs">{job.company_name} • {job.designation}</p>
                    <p className="text-gray-500 text-xs">{job.city}, {job.state}</p>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-0.5 rounded-full text-xs font-medium ${job.matchScore >= 90 ? 'bg-green-100 text-green-800' :
                      job.matchScore >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {job.matchScore}%
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Experience:</span>
                    <span className="text-xs font-medium text-gray-800">{job.experience}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Salary Range:</span>
                    <span className="text-xs font-medium text-gray-800">{job.ctc}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Contact Person:</span>
                    <span className="text-xs font-medium text-gray-800">{job.contact_person}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Contact Number:</span>
                    <span className="text-xs font-medium text-gray-800">{job.contact_number}</span>
                  </div>
                </div>

                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleViewDetails(job)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    View Details
                  </button>
                  {/* Only show Assign button if logged-in user is the candidate's executive (account holder) */}
                  {canEditClientJob() && (
                    job.isAssigned && job.assignedToClientJob === selectedCandidate?.clientJobId ? (
                      <button
                        disabled
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded cursor-not-allowed"
                      >
                        Assigned
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAssignJob(job)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Assign
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  const renderRemarksSection = () => {
    // Calculate statistics from actual ClientJob feedback data
    const calculateCandidateStats = () => {
      const stats = {
        interested: 0,
        profileSubmission: 0,
        interviewFixed: 0,
        noShow: 0,
        selected: 0,
        rejected: 0,
        noShowRescheduled: 0,
        joined: 0,
        abscond: 0,
        clients: new Set()
      };

      if (relatedData.clients && relatedData.clients.length > 0) {
        relatedData.clients.forEach(clientJob => {
          // Add client name to set
          if (clientJob.client_name) {
            stats.clients.add(clientJob.client_name);
          }

          // Parse feedback entries to count remarks
          if (clientJob.feedback) {
            const feedbackEntries = clientJob.feedback.split(';;;;;')
              .filter(entry => entry.trim())
              .map(entry => {
                const remarksMatch = entry.match(/Remarks-([^:]+)/);
                return remarksMatch ? remarksMatch[1].trim().toLowerCase() : '';
              })
              .filter(remark => remark);

            // Count each type of remark
            feedbackEntries.forEach(remark => {
              switch (remark) {
                case 'interested':
                  stats.interested++;
                  break;
                case 'profile submission':
                  stats.profileSubmission++;
                  break;
                case 'interview fixed':
                  stats.interviewFixed++;
                  break;
                case 'no show':
                case 'nso':
                  stats.noShow++;
                  break;
                case 'selected':
                  stats.selected++;
                  break;
                case 'rejected':
                  stats.rejected++;
                  break;
                case 'noshow & rescheduled':
                case 'no show & rescheduled':
                  stats.noShowRescheduled++;
                  break;
                case 'joined':
                  stats.joined++;
                  break;
                case 'abscond':
                  stats.abscond++;
                  break;
              }
            });
          }
        });
      }

      return {
        ...stats,
        clientCount: stats.clients.size,
        clientNames: Array.from(stats.clients)
      };
    };

    const candidateStats = calculateCandidateStats();

    // Calculate total interviews from all interview-related activities
    const totalInterviews = candidateStats.interviewFixed + candidateStats.noShow + candidateStats.noShowRescheduled + candidateStats.selected;

    // Calculate overall score based on positive outcomes
    const totalActivities = candidateStats.interested + candidateStats.profileSubmission + candidateStats.interviewFixed +
      candidateStats.noShow + candidateStats.selected + candidateStats.rejected +
      candidateStats.noShowRescheduled + candidateStats.joined + candidateStats.abscond;

    const positiveOutcomes = candidateStats.interested + candidateStats.profileSubmission + candidateStats.interviewFixed +
      candidateStats.selected + candidateStats.joined;

    const overallScore = totalActivities > 0 ? Math.round((positiveOutcomes / totalActivities) * 100) : 0;


    // Sample behavior history - replace with actual data
    const behaviorHistory = [
      { date: '2024-01-15', client: 'Tech Corp', status: 'Selected', remarks: 'Excellent technical skills, good communication' },
      { date: '2024-01-15', client: 'Tech Corp', status: 'Selected', remarks: 'Excellent technical skills, good communication' },

    ];

    // Color function for score-based metrics
    const getScoreColor = (score) => {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-blue-600';
      if (score >= 40) return 'text-yellow-600';
      return 'text-red-600';
    };

    // Status color function for behavior history (keep existing colors)
    const getStatusColor = (status) => {
      switch (status.toLowerCase()) {
        case 'selected': case 'select': return 'text-green-600 bg-green-50';
        case 'joined': return 'text-blue-600 bg-blue-50';
        case 'no show': return 'text-red-600 bg-red-50';
        case 'rejected': case 'reject': return 'text-orange-600 bg-orange-50';
        case 'abscond': return 'text-purple-600 bg-purple-50';
        default: return 'text-gray-600 bg-gray-50';
      }
    };

    // Use call statistics from component level state

    const callAnswered = callStats.answered;
    const callNotAnswered = callStats.notAnswered;
    const totalCalls = callAnswered + callNotAnswered;
    const answeredPercentage = totalCalls > 0 ? (callAnswered / totalCalls) * 100 : 0;
    const notAnsweredPercentage = totalCalls > 0 ? (callNotAnswered / totalCalls) * 100 : 0;

    return (
      <div className="space-y-2">
        {/* Header with Overall Performance Score in right corner */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-semibold text-gray-800">Candidate Remarks</h3>
          <div className="flex items-center gap-2">


          </div>
        </div>

        {/* Call Statistics Card */}
        <div className="bg-gray-50 p-1.5 rounded-lg ">
          <div className="flex items-center justify-between pb-2 ">
            <span className="text-sm font-medium text-gray-800">Total Calls</span>
            <span className="text-sm font-bold text-gray-800">{totalCalls}</span>
          </div>




          {/* Single Horizontal Bar Chart */}
          <div className="w-full bg-gray-200 rounded-full h-4   relative">
            <div className="h-full flex">
              {/* Green segment for answered calls */}
              <div
                className="bg-green-500 transition-all duration-300 flex items-center justify-center hover:bg-green-600 cursor-pointer relative group"
                style={{ width: `${answeredPercentage}%` }}
              >
                {answeredPercentage > 15 && (
                  <span className="text-white text-xs font-bold">
                    {Math.round(answeredPercentage)}%
                  </span>
                )}
                {/* Hover tooltip for answered calls - positioned center to right */}
                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-green-500 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center gap-2 whitespace-nowrap z-50">
                  <Phone className="w-4 h-4" />
                  <span>{callAnswered} </span>
                </div>
              </div>
              {/* Red segment for not answered calls */}
              <div
                className="bg-red-500 transition-all duration-300 flex items-center justify-center hover:bg-red-600 cursor-pointer relative group"
                style={{ width: `${notAnsweredPercentage}%` }}
              >
                {notAnsweredPercentage > 15 && (
                  <span className="text-white text-xs font-bold">
                    {Math.round(notAnsweredPercentage)}%
                  </span>
                )}
                {/* Hover tooltip for not answered calls - positioned center to left */}
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center gap-2 whitespace-nowrap z-50">
                  <PhoneOff className="w-4 h-4" />
                  <span>{callNotAnswered} </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Performance Metrics */}
        <div className="bg-white ">
          {/* Overall Score */}


          {/* Total Interviews */}
          {/* <div className="mb-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm text-gray-800">Total Interviews</h4>
              <span className={`text-lg font-bold ${getScoreColor((totalInterviews / 20) * 100)}`}>
                {totalInterviews}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${totalInterviews >= 16 ? 'bg-green-500' : totalInterviews >= 12 ? 'bg-blue-500' : totalInterviews >= 8 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((totalInterviews / 20) * 100, 100)}%` }}
              />
            </div>
          </div> */}

          {/* Remarks Section */}
          <div className="space-y-1 mb-2">
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-700">Interested</span>
              <span className="text-xs font-bold text-blue-600">{candidateStats.interested}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-700">Profile Submission</span>
              <span className="text-xs font-bold text-cyan-600">{candidateStats.profileSubmission}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-700">Interview Fixed</span>
              <span className="text-xs font-bold text-indigo-600">{candidateStats.interviewFixed}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-700">No Show</span>
              <span className="text-xs font-bold text-red-600">{candidateStats.noShow}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-700">Selected</span>
              <span className="text-xs font-bold text-green-600">{candidateStats.selected}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-700">Rejected</span>
              <span className="text-xs font-bold text-red-600">{candidateStats.rejected}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-700">No Show & Rescheduled</span>
              <span className="text-xs font-bold text-orange-600">{candidateStats.noShowRescheduled}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-700">Joined</span>
              <span className="text-xs font-bold text-green-600">{candidateStats.joined}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-700">Abscond</span>
              <span className="text-xs font-bold text-purple-600">{candidateStats.abscond}</span>
            </div>
          </div>

          {/* Client Section */}
          <div className="bg-gray-50 rounded-lg ">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-700">Total Clients</span>
              <div className="relative group">
                <span className="text-sm font-bold text-teal-600 cursor-help">
                  {candidateStats.clientCount}
                </span>
                {candidateStats.clientNames.length > 0 && (
                  <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50">
                    <div className="bg-gray-800 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                      <div className="font-medium mb-1">Client Names:</div>
                      {candidateStats.clientNames.map((clientName, index) => (
                        <div key={index} className="text-gray-200">
                          • {clientName}
                        </div>
                      ))}
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Behavior History Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-2 ">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Red Alert
          </h4>

          <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-desktop">
            {behaviorHistory.map((entry, index) => (
              <div key={index} className="border-l-4 border-gray-200 pl-4 py-2 px-2 hover:bg-gray-50 rounded-r-lg transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="text-sm font-medium text-gray-800">{entry.client}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{entry.remarks}</p>
                  </div>
                  <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                    {formatDateToDDMMYYYY(entry.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {behaviorHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No Red Alert available</p>
            </div>
          )}
        </div>
      </div>
    );
  };


  const renderSectionContent = () => {
    switch (activeSection) {
      case 'notes':
        return renderNotesSection();
      case 'ratings':
        return renderRemarksSection();
      case 'matching':
        return renderJobMatchingSection();
      default:
        return renderNotesSection();
    }
  };

  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return "";

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const calculateAge = (dobString) => {
    if (!dobString) return "";
    const dob = new Date(dobString);
    if (isNaN(dob)) return "";
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    return age;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-100 rounded-lg shadow-xl w-full h-full lg:h-full flex flex-col overflow-hidden scrollbar-desktop">
        {/* Header Section */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-2 py-0.5">
          <div className="flex items-center justify-between">
            <div className="flex ">
              <div>
                <h1
                  className={`text-md font-semibold cursor-pointer hover:underline transition-colors ${getCandidateNameColorClass(candidate)}`}
                  onClick={handleCandidateNameClick}
                  title="Click to view feedback"
                >
                  {candidate?.name}
                </h1>
                <div className="flex ">
                  <span className={`rounded-full text-xs font-medium ${getStatusColor(candidate?.status)}`}>
                    {candidate?.status}
                  </span>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xs text-gray-600">
                      {candidate?.profileNumber || "Not available"}
                    </h2>
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <div className="bg-green-500 rounded-full w-2 h-2"></div>
                        <div className="absolute top-0 left-0 bg-green-400 rounded-full w-2 h-2 animate-ping"></div>
                      </div>
                      <span className="text-xs text-gray-600">
                        {(() => {
                          // Use assignment-aware executive name
                          const exDisplay = (detailedCandidate?.executive_display || selectedCandidate?.executive_display);
                          if (exDisplay && String(exDisplay).trim()) return exDisplay;
                          const assignmentAwareName = getDisplayExecutiveName(detailedCandidate, selectedCandidate?.selectedClientJob);
                          return employeeNames[assignmentAwareName] || assignmentAwareName || "Not specified";
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="hover:bg-gray-100"
            >
              <Icon name="X" size={20} className="text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="lg:hidden flex border-b border-gray-200 bg-white px-2 sm:px-4">
          {mobileTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMobileTab(tab.id)}
              className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-colors ${activeMobileTab === tab.id
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Desktop Layout - Only show on lg screens and above */}
        <div className="hidden lg:flex flex-1 overflow-y-auto gap-2 lg:gap-3 xl:gap-4 px-2 lg:px-2 xl:px-2 py-2 lg:py-1.5">
          <PanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Candidate Profile */}
            <Panel defaultSize={30} minSize={25}>
              <div className="bg-white border border-gray-200 rounded-lg p-2 flex flex-col h-full overflow-y-auto">
                <div className="flex-1 space-y-2">
                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-2">
                      {/* Header Row */}
                      <div className="flex justify-between items-start">
                        {/* Left: Avatar + Name + Source */}
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-sm font-semibold text-white">
                              {candidate?.name?.split(" ")?.map((n) => n?.[0])?.join("") || "JS"}
                            </span>
                          </div>
                          {isHeaderInfoEditMode ? (
                            <div className="flex flex-col space-y-2">
                              <input
                                type="text"
                                value={headerInfoData.name ?? ""}
                                onChange={(e) => handleHeaderInfoChange("name", e.target.value)}
                                placeholder="Enter name"
                                className="text-md font-bold text-gray-900 border border-gray-300 rounded-lg px-2 py-1 outline-0"
                              />
                              <select
                                value={headerInfoData.source ?? ""}
                                onChange={(e) => handleHeaderInfoChange("source", e.target.value)}
                                className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 bg-white"
                              >
                                <option value="">Select Source</option>
                                {masterData.sources.map(source => (
                                  <option key={source.id} value={source.name}>{source.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center">
                                <h2
                                  className={`text-md font-bold truncate cursor-pointer hover:underline transition-colors ${getCandidateNameColorClass(candidate)}`}
                                  onClick={handleCandidateNameClick}
                                  title={(() => {
                                    // Get the first client job or use an empty object if none exists
                                    const clientJob = candidate.client_jobs?.[0] || {};
                                    const remarks = (clientJob.effective_remark || clientJob.remarks || '').toLowerCase();
                                    const remarkSource = clientJob.remark_source;
                                    const hasClaimedRevenue = Array.isArray(candidate.candidaterevenue) &&
                                      candidate.candidaterevenue.some(rev => {
                                        return rev.revenue_status?.toLowerCase() === 'claimed';
                                      });

                                    return (remarkSource === 'profilestatus' && remarks === 'joined' && hasClaimedRevenue)
                                      ? 'Cleared'
                                      : 'Click to view feedback and details';
                                  })()}
                                >
                                  {candidate?.name || "Not specified"}
                                </h2>
                                {(() => {
                                  // Get the first client job or use an empty object if none exists
                                  const clientJob = candidate.client_jobs?.[0] || {};
                                  const remarks = (clientJob.effective_remark || clientJob.remarks || '').toLowerCase();
                                  const remarkSource = clientJob.remark_source;
                                  const hasClaimedRevenue = Array.isArray(candidate.candidaterevenue) &&
                                    candidate.candidaterevenue.some(rev => {
                                      return rev.revenue_status?.toLowerCase() === 'claimed';
                                    });

                                  if (remarkSource === 'profilestatus' && remarks === 'joined' && hasClaimedRevenue) {
                                    return (
                                      <span className="inline-flex items-center ml-1">
                                        {[...Array(3)].map((_, i) => (
                                          <img
                                            key={i}
                                            src="/money.png"
                                            alt="Cash"
                                            className="w-5 h-5"
                                            style={{ display: 'inline-block' }}
                                          />
                                        ))}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <p className="flex items-center gap-1 bg-green-200 rounded-full font-medium text-green-600 px-2 py-0.5 text-xs">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-600"></span>
                                {candidate?.source || "Not specified"}
                              </p>
                            </div>
                          )}

                        </div>

                        {/* Right: Call Not Answered Button + Edit / Save / Cancel */}
                        {isHeaderInfoEditMode ? (
                          <div className="flex space-x-1">
                            <button
                              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700"
                              onClick={handleSaveHeaderInfo}
                            >
                              Save
                            </button>
                            <button
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200"
                              onClick={handleCancelHeaderInfo}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {/* Only show Edit button if logged-in user is the candidate's executive (account holder) */}
                            {canEditClientJob() && (
                              <Pencil
                                className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-600"
                                onClick={handleStartHeaderInfoEdit}
                              />
                            )}
                            {/* <button
                              onClick={handleCallAnswered}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-md font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                              title="Call Answered"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCallNotAnswered}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded-md font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                              title="Call Not Answered"
                            >
                              <PhoneOff className="w-4 h-4" />
                            </button> */}
                          </div>
                        )}
                      </div>

                      {/* Details Section */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {isHeaderInfoEditMode ? (
                          <>
                            {(() => {
                              // Get the masked version of the phone number for display
                              const displayPhone1 = getDisplayMobileNumber(
                                headerInfoData.phone,
                                joinedMobiles, // Pass the joinedMobiles Map from the component scope
                                candidate?.candidaterevenue || [],
                                globalJoiningDates // Pass the globalJoiningDates from the component scope
                              );
                              const isPhone1Masked = displayPhone1.includes('x');

                              return (
                                <input
                                  type="tel"
                                  value={isPhone1Masked ? displayPhone1 : (headerInfoData.phone ?? "")}
                                  onChange={(e) => handleHeaderInfoChange("phone", e.target.value)}
                                  placeholder="Phone 1"
                                  className={`text-xs border ${isPhone1Masked ? 'bg-gray-100 cursor-not-allowed' : ''} border-gray-300 rounded-lg px-2 py-1 outline-0 w-full`}
                                  disabled={isPhone1Masked}
                                  title={isPhone1Masked ? "Cannot edit masked phone number" : ""}
                                />
                              );
                            })()}
                            {(() => {
                              // Get the masked version of the phone number for display
                              const displayPhone2 = getDisplayMobileNumber(
                                headerInfoData.mobile2,
                                joinedMobiles, // Pass the joinedMobiles Map from the component scope
                                candidate?.candidaterevenue || [],
                                globalJoiningDates // Pass the globalJoiningDates from the component scope
                              );
                              const isPhone2Masked = displayPhone2.includes('x');

                              return (
                                <input
                                  type="tel"
                                  value={isPhone2Masked ? displayPhone2 : (headerInfoData.mobile2 ?? "")}
                                  onChange={(e) => handleHeaderInfoChange("mobile2", e.target.value)}
                                  placeholder="Phone 2"
                                  className={`text-xs border ${isPhone2Masked ? 'bg-gray-100 cursor-not-allowed' : ''} border-gray-300 rounded-lg px-2 py-1 outline-0 w-full`}
                                  disabled={isPhone2Masked}
                                  title={isPhone2Masked ? "Cannot edit masked phone number" : ""}
                                />
                              );
                            })()}
                            <input
                              type="email"
                              value={headerInfoData.email ?? ""}
                              onChange={(e) => handleHeaderInfoChange("email", e.target.value)}
                              placeholder="Email"
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full col-span-2"
                            />
                            <CustomDropdown
                              value={headerInfoData.state}
                              onChange={(selected) => {
                                const stateValue = selected ? selected.value : '';
                                handleHeaderInfoChange("state", stateValue);
                                // Clear city when state changes
                                if (stateValue !== headerInfoData.state) {
                                  handleHeaderInfoChange("city", '');
                                }
                              }}
                              options={headerInfoData.country ? getStatesByCountry(headerInfoData.country) : locationData.states || []}
                              placeholder="Select State"
                              isSearchable={true}
                              isClearable={true}
                              isDisabled={locationLoading}
                              className="text-xs w-full"
                            />
                            <CustomDropdown
                              value={headerInfoData.city}
                              onChange={(selected) => {
                                const cityValue = selected ? selected.value : '';
                                handleHeaderInfoChange("city", cityValue);
                              }}
                              options={headerInfoData.state ? getCitiesByState(headerInfoData.state) : locationData.cities || []}
                              placeholder="Select City"
                              isSearchable={true}
                              isClearable={true}
                              isDisabled={locationLoading || !headerInfoData.state}
                              className="text-xs w-full"
                            />
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 text-xs text-gray-700 relative">
                              <button
                                className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 border border-gray-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isWaOpen) { setIsWaOpen(false); return; }
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setWaMenuPos({ x: rect.left, y: rect.bottom });
                                  setIsWaOpen(true);
                                }}
                                title={(() => {
                                  const phone1 = candidate?.phone;
                                  const cr = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                                  const d1 = getDisplayMobileNumber(phone1, joinedMobiles, cr, globalJoiningDates);
                                  const m1 = d1?.includes('x') || false;
                                  return getPhoneHoverTitle(phone1, candidate, m1, joinedMobiles, globalJoiningDates);
                                })()}
                              >
                                <Phone className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                              {(() => {
                                const phone1 = candidate?.phone;
                                const cr = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                                const d1 = getDisplayMobileNumber(phone1, joinedMobiles, cr, globalJoiningDates);
                                const v1 = phone1 && phone1 !== '-' && typeof phone1 === 'string' && phone1.toLowerCase() !== 'null' && phone1.toLowerCase() !== 'nill' && phone1.toLowerCase() !== 'nil' && phone1.trim() !== '';
                                const m1 = d1?.includes('x') || false;
                                const h1 = getPhoneHoverTitle(phone1, candidate, m1, joinedMobiles, globalJoiningDates);
                                return v1 ? (
                                  <span className={`${m1 ? 'text-gray-400' : ''}`} title={h1}>{d1}</span>
                                ) : (
                                  <span className="text-gray-700" title={h1}>-</span>
                                );
                              })()}
                              {(() => {
                                const phone2 = candidate?.mobile2;
                                const cr = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                                const d2 = getDisplayMobileNumber(phone2, joinedMobiles, cr, globalJoiningDates);
                                const v2 = phone2 && phone2 !== '-' && typeof phone2 === 'string' && phone2.toLowerCase() !== 'null' && phone2.toLowerCase() !== 'nill' && phone2.toLowerCase() !== 'nil' && phone2.trim() !== '';
                                const m2 = d2?.includes('x') || false;
                                const h2 = getPhoneHoverTitle(phone2, candidate, m2, joinedMobiles, globalJoiningDates);
                                return v2 ? (
                                  <>
                                    <span className="mx-1 text-gray-400">/</span>
                                    <span className={`${m2 ? 'text-gray-400' : ''}`} title={h2}>{d2}</span>
                                  </>
                                ) : null;
                              })()}
                              {(() => {
                                const phone1 = candidate?.phone;
                                const phone2 = candidate?.mobile2;
                                const cr = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                                const d1 = getDisplayMobileNumber(phone1, joinedMobiles, cr, globalJoiningDates);
                                const d2 = getDisplayMobileNumber(phone2, joinedMobiles, cr, globalJoiningDates);
                                const v1 = phone1 && phone1 !== '-' && typeof phone1 === 'string' && phone1.toLowerCase() !== 'null' && phone1.toLowerCase() !== 'nill' && phone1.toLowerCase() !== 'nil' && phone1.trim() !== '';
                                const v2 = phone2 && phone2 !== '-' && typeof phone2 === 'string' && phone2.toLowerCase() !== 'null' && phone2.toLowerCase() !== 'nill' && phone2.toLowerCase() !== 'nil' && phone2.trim() !== '';
                                const m1 = d1?.includes('x') || false;
                                const m2 = d2?.includes('x') || false;
                                if (!isWaOpen) return null;
                                return (
                                  <div className="fixed z-50 bg-white border border-gray-200 rounded shadow-md py-1 text-xs" style={{ left: waMenuPos.x, top: waMenuPos.y }}>
                                    {v1 ? (
                                      <div
                                        className={`${m1 ? 'text-gray-400 cursor-not-allowed px-3 py-1' : 'px-3 py-1 hover:bg-gray-50 cursor-pointer text-green-600'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (m1) {
                                            const clientName = candidate?.clientJob?.clientName || candidate?.selectedClientJob?.clientName || 'Unknown Client';
                                            const profileStatus = candidate?.selectedClientJob?.profilestatus || '';
                                            const joiningDate = (candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue)?.[0]?.joining_date;

                                            let errorMessage = `${candidate?.candidateName || 'This candidate'}'s number is not available`;

                                            if (profileStatus === 'Joined' && joiningDate && joiningDate !== "0000-00-00") {
                                              const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
                                              errorMessage = `${candidate?.candidateName} joined on ${formattedDate} in ${clientName}. Don't call.`;
                                            } else if (profileStatus === 'Abscond' && joiningDate && joiningDate !== "0000-00-00") {
                                              const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
                                              errorMessage = `${candidate?.candidateName} absconded from ${clientName} on ${formattedDate}. Don't call.`;
                                            } else if (profileStatus === 'Selected') {
                                              errorMessage = `${candidate?.candidateName} is selected in ${clientName}. Don't call.`;
                                            }

                                            toast.error(errorMessage);
                                            return;
                                          }
                                          const num = (phone1 || '').replace(/\D/g, '');
                                          if (!num) { toast.error('Invalid number'); return; }
                                          window.open(`https://wa.me/91${num}`, '_blank');
                                          setIsWaOpen(false);
                                        }}
                                      >
                                        {`P1:${m1 ? d1 : (phone1 || '').replace(/\D/g, '')}`}
                                      </div>
                                    ) : null}
                                    {v2 ? (
                                      <div
                                        className={`${m2 ? 'text-gray-400 cursor-not-allowed px-3 py-1' : 'px-3 py-1 hover:bg-gray-50 cursor-pointer text-green-600'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (m2) {
                                            const clientName = candidate?.clientJob?.clientName || candidate?.selectedClientJob?.clientName || 'Unknown Client';
                                            const profileStatus = candidate?.selectedClientJob?.profilestatus || '';
                                            const joiningDate = (candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue)?.[0]?.joining_date;

                                            let errorMessage = `${candidate?.candidateName || 'This candidate'}'s number is not available`;

                                            if (profileStatus === 'Joined' && joiningDate && joiningDate !== "0000-00-00") {
                                              const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
                                              errorMessage = `${candidate?.candidateName} joined on ${formattedDate} in ${clientName}. Don't call.`;
                                            } else if (profileStatus === 'Abscond' && joiningDate && joiningDate !== "0000-00-00") {
                                              const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
                                              errorMessage = `${candidate?.candidateName} absconded from ${clientName} on ${formattedDate}. Don't call.`;
                                            } else if (profileStatus === 'Selected') {
                                              errorMessage = `${candidate?.candidateName} is selected in ${clientName}. Don't call.`;
                                            }

                                            toast.error(errorMessage);
                                            return;
                                          }
                                          const num = (phone2 || '').replace(/\D/g, '');
                                          if (!num) { toast.error('Invalid number'); return; }
                                          window.open(`https://wa.me/91${num}`, '_blank');
                                          setIsWaOpen(false);
                                        }}
                                      >
                                        {`P2: ${m2 ? d2 : (phone2 || '').replace(/\D/g, '')}`}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-700">
                              <SquareArrowOutUpRight
                                className="w-3 h-3 text-gray-400 cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => openEmail(candidate?.email)}
                                title="Open Email"
                              />
                              <span
                                className="cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => openEmail(candidate?.email)}
                                title="Open Email"
                              >
                                {candidate?.email || "Not specified"}
                              </span>
                            </div>
                            <DetailItem label="City" value={candidate?.city || "Not specified"} />
                            <DetailItem label="State" value={candidate?.state || "Not specified"} />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Basic Information
                        </h3>
                        {isBasicInfoEditMode && !isJobAssignmentContext ? (
                          <div className="flex space-x-2">
                            <button
                              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={handleSaveBasicInfo}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-400 transition-colors"
                              onClick={handleCancelBasicInfo}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : !isJobAssignmentContext ? (
                          <Pencil
                            className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={handleStartBasicInfoEdit}
                          />
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <div className="space-y-2">
                          {isBasicInfoEditMode && !isJobAssignmentContext ? (
                            <>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Experience</p>
                                <select
                                  value={basicInfoData.experience}
                                  onChange={(e) => handleBasicInfoChange("experience", e.target.value)}
                                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                                >
                                  <option value="">Select experience</option>
                                  {masterData.experiences.map(experience => (
                                    <option key={experience.id} value={experience.name}>
                                      {experience.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">C-CTC</p>
                                <input
                                  type="text"
                                  value={formattedCurrentCTC}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, '');
                                    if (!isNaN(raw) || raw === '') {
                                      handleBasicInfoChange("currentCTC", raw);
                                    }
                                  }}
                                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                                  placeholder="Current CTC"
                                />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Skills</p>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    {Array.isArray(basicInfoData.skills) ? basicInfoData.skills.map((skill, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                      >
                                        {skill}
                                        <button
                                          type="button"
                                          onClick={() => handleTagChange('skills', skill, 'remove')}
                                          className="ml-1 text-green-600 hover:text-green-800"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    )) : null}
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Add skill and press Enter"
                                    className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleTagChange('skills', e.target.value, 'add');
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">DOB</p>
                                <input
                                  type="date"
                                  value={basicInfoData.dateOfBirth}
                                  onChange={(e) => handleBasicInfoChange("dateOfBirth", e.target.value)}
                                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                  max={(() => {
                                    const today = new Date();
                                    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                                    return maxDate.toISOString().split("T")[0];
                                  })()}
                                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                                />
                                {basicInfoData.dateOfBirth && (
                                  <p className="text-xs text-gray-500 mt-1">Age: {calculateAgeFromDate(basicInfoData.dateOfBirth)} years</p>
                                )}
                              </div>

                            </>
                          ) : (
                            <>
                              <DetailItem label="Experience" value={candidate?.experience || "Not specified"} />
                              <DetailItem label="C-CTC" value={relatedData.clients[0]?.current_ctc ? formatCurrency(relatedData.clients[0].current_ctc) : "Not specified"} />
                              <TagItem label="Skills" items={candidate?.skills} type="skills" />
                              <DetailItem label="DOB" value={candidate?.dateOfBirth ? formatDateToDDMMYYYY(candidate.dateOfBirth) : "Not specified"} />

                            </>
                          )}
                        </div>
                        <div className="space-y-2">
                          {isBasicInfoEditMode && !isJobAssignmentContext ? (
                            <>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Education</p>
                                <select
                                  value={basicInfoData.educationLevel}
                                  onChange={(e) => handleBasicInfoChange("educationLevel", e.target.value)}
                                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                                >
                                  <option value="">Select education</option>
                                  {masterData.educations.map(education => (
                                    <option key={education.id} value={education.name}>
                                      {education.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">E-CTC</p>
                                <input
                                  type="text"
                                  value={formattedExpectedCTC}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, '');
                                    if (!isNaN(raw) || raw === '') {
                                      handleBasicInfoChange("expectedCTC", raw);
                                    }
                                  }}
                                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                                  placeholder="Expected CTC"
                                />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Languages</p>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    {Array.isArray(basicInfoData.languages) ? basicInfoData.languages.map((language, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                      >
                                        {language}
                                        <button
                                          type="button"
                                          onClick={() => handleTagChange('languages', language, 'remove')}
                                          className="ml-1 text-blue-600 hover:text-blue-800"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    )) : null}
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Add language and press Enter"
                                    className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleTagChange('languages', e.target.value, 'add');
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Age</p>
                                <p className="text-xs font-medium text-gray-800">
                                  {basicInfoData.dateOfBirth ? calculateAgeFromDate(basicInfoData.dateOfBirth) : "Not specified"} years
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Gender</p>
                                <select
                                  value={basicInfoData.gender}
                                  onChange={(e) => handleBasicInfoChange("gender", e.target.value)}
                                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                                >
                                  <option value="">Select gender</option>
                                  {masterData.genders.map(gender => (
                                    <option key={gender.id} value={gender.name}>
                                      {gender.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </>
                          ) : (
                            <>
                              <DetailItem label="Education" value={candidate?.educationLevel || "Not specified"} />
                              <DetailItem label="E-CTC" value={relatedData.clients[0]?.expected_ctc ? formatCurrency(relatedData.clients[0].expected_ctc) : "Not specified"} />
                              <TagItem label="Languages" items={candidate?.languages} type="languages" />
                              <DetailItem label="Age" value={candidate?.dateOfBirth ? calculateAge(candidate.dateOfBirth) : "Not specified"} />
                              <DetailItem label="Gender" value={candidate?.gender || "Not specified"} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      profile Creation
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <p className='text-xs text-gray-500'>Created-At: <span className='font-semibold text-gray-800'>{candidate?.createdAt ? formatDateToDDMMYYYY(candidate.createdAt) : 'Not available'}</span></p>
                      <p className='text-xs text-gray-500'>Updated-At: <span className='font-semibold text-gray-800'>{candidate?.updatedAt ? formatDateToDDMMYYYY(candidate.updatedAt) : 'Not available'}</span></p>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-2">
                    {/* Header with Edit icon / Save-Cancel */}
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Client Job Details
                      </h3>
                      {isEditMode ? (
                        <div className="flex space-x-2">
                          <button
                            className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
                            onClick={handleSave}
                          >
                            Save
                          </button>
                          <button
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                            onClick={handleCancel}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        // <Pencil
                        //   className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-600 transition-colors"
                        //   onClick={() => setIsEditMode(true)}
                        // />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleCallAnswered}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded-md font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                            title="Call Answered"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCallNotAnswered}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded-md font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                            title="Call Not Answered"
                          >
                            <PhoneOff className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className={`space-y-3 ${isEditMode ? 'overflow-y-auto max-h-48' : ''}`}>
                      {/* Grid Layout inside resizable panel */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Row 1: Client + Designation */}
                        <StatusItem
                          label="Client"
                          value={formData.clientName}
                          isEditMode={isEditMode || isClientNameEditable}
                          isFieldEditable={isClientNameEditable}
                          onToggleEdit={setIsClientNameEditable}
                          onChange={(val) => handleChange("clientName", val)}
                          type="select"
                          isSubmitting={isSubmitting}
                          options={[
                            "", "Apple", "Microsoft", "Google", "TCS", "Infosys",
                            "Wipro", "Accenture", "IBM", "Cognizant", "HCL"
                          ]}
                        />
                        <StatusItem
                          label="Designation"
                          value={formData.designation}
                          isEditMode={isEditMode || isDesignationEditable}
                          isFieldEditable={isDesignationEditable}
                          onToggleEdit={setIsDesignationEditable}
                          onChange={(val) => handleChange("designation", val)}
                          type="select"
                          isSubmitting={isSubmitting}
                          options={["", ...masterData.designations.map(designation => designation.name)]}
                        />
                      </div>

                      {/* CTC Row */}
                      {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <StatusItem
                          label="C-CTC"
                          value={formData.currentCtc}
                          isEditMode={isEditMode}
                          onChange={(val) => handleChange("currentCtc", val)}
                          type="text"
                        />
                        <StatusItem
                          label="E-CTC"
                          value={formData.expectedCtc}
                          isEditMode={isEditMode}
                          onChange={(val) => handleChange("expectedCtc", val)}
                          type="text"
                        />
                      </div> */}

                      <div className="grid grid-cols-1 sm:grid-cols-2  gap-3">
                        {/* Row 3: Profile Submitted + Date */}
                        <StatusItem
                          label="Profile Submitted"
                          value={formData.profileSubmission}
                          isEditMode={isEditMode}
                          onChange={(val) => handleChange("profileSubmission", val)}
                          type="select"
                          isSubmitting={isSubmitting}
                          options={["No", "Yes"]}
                        />
                        {formData.profileSubmission === "Yes" && (
                          <StatusItem
                            label="Submission Date"
                            value={formData.profileSubmissionDate}
                            isEditMode={isEditMode}
                            onChange={(val) => handleChange("profileSubmissionDate", val)}
                            type="date"
                            isSubmitting={isSubmitting}
                            formatDateToDDMMYYYY={formatDateToDDMMYYYY}
                          />
                        )}
                      </div>

                      <div className='grid grid-cols-1 sm:grid-cols-2  gap-3'>
                        <StatusItem
                          label="Attended"
                          value={formData.attend === 1 || formData.attend === true || formData.attend === '1' || formData.attend === 'Yes' ? "Yes" : "No"}
                          isEditMode={isEditMode}
                          onChange={(val) => handleChange("attend", val === "Yes" ? 1 : 0)}
                          type="select"
                          isSubmitting={isSubmitting}
                          options={["No", "Yes"]}
                        />
                        <StatusItem
                          label="Attended Date"
                          value={formData.attendDate}
                          isEditMode={isEditMode}
                          onChange={(val) => handleChange("attendDate", val)}
                          type="date"
                          isSubmitting={isSubmitting}
                          formatDateToDDMMYYYY={formatDateToDDMMYYYY}
                        />
                      </div>

                      <div
                        className={`grid grid-cols-1 ${isEditMode ? "sm:grid-cols-3" : "sm:grid-cols-2"
                          } gap-3`}
                      >
                        {/* Row 2: Remarks + NFD + Interview Date */}
                        <StatusItem
                          label="Remarks"
                          value={formData.remarks}
                          isEditMode={isEditMode}
                          onChange={(val) => handleChange("remarks", val)}
                          type="select"
                          isSubmitting={isSubmitting}
                          options={["Select", ...masterData.remarks.map(remark => remark.name)]}
                        />

                        {(() => {
                          const { showNextFollowUp, showInterviewDate, showJoiningDate } = getDateFieldsForRemark(formData.remarks);
                          return (
                            <>
                              {showNextFollowUp && (
                                <StatusItem
                                  label="NFD"
                                  value={formData.nextFollowUpDate}
                                  isEditMode={isEditMode}
                                  onChange={(val) => handleChange("nextFollowUpDate", val)}
                                  type="date"
                                  isSubmitting={isSubmitting}
                                  formatDateToDDMMYYYY={formatDateToDDMMYYYY}
                                />
                              )}
                              {showInterviewDate && (
                                <StatusItem
                                  label="Interview Date"
                                  value={formData.interviewFixedDate}
                                  isEditMode={isEditMode}
                                  onChange={(val) => handleChange("interviewFixedDate", val)}
                                  type="date"
                                  isSubmitting={isSubmitting}
                                  formatDateToDDMMYYYY={formatDateToDDMMYYYY}
                                />
                              )}
                              {showJoiningDate && (
                                <StatusItem
                                  label="Expected Joining Date"
                                  value={formData.expectedJoiningDate}
                                  isEditMode={isEditMode}
                                  onChange={(val) => handleChange("expectedJoiningDate", val)}
                                  type="date"
                                  isSubmitting={isSubmitting}
                                  formatDateToDDMMYYYY={formatDateToDDMMYYYY}
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>



                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Feedback: Full Width */}
                        <div className="sm:col-span-2 xl:col-span-3">
                          <StatusItem
                            label="Feedback"
                            value={isEditMode ? formData.feedback : (formData.feedback || "No feedback yet")}
                            isEditMode={isEditMode}
                            onChange={(val) => handleChange("feedback", val)}
                            type="textarea"
                            isSubmitting={isSubmitting}
                            fullWidth
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            </Panel>
            <PanelResizeHandle className="w-2 bg-gray-50 hover:bg-gray-200 transition-colors cursor-col-resize" />
            {/* Middle Panel - Resume Viewer */}
            <Panel defaultSize={30} minSize={25}>
              <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3 flex flex-col h-full">
                <div className="flex-1 overflow-hidden">
                  {pdfUrl ? (
                    <div className="w-full h-full">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                        <h3 className="text-sm sm:text-base font-medium text-gray-900">Resume Preview</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="text-xs text-gray-500">
                            Uploaded: {candidate?.updatedAt ? formatDateToDDMMYYYY(candidate.updatedAt) : 'Not available'}
                          </div>
                          <button
                            onClick={handleReplaceResume}
                            className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 underline self-start sm:self-auto"
                          >
                            Replace Resume
                          </button>
                        </div>
                      </div>
                      <iframe
                        title="Resume Preview"
                        src={pdfUrl}
                        className="w-full h-full rounded border"
                        onError={() => {
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className={`p-4 sm:p-6 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center h-full ${isDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'
                        }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="text-center">
                        <UploadIcon className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                        <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">Upload Resume</h3>
                        <p className="mt-1 text-xs sm:text-sm text-gray-500">Drag and drop PDF here, or click to browse</p>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          id="resume-upload"
                          onChange={handleFileUpload}
                        />
                        <label
                          htmlFor="resume-upload"
                          className="mt-2 inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                        >
                          Select File
                        </label>
                        {uploadError && (
                          <p className="mt-2 text-xs text-red-600">{uploadError}</p>
                        )}
                        {uploadedFile && (
                          <div className="mt-3 flex items-center justify-center gap-2">
                            <span className="text-xs text-gray-700 truncate max-w-[60%]">
                              {uploadedFile.name}
                            </span>
                            <button
                              type="button"
                              onClick={handleClearUpload}
                              className="text-xs text-indigo-600 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
            <PanelResizeHandle className="w-2 bg-gray-50 hover:bg-gray-200 transition-colors cursor-col-resize" />
            {/* Right Panel - Evaluation & Scores */}
            <Panel defaultSize={20} minSize={15}>
              <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3 flex flex-col h-full">
                <div className="border-b border-gray-200 bg-white mb-2">
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {sections?.map((section) => {
                      const isActive = activeSection === section?.id
                      return (
                        <Button
                          key={section?.id}
                          size="sm"
                          onClick={() => setActiveSection(section?.id)}
                          iconName={section?.icon}
                          iconPosition="left"
                          className={twMerge(
                            "flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium transition",
                            isActive
                              ? "bg-indigo-600 text-white"
                              : "bg-indigo-100 text-gray-700 hover:bg-indigo-600 hover:text-white mb-1"
                          )}
                        >
                          <span className="hidden sm:inline">{section?.label}</span>
                          <span className="lg:hidden">{section?.label.split(' ')[0]}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex-1">
                  {renderSectionContent()}
                </div>
              </div>
            </Panel>

          </PanelGroup>
        </div>

        {/* Mobile/Tablet Layout - Only show active tab content */}
        <div className="lg:hidden flex-1 overflow-auto px-2 sm:px-4 py-2 sm:py-3">
          {activeMobileTab === "profile" && (
            <div className="w-full">
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-4">
                  <div className="space-y-2">
                    {/* Mobile Layout */}
                    <div className="sm:hidden space-y-1.5">
                      {/* Header with Edit functionality */}
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Profile
                        </h3>
                        {isHeaderInfoEditMode && !isJobAssignmentContext ? (
                          <div className="flex space-x-2">
                            <button
                              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
                              onClick={handleSaveHeaderInfo}
                            >
                              Save
                            </button>
                            <button
                              className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-400 transition-colors"
                              onClick={handleCancelHeaderInfo}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : !isJobAssignmentContext ? (
                          <Pencil
                            className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-600"
                            onClick={handleStartHeaderInfoEdit}
                          />
                        ) : null}
                      </div>

                      {isHeaderInfoEditMode ? (
                        <div className="space-y-3">
                          {/* Name */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Name</p>
                            <input
                              type="text"
                              value={headerInfoData.name ?? ""}
                              onChange={(e) => handleHeaderInfoChange("name", e.target.value)}
                              placeholder="Enter name"
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                            />
                          </div>

                          {/* Source */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Source</p>
                            <input
                              type="text"
                              value={headerInfoData.source ?? ""}
                              onChange={(e) => handleHeaderInfoChange("source", e.target.value)}
                              placeholder="Source"
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                            />
                          </div>

                          {/* Phone 1 */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Phone 1</p>
                            <input
                              type="tel"
                              value={headerInfoData.phone ?? ""}
                              onChange={(e) => handleHeaderInfoChange("phone", e.target.value)}
                              placeholder="Phone 1"
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                            />
                          </div>

                          {/* Phone 2 */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Phone 2</p>
                            <input
                              type="tel"
                              value={headerInfoData.mobile2 ?? ""}
                              onChange={(e) => handleHeaderInfoChange("mobile2", e.target.value)}
                              placeholder="Phone 2"
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                            />
                          </div>

                          {/* Email */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                            <input
                              type="email"
                              value={headerInfoData.email ?? ""}
                              onChange={(e) => handleHeaderInfoChange("email", e.target.value)}
                              placeholder="Enter email"
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                            />
                          </div>

                          {/* City */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">City</p>
                            <input
                              type="text"
                              value={headerInfoData.city ?? ""}
                              onChange={(e) => handleHeaderInfoChange("city", e.target.value)}
                              placeholder="Enter city"
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                            />
                          </div>

                          {/* State */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">State</p>
                            <input
                              type="text"
                              value={headerInfoData.state ?? ""}
                              onChange={(e) => handleHeaderInfoChange("state", e.target.value)}
                              placeholder="Enter state"
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Profile pic + Name + Source */}
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-lg font-semibold text-white">
                                {candidate?.name?.split(' ')?.map(n => n?.[0])?.join('') || "JS"}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h2
                                className={`text-sm font-bold cursor-pointer hover:underline transition-colors ${getCandidateNameColorClass(candidate)}`}
                                onClick={handleCandidateNameClick}
                                title="Click to view feedback"
                              >
                                {candidate?.name || "Not specified"}
                              </h2>
                              <p className="flex items-center gap-1 bg-green-200 rounded-full font-medium text-green-600 px-2 py-0.5 text-xs mt-1 w-fit">
                                <span className="inline-block rounded-full w-2 h-2 bg-green-600"></span>
                                <span className="truncate">{candidate?.source || "Not specified"}</span>
                              </p>
                            </div>
                          </div>

                          {/* Phone Number */}
                          <div className="flex items-center space-x-2 text-xs relative">
                            <button
                              className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isWaOpen) {
                                  setIsWaOpen(false);
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                setWaMenuPos({ x: rect.left, y: rect.bottom });
                                setIsWaOpen(true);
                              }}
                              title={(() => {
                                const phone1 = candidate?.phone;
                                const cr = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                                const d1 = getDisplayMobileNumber(phone1, joinedMobiles, cr, globalJoiningDates);
                                const m1 = d1?.includes('x') || false;
                                return getPhoneHoverTitle(phone1, candidate, m1, joinedMobiles, globalJoiningDates);
                              })()}
                            >
                              <Phone className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            {(() => {
                              const phone1 = candidate?.phone;
                              const candidaterevenue = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                              const displayPhone1 = getDisplayMobileNumber(phone1, joinedMobiles, candidaterevenue, globalJoiningDates);
                              const isValid1 = phone1 && phone1 !== '-' && typeof phone1 === 'string' && phone1.toLowerCase() !== 'null' && phone1.toLowerCase() !== 'nill' && phone1.toLowerCase() !== 'nil' && phone1.trim() !== '';
                              const isMasked1 = displayPhone1?.includes('x') || false;
                              const hover1 = getPhoneHoverTitle(phone1, candidate, isMasked1, joinedMobiles, globalJoiningDates);
                              return isValid1 ? (
                                <span className={`${isMasked1 ? 'text-gray-400' : ''}`} title={hover1}>{displayPhone1}</span>
                              ) : (
                                <span className="text-gray-700" title={hover1}>-</span>
                              );
                            })()}
                            {(() => {
                              const phone2 = candidate?.mobile2;
                              const candidaterevenue = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                              const displayPhone2 = getDisplayMobileNumber(phone2, joinedMobiles, candidaterevenue, globalJoiningDates);
                              const isValid2 = phone2 && phone2 !== '-' && typeof phone2 === 'string' && phone2.toLowerCase() !== 'null' && phone2.toLowerCase() !== 'nill' && phone2.toLowerCase() !== 'nil' && phone2.trim() !== '';
                              const isMasked2 = displayPhone2?.includes('x') || false;
                              const hover2 = getPhoneHoverTitle(phone2, candidate, isMasked2, joinedMobiles, globalJoiningDates);
                              return isValid2 ? (
                                <>
                                  <span className="text-gray-400">/</span>
                                  <span className={`${isMasked2 ? 'text-gray-400' : ''}`} title={hover2}>{displayPhone2}</span>
                                </>
                              ) : null;
                            })()}
                            {(() => {
                              const phone1 = candidate?.phone;
                              const phone2 = candidate?.mobile2;
                              const candidaterevenue = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                              const d1 = getDisplayMobileNumber(phone1, joinedMobiles, candidaterevenue, globalJoiningDates);
                              const d2 = getDisplayMobileNumber(phone2, joinedMobiles, candidaterevenue, globalJoiningDates);
                              const isValid1 = phone1 && phone1 !== '-' && typeof phone1 === 'string' && phone1.toLowerCase() !== 'null' && phone1.toLowerCase() !== 'nill' && phone1.toLowerCase() !== 'nil' && phone1.trim() !== '';
                              const isValid2 = phone2 && phone2 !== '-' && typeof phone2 === 'string' && phone2.toLowerCase() !== 'null' && phone2.toLowerCase() !== 'nill' && phone2.toLowerCase() !== 'nil' && phone2.trim() !== '';
                              const isMasked1 = d1?.includes('x') || false;
                              const isMasked2 = d2?.includes('x') || false;
                              if (!isWaOpen) return null;
                              return (
                                <div className="fixed z-50 bg-white border border-gray-200 rounded shadow-md py-1 text-xs" style={{ left: waMenuPos.x, top: waMenuPos.y }}>
                                  {isValid1 ? (
                                    <div
                                      className={`${isMasked1 ? 'text-gray-400 cursor-not-allowed px-3 py-1' : 'px-3 py-1 hover:bg-gray-50 cursor-pointer text-green-600'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isMasked1) { toast.error('Cannot open WhatsApp for masked number'); return; }
                                        const num = (phone1 || '').replace(/\D/g, '');
                                        if (!num) { toast.error('Invalid number'); return; }
                                        window.open(`https://wa.me/91${num}`, '_blank');
                                        setIsWaOpen(false);
                                      }}
                                    >
                                      {`P1:${isMasked1 ? d1 : (phone1 || '').replace(/\D/g, '')}`}
                                    </div>
                                  ) : null}
                                  {isValid2 ? (
                                    <div
                                      className={`${isMasked2 ? 'text-gray-400 cursor-not-allowed px-3 py-1' : 'px-3 py-1 hover:bg-gray-50 cursor-pointer text-green-600'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isMasked2) { toast.error('Cannot open WhatsApp for masked number'); return; }
                                        const num = (phone2 || '').replace(/\D/g, '');
                                        if (!num) { toast.error('Invalid number'); return; }
                                        window.open(`https://wa.me/91${num}`, '_blank');
                                        setIsWaOpen(false);
                                      }}
                                    >
                                      {`P2: ${isMasked2 ? d2 : (phone2 || '').replace(/\D/g, '')}`}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Email */}
                          <div className="flex items-center space-x-2 text-xs">
                            <SquareArrowOutUpRight className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 truncate">{candidate?.email || "Not specified"}</span>
                          </div>

                          {/* City/State */}
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-gray-500">📍</span>
                            <span className="text-gray-700">{candidate?.city || "Not specified"} / {candidate?.state || "Not specified"}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Tablet Layout */}
                    <div className="hidden sm:block">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start space-x-6 flex-1">
                          <div className="flex-shrink-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-xl font-semibold text-white">
                                {candidate?.name?.split(' ')?.map(n => n?.[0])?.join('') || "JS"}
                              </span>
                            </div>
                          </div>
                          <div className='flex flex-col sm:flex-row sm:items-center sm:flex-wrap sm:space-x-2'>
                            {isHeaderInfoEditMode ? (
                              <div className="flex flex-col space-y-2">
                                <input
                                  type="text"
                                  value={headerInfoData.name ?? ""}
                                  onChange={(e) => handleHeaderInfoChange("name", e.target.value)}
                                  placeholder="Enter name"
                                  className="text-base lg:text-lg font-bold text-gray-900 border border-gray-300 rounded-lg px-2 py-1 outline-0"
                                />
                                <select
                                  value={headerInfoData.source ?? ""}
                                  onChange={(e) => handleHeaderInfoChange("source", e.target.value)}
                                  className="text-sm border border-gray-300 rounded-lg px-2 py-1 outline-0 bg-white"
                                >
                                  <option value="">Select Source</option>
                                  {masterData.sources.map(source => (
                                    <option key={source.id} value={source.name}>{source.name}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <>
                                <h2
                                  className={`text-base lg:text-lg font-bold cursor-pointer hover:underline transition-colors ${getCandidateNameColorClass(candidate)}`}
                                  onClick={handleCandidateNameClick}
                                  title="Click to view feedback"
                                >
                                  {candidate?.name || "Not specified"}
                                </h2>
                                <div className="flex items-center mt-1 sm:mt-0">
                                  <p className="flex items-center gap-1 bg-green-200 rounded-full font-medium text-green-600 px-2 py-0.5 text-sm whitespace-normal break-words max-w-full">
                                    <span className="inline-block rounded-full w-2 h-2 bg-green-600"></span>
                                    <span className="truncate">{candidate?.source || "Not specified"}</span>
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0">
                            <div className='flex flex-col items-start sm:items-end space-y-1'>
                              {isHeaderInfoEditMode ? (
                                <>
                                  <CustomDropdown
                                    value={headerInfoData.state}
                                    onChange={(selected) => {
                                      const stateValue = selected ? selected.value : '';
                                      handleHeaderInfoChange("state", stateValue);
                                      // Clear city when state changes
                                      if (stateValue !== headerInfoData.state) {
                                        handleHeaderInfoChange("city", '');
                                      }
                                    }}
                                    options={headerInfoData.country ? getStatesByCountry(headerInfoData.country) : locationData.states || []}
                                    placeholder="Select State"
                                    isSearchable={true}
                                    isClearable={true}
                                    isDisabled={locationLoading}
                                    className="text-sm w-full"
                                  />
                                  <CustomDropdown
                                    value={headerInfoData.city}
                                    onChange={(selected) => {
                                      const cityValue = selected ? selected.value : '';
                                      handleHeaderInfoChange("city", cityValue);
                                    }}
                                    options={headerInfoData.state ? getCitiesByState(headerInfoData.state) : locationData.cities || []}
                                    placeholder="Select City"
                                    isSearchable={true}
                                    isClearable={true}
                                    isDisabled={locationLoading || !headerInfoData.state}
                                    className="text-sm w-full"
                                  />
                                </>
                              ) : (
                                <>
                                  <div className='flex items-center space-x-1 text-sm'>
                                    <span className="truncate">{candidate?.city || "Not specified"}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 text-sm">
                                    <span className="truncate">{candidate?.state || "Not specified"}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className='flex flex-col space-y-1'>
                              <div className='flex items-center space-x-1 text-sm'>
                                <span className="truncate">{candidate?.email || "Not specified"}</span>
                                <SquareArrowOutUpRight className="w-3 h-3 text-gray-400 hover:text-blue-600 cursor-pointer flex-shrink-0" />
                              </div>
                              <div className="flex items-center space-x-1 text-sm relative">
                                <button
                                  className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isWaOpen) { setIsWaOpen(false); return; }
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setWaMenuPos({ x: rect.left, y: rect.bottom });
                                    setIsWaOpen(true);
                                  }}
                                  title={(() => {
                                    const phone1 = candidate?.phone;
                                    const cr = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                                    const d1 = getDisplayMobileNumber(phone1, joinedMobiles, cr, globalJoiningDates);
                                    const m1 = d1?.includes('x') || false;
                                    return getPhoneHoverTitle(phone1, candidate, m1, joinedMobiles, globalJoiningDates);
                                  })()}
                                >
                                  <Phone className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                                {(() => {
                                  const phone1 = candidate?.phone;
                                  const candidaterevenue = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                                  const displayPhone1 = getDisplayMobileNumber(phone1, joinedMobiles, candidaterevenue, globalJoiningDates);
                                  const isValid1 = phone1 && phone1 !== '-' && typeof phone1 === 'string' && phone1.toLowerCase() !== 'null' && phone1.toLowerCase() !== 'nill' && phone1.toLowerCase() !== 'nil' && phone1.trim() !== '';
                                  const isMasked1 = displayPhone1?.includes('x') || false;
                                  const hover1 = getPhoneHoverTitle(phone1, candidate, isMasked1, joinedMobiles, globalJoiningDates);
                                  return isValid1 ? (
                                    <span className={`${isMasked1 ? 'text-gray-400' : ''}`} title={hover1}>{displayPhone1}</span>
                                  ) : (
                                    <span className="text-gray-700" title={hover1}>-</span>
                                  );
                                })()}
                                {(() => {
                                  const phone2 = candidate?.mobile2;
                                  const candidaterevenue = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                                  const displayPhone2 = getDisplayMobileNumber(phone2, joinedMobiles, candidaterevenue, globalJoiningDates);
                                  const isValid2 = phone2 && phone2 !== '-' && typeof phone2 === 'string' && phone2.toLowerCase() !== 'null' && phone2.toLowerCase() !== 'nill' && phone2.toLowerCase() !== 'nil' && phone2.trim() !== '';
                                  const isMasked2 = displayPhone2?.includes('x') || false;
                                  const hover2 = getPhoneHoverTitle(phone2, candidate, isMasked2, joinedMobiles, globalJoiningDates);
                                  return isValid2 ? (
                                    <>
                                      <span className="text-xs text-gray-400 mx-1">/</span>
                                      <span className={`${isMasked2 ? 'text-gray-400' : ''}`} title={hover2}>{displayPhone2}</span>
                                    </>
                                  ) : null;
                                })()}
                                {(() => {
                                  const phone1 = candidate?.phone;
                                  const phone2 = candidate?.mobile2;
                                  const candidaterevenue = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
                                  const d1 = getDisplayMobileNumber(phone1, joinedMobiles, candidaterevenue, globalJoiningDates);
                                  const d2 = getDisplayMobileNumber(phone2, joinedMobiles, candidaterevenue, globalJoiningDates);
                                  const isValid1 = phone1 && phone1 !== '-' && typeof phone1 === 'string' && phone1.toLowerCase() !== 'null' && phone1.toLowerCase() !== 'nill' && phone1.toLowerCase() !== 'nil' && phone1.trim() !== '';
                                  const isValid2 = phone2 && phone2 !== '-' && typeof phone2 === 'string' && phone2.toLowerCase() !== 'null' && phone2.toLowerCase() !== 'nill' && phone2.toLowerCase() !== 'nil' && phone2.trim() !== '';
                                  const isMasked1 = d1?.includes('x') || false;
                                  const isMasked2 = d2?.includes('x') || false;
                                  if (!isWaOpen) return null;
                                  return (
                                    <div className="fixed z-50 bg-white border border-gray-200 rounded shadow-md py-1 text-xs" style={{ left: waMenuPos.x, top: waMenuPos.y }}>
                                      {isValid1 ? (
                                        <div
                                          className={`${isMasked1 ? 'text-gray-400 cursor-not-allowed px-3 py-1' : 'px-3 py-1 hover:bg-gray-50 cursor-pointer text-green-600'}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isMasked1) { toast.error('Cannot open WhatsApp for masked number'); return; }
                                            const num = (phone1 || '').replace(/\D/g, '');
                                            if (!num) { toast.error('Invalid number'); return; }
                                            window.open(`https://wa.me/91${num}`, '_blank');
                                            setIsWaOpen(false);
                                          }}
                                        >
                                          {`P1:${isMasked1 ? d1 : (phone1 || '').replace(/\D/g, '')}`}
                                        </div>
                                      ) : null}
                                      {isValid2 ? (
                                        <div
                                          className={`${isMasked2 ? 'text-gray-400 cursor-not-allowed px-3 py-1' : 'px-3 py-1 hover:bg-gray-50 cursor-pointer text-green-600'}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isMasked2) { toast.error('Cannot open WhatsApp for masked number'); return; }
                                            const num = (phone2 || '').replace(/\D/g, '');
                                            if (!num) { toast.error('Invalid number'); return; }
                                            window.open(`https://wa.me/91${num}`, '_blank');
                                            setIsWaOpen(false);
                                          }}
                                        >
                                          {`P2: ${isMasked2 ? d2 : (phone2 || '').replace(/\D/g, '')}`}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Edit / Save / Cancel buttons */}
                        {isHeaderInfoEditMode && !isJobAssignmentContext ? (
                          <div className="flex space-x-1 ml-2">
                            <button
                              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700"
                              onClick={handleSaveHeaderInfo}
                            >
                              Save
                            </button>
                            <button
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200"
                              onClick={handleCancelHeaderInfo}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : !isJobAssignmentContext ? (
                          <div className="flex items-center ml-2">
                            {canEditClientJob() && (
                              <Pencil
                                className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-600"
                                onClick={handleStartHeaderInfoEdit}
                              />
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Basic Information
                      </h3>
                      {isBasicInfoEditMode ? (
                        <div className="flex space-x-2">
                          <button
                            className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSaveBasicInfo}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                            onClick={handleCancelBasicInfo}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <Pencil
                          className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-600 transition-colors"
                          onClick={handleStartBasicInfoEdit}
                        />
                      )}
                    </div>
                    {isBasicInfoEditMode ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2 sm:space-y-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Experience</p>
                            <input
                              type="text"
                              value={basicInfoData.experience}
                              onChange={(e) => handleBasicInfoChange("experience", e.target.value)}
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                              placeholder="e.g. 3 years"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">C-CTC</p>
                            <input
                              type="number"
                              value={basicInfoData.currentCTC}
                              onChange={(e) => handleBasicInfoChange("currentCTC", e.target.value)}
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                              placeholder="Current CTC"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Skills</p>
                            <div className="space-y-1">
                              <div className="flex flex-wrap gap-1 mb-1">
                                {Array.isArray(basicInfoData.skills) ? basicInfoData.skills.map((skill, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                  >
                                    {skill}
                                    <button
                                      type="button"
                                      onClick={() => handleTagChange('skills', skill, 'remove')}
                                      className="ml-1 text-green-600 hover:text-green-800"
                                    >
                                      ×
                                    </button>
                                  </span>
                                )) : null}
                              </div>
                              <input
                                type="text"
                                placeholder="Add skill and press Enter"
                                className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleTagChange('skills', e.target.value, 'add');
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">DOB</p>
                            <input
                              type="date"
                              value={basicInfoData.dateOfBirth}
                              onChange={(e) => handleBasicInfoChange("dateOfBirth", e.target.value)}
                              onClick={(e) => e.target.showPicker && e.target.showPicker()}
                              max={(() => {
                                const today = new Date();
                                const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                                return maxDate.toISOString().split("T")[0];
                              })()}
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                            />
                            {basicInfoData.dateOfBirth && (
                              <p className="text-xs text-gray-500 mt-1">Age: {calculateAgeFromDate(basicInfoData.dateOfBirth)} years</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Gender</p>
                            <select
                              value={basicInfoData.gender}
                              onChange={(e) => handleBasicInfoChange("gender", e.target.value)}
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                            >
                              <option value="">Select gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2 sm:space-y-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Education</p>
                            <select
                              value={basicInfoData.educationLevel}
                              onChange={(e) => handleBasicInfoChange("educationLevel", e.target.value)}
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                            >
                              <option value="">Select education</option>
                              <option value="High School">High School</option>
                              <option value="Bachelor's">Bachelor's</option>
                              <option value="Master's">Master's</option>
                              <option value="PhD">PhD</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">E-CTC</p>
                            <input
                              type="text"
                              value={formattedExpectedCTC}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/,/g, '');
                                if (!isNaN(raw) || raw === '') {
                                  handleBasicInfoChange("expectedCTC", raw);
                                }
                              }}
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                              placeholder="Expected CTC"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Languages</p>
                            <div className="space-y-1">
                              <div className="flex flex-wrap gap-1 mb-1">
                                {basicInfoData.languages.map((language, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    {language}
                                    <button
                                      type="button"
                                      onClick={() => handleTagChange('languages', language, 'remove')}
                                      className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <input
                                type="text"
                                placeholder="Add language and press Enter"
                                className="text-xs border border-gray-300 rounded-lg px-2 py-1 outline-0 w-full"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleTagChange('languages', e.target.value, 'add');
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Age</p>
                            <p className="text-xs font-medium text-gray-800">
                              {basicInfoData.dateOfBirth ? calculateAgeFromDate(basicInfoData.dateOfBirth) : "Not specified"} years
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <DetailItem label="Experience" value={candidate?.experience || "Not specified"} />
                          <DetailItem label="C-CTC" value={relatedData.clients[0]?.current_ctc ? formatCurrency(relatedData.clients[0].current_ctc) : "Not specified"} />
                          <TagItem label="Skills" items={candidate?.skills} type="skills" />
                          <DetailItem label="DOB" value={candidate?.dateOfBirth ? formatDateToDDMMYYYY(candidate.dateOfBirth) : "Not specified"} />
                          <DetailItem label="Gender" value={candidate?.gender || "Not specified"} />
                        </div>
                        <div className="space-y-2">
                          <DetailItem label="Education" value={candidate?.educationLevel || "Not specified"} />
                          <DetailItem label="E-CTC" value={relatedData.clients[0]?.expected_ctc ? formatCurrency(relatedData.clients[0].expected_ctc) : "Not specified"} />
                          <TagItem label="Languages" items={candidate?.languages} type="languages" />
                          <DetailItem label="Age" value={candidate?.dateOfBirth ? calculateAge(candidate.dateOfBirth) : "Not specified"} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    profile Creation
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <p className='text-xs text-gray-500'>Created-At: <span className='font-semibold text-gray-800'>{candidate?.createdAt ? formatDateToDDMMYYYY(candidate.createdAt) : 'Not available'}</span></p>
                    <p className='text-xs text-gray-500'>Updated-At: <span className='font-semibold text-gray-800'>{candidate?.updatedAt ? formatDateToDDMMYYYY(candidate.updatedAt) : 'Not available'}</span></p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Client Job Details
                    </h3>
                    {isEditMode ? (
                      <div className="flex space-x-2">
                        <button
                          className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
                          onClick={handleSave}
                        >
                          Save
                        </button>
                        <button
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleCallAnswered}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded-md font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                          title="Call Answered"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCallNotAnswered}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded-md font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                          title="Call Not Answered"
                        >
                          <PhoneOff className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 1: 2-column */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <StatusItem
                      label="Client"
                      value={formData.clientName}
                      isEditMode={isEditMode}
                      onChange={(val) => handleChange("clientName", val)}
                      type="select"
                      isSubmitting={isSubmitting}
                      options={["Apple", "Microsoft", "Google", "TCS", "Infosys", "Wipro", "Accenture", "IBM", "Cognizant", "HCL"]}
                    />
                    <StatusItem
                      label="Designation"
                      value={formData.designation}
                      isEditMode={isEditMode}
                      onChange={(val) => handleChange("designation", val)}
                      type="select"
                      isSubmitting={isSubmitting}
                      options={masterData.designations.map(designation => designation.name)}
                    />
                    <StatusItem
                      label="Remarks"
                      value={formData.remarks || ""}
                      isEditMode={isEditMode}
                      onChange={(val) => handleChange("remarks", val)}
                      type="select"
                      isSubmitting={isSubmitting}
                      options={["Select", ...masterData.remarks.map(remark => remark.name)]}
                    />
                    {(() => {
                      const { showNextFollowUp, showInterviewDate, showJoiningDate } = getDateFieldsForRemark(formData.remarks);
                      return (
                        <>
                          {showNextFollowUp && (
                            <StatusItem
                              label="NFD"
                              value={formData.nextFollowUpDate}
                              isEditMode={isEditMode}
                              onChange={(val) => handleChange("nextFollowUpDate", val)}
                              type="date"
                              isSubmitting={isSubmitting}
                              formatDateToDDMMYYYY={formatDateToDDMMYYYY}
                            />
                          )}
                          {showInterviewDate && (
                            <StatusItem
                              label="Interview Date"
                              value={formData.interviewFixedDate}
                              isEditMode={isEditMode}
                              onChange={(val) => handleChange("interviewFixedDate", val)}
                              type="date"
                              isSubmitting={isSubmitting}
                              formatDateToDDMMYYYY={formatDateToDDMMYYYY}
                            />
                          )}
                          {showJoiningDate && (
                            <StatusItem
                              label="Expected Joining Date"
                              value={formData.expectedJoiningDate}
                              isEditMode={isEditMode}
                              onChange={(val) => handleChange("expectedJoiningDate", val)}
                              type="date"
                              isSubmitting={isSubmitting}
                              formatDateToDDMMYYYY={formatDateToDDMMYYYY}
                            />
                          )}
                        </>
                      );
                    })()}

                    <StatusItem
                      label="Profile Submission"
                      value={formData.profileSubmission || ""}
                      isEditMode={isEditMode}
                      onChange={(val) => handleChange("profileSubmission", val)}
                      type="select"
                      isSubmitting={isSubmitting}
                      options={["Select", "Yes", "No"]}
                    />
                    {formData.profileSubmission === "Yes" && (
                      <StatusItem
                        label="Submission Date"
                        value={formData.profileSubmissionDate}
                        isEditMode={isEditMode}
                        onChange={(val) => handleChange("profileSubmissionDate", val)}
                        type="date"
                        isSubmitting={isSubmitting}
                        formatDateToDDMMYYYY={formatDateToDDMMYYYY}
                      />
                    )}
                    <StatusItem
                      label="Feedback"
                      value={formData.feedback || ""}
                      isEditMode={isEditMode}
                      onChange={(val) => handleChange("feedback", val)}
                      type="textarea"
                      isSubmitting={isSubmitting}
                      fullWidth
                    />
                  </div>


                </div>
              </div>
            </div>
          )}

          {activeMobileTab === "resume" && (
            <div className="w-full">
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col h-full">
                <div className="flex-1 overflow-hidden">
                  {pdfUrl ? (
                    <div className="w-full h-full">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                        <h3 className="text-base font-medium text-gray-900">Resume Preview</h3>
                        <button
                          onClick={handleReplaceResume}
                          className="text-sm text-indigo-600 hover:text-indigo-800 underline self-start"
                        >
                          Replace Resume
                        </button>
                      </div>

                      {/* Mobile-first approach: Show buttons prominently on small screens */}
                      <div className="block sm:hidden mb-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600 mb-4">Resume preview may not work on mobile devices</p>
                          <div className="flex flex-col gap-3">
                            <button
                              onClick={() => {
                                if (pdfUrl) {
                                  window.open(pdfUrl, '_blank');
                                } else {
                                  toast.error('Resume URL not available');
                                }
                              }}
                              className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Open in New Tab
                            </button>
                            <button
                              onClick={() => {
                                if (pdfUrl) {
                                  // Create a temporary link for download
                                  const link = document.createElement('a');
                                  link.href = pdfUrl;
                                  link.download = `${candidate?.name || 'resume'}_resume.pdf`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                } else {
                                  toast.error('Resume URL not available');
                                }
                              }}
                              className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Desktop iframe */}
                      <div className="hidden sm:block">
                        <iframe
                          title="Resume Preview"
                          src={pdfUrl}
                          className="w-full h-[calc(100vh-180px)] rounded border"
                          onError={() => {
                          }}
                        />
                        <div className="mt-3 text-center">
                          <p className="text-sm text-gray-500 mb-2">If PDF doesn't display above:</p>
                          <div className="flex justify-center gap-4">
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                            >
                              Open in New Tab
                            </a>
                            <a
                              href={pdfUrl}
                              download
                              className="text-sm text-green-600 hover:text-green-800 underline"
                            >
                              Download PDF
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-6 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center h-full ${isDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'
                        }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="text-center">
                        <UploadIcon className="mx-auto h-10 w-10 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Upload Resume</h3>
                        <p className="mt-1 text-xs text-gray-500">Drag and drop PDF here, or click to browse</p>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          id="resume-upload"
                          onChange={handleFileUpload}
                        />
                        <label
                          htmlFor="resume-upload"
                          className="mt-2 inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                        >
                          Select File
                        </label>
                        {uploadError && (
                          <p className="mt-2 text-xs text-red-600">{uploadError}</p>
                        )}
                        {uploadedFile && (
                          <div className="mt-3 flex items-center justify-center gap-2">
                            <span className="text-xs text-gray-700 truncate max-w-[60%]">
                              {uploadedFile.name}
                            </span>
                            <button
                              type="button"
                              onClick={handleClearUpload}
                              className="text-xs text-indigo-600 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeMobileTab === "evaluation" && (
            <div className="w-full">
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col h-full">
                <div className="border-b border-gray-200 bg-white mb-3">
                  <div className="flex flex-wrap gap-2">
                    {sections?.map((section) => {
                      const isActive = activeSection === section?.id
                      return (
                        <Button
                          key={section?.id}
                          size="sm"
                          onClick={() => setActiveSection(section?.id)}
                          iconName={section?.icon}
                          iconPosition="left"
                          className={twMerge(
                            "flex-shrink-0 rounded-md px-3 py-2 text-sm font-medium transition",
                            isActive
                              ? "bg-indigo-600 text-white"
                              : "bg-indigo-100 text-gray-700 hover:bg-indigo-600 hover:text-white"
                          )}
                        >
                          {section?.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-desktop">
                  {renderSectionContent()}
                </div>
              </div>
            </div>
          )}


        </div>
      </div>





      {/* Client Job Details Modal */}
      {isClientJobModalOpen && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-visible">
            <div className="flex items-center justify-between p-2 border-b border-gray-200">
              <h3 className="text-md font-semibold text-gray-900">
                Client Job Details - {clientJobCallStatus === 'call answered' ? 'Call Answered' : 'Call Not Answered'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsClientJobModalOpen(false)}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                {clientJobCallStatus === 'call answered' ? (
                  <button
                    onClick={handleClientJobSubmit}
                    className="px-3 py-1 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 flex items-center gap-1"
                  >
                    <Phone size={14} />
                    Call Answered
                  </button>
                ) : (
                  <button
                    onClick={handleClientJobSubmit}
                    className="px-3 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 flex items-center gap-1"
                  >
                    <PhoneOff size={14} />
                    Call Not Answered
                  </button>
                )}

              </div>
            </div>

            <div className="p-3 space-y-2">
              {/* Grid 2 Layout */}
              {/* First Row - Client Name and Designation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name
                  </label>
                  <CustomDropdown
                    value={clientJobFormData.clientName}
                    onChange={(selected) => {
                      const clientValue = selected ? selected.value : '';
                      setClientJobFormData(prev => ({
                        ...prev,
                        clientName: clientValue
                      }));
                    }}
                    options={(() => {
                      const baseOptions = [{ value: '', label: 'Select Client' }, ...vendorOptions];
                      const currentValue = clientJobFormData.clientName;
                      if (currentValue && !baseOptions.some(opt => opt.value === currentValue)) {
                        baseOptions.push({ value: currentValue, label: currentValue });
                      }
                      return baseOptions;
                    })()}
                    placeholder={loadingVendors ? "Loading clients..." : "Select Client"}
                    isSearchable={true}
                    isClearable={true}
                    isDisabled={clientJobCallStatus !== 'call answered' || loadingVendors || !canEditClientJob()}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation
                  </label>
                  <CustomDropdown
                    value={clientJobFormData.designation}
                    onChange={(selected) => {
                      const designationValue = selected ? selected.value : '';
                      setClientJobFormData(prev => ({
                        ...prev,
                        designation: designationValue
                      }));
                    }}
                    options={(() => {
                      const baseOptions = [{ value: '', label: 'Select Designation' }, ...positionOptions];
                      const currentValue = clientJobFormData.designation;
                      if (currentValue && !baseOptions.some(opt => opt.value === currentValue)) {
                        baseOptions.push({ value: currentValue, label: currentValue });
                      }
                      return baseOptions;
                    })()}
                    placeholder={loadingPositions ? "Loading positions..." : "Select Designation"}
                    isSearchable={true}
                    isClearable={true}
                    isDisabled={clientJobCallStatus !== 'call answered' || loadingPositions || !canEditClientJob()}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Second Row - Profile Submission and Submission Date */}
              {canEditClientJob() && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Profile Submission */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profile Submission</label>
                    <div className="flex items-center space-x-6">
                      <label className={`inline-flex items-center ${clientJobCallStatus === 'call answered' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <div className="relative">
                          <input
                            type="radio"
                            name="profileSubmission"
                            value="Yes"
                            checked={clientJobFormData.profileSubmission === "Yes"}
                            onChange={(e) => handleProfileSubmissionChange(e.target.value)}
                            onDoubleClick={() => handleProfileSubmissionChange('')}
                            disabled={clientJobCallStatus !== 'call answered'}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${getProfileSubmissionDisplay(clientJobFormData.profileSubmission) === "Yes"
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300 bg-white hover:border-gray-400'
                              }`}
                            onDoubleClick={() => clientJobCallStatus === 'call answered' && handleProfileSubmissionChange('')}
                          >
                            {getProfileSubmissionDisplay(clientJobFormData.profileSubmission) === "Yes" && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                        </div>
                        <span className={`ml-2 text-sm font-medium ${getProfileSubmissionDisplay(clientJobFormData.profileSubmission) === "Yes"
                          ? 'text-blue-600'
                          : 'text-gray-700'
                          }`}>
                          Yes
                        </span>
                      </label>
                      <label className={`inline-flex items-center ${clientJobCallStatus === 'call answered' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}>
                        <div className="relative">
                          <input
                            type="radio"
                            name="profileSubmission"
                            value="No"
                            checked={clientJobFormData.profileSubmission === "No"}
                            onChange={(e) => handleProfileSubmissionChange(e.target.value)}
                            onDoubleClick={() => handleProfileSubmissionChange('')}
                            disabled={clientJobCallStatus !== 'call answered'}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${getProfileSubmissionDisplay(clientJobFormData.profileSubmission) === "No"
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300 bg-white hover:border-gray-400'
                              }`}
                            onDoubleClick={() => clientJobCallStatus === 'call answered' && handleProfileSubmissionChange('')}
                          >
                            {getProfileSubmissionDisplay(clientJobFormData.profileSubmission) === "No" && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                        </div>
                        <span className={`ml-2 text-sm font-medium ${getProfileSubmissionDisplay(clientJobFormData.profileSubmission) === "No"
                          ? 'text-blue-600'
                          : 'text-gray-700'
                          }`}>
                          No
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Submission Date - Only show when Profile Submission is "Yes" */}
                  {clientJobFormData.profileSubmission === "Yes" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Submission Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          name="profileSubmissionDate"
                          value={clientJobFormData.profileSubmissionDate || ''}
                          onChange={(e) => {
                            setClientJobFormData(prev => ({
                              ...prev,
                              profileSubmissionDate: e.target.value
                            }));
                            setIsDateFromBackend(false);
                          }}
                          onClick={(e) => e.target.showPicker && e.target.showPicker()}
                          max={new Date().toISOString().split('T')[0]}
                          disabled={clientJobCallStatus !== 'call answered'}
                          className="w-full px-2 py-1 text-sm font-light border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        {clientJobFormData?.profileSubmissionDate &&
                          isDateFromBackend && (
                            <div className="absolute -bottom-7 left-0">
                              <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 border border-green-400 rounded-lg">
                                Submitted on {clientJobFormData.profileSubmissionDate}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Third Row - Attend and Attend Date */}
              {canEditClientJob() && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attend</label>
                    <div className="flex items-center space-x-4">
                      <label className={`inline-flex items-center ${clientJobCallStatus === 'call answered' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <input
                          type="radio"
                          className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          name="attend"
                          value="Yes"
                          checked={clientJobFormData.attend === "Yes"}
                          onChange={(e) => handleAttendChange(e.target.value)}
                          disabled={clientJobCallStatus !== 'call answered'}
                        />
                        <span className="ml-2">Yes</span>
                      </label>

                      <label className={`inline-flex items-center ${clientJobCallStatus === 'call answered' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <input
                          type="radio"
                          className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          name="attend"
                          value="No"
                          checked={clientJobFormData.attend === "No"}
                          onChange={(e) => handleAttendChange(e.target.value)}
                          disabled={clientJobCallStatus !== 'call answered'}
                        />
                        <span className="ml-2">No</span>
                      </label>
                    </div>
                  </div>

                  {clientJobFormData.attend === "Yes" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Attend Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          name="attendDate"
                          value={clientJobFormData.attendDate || ''}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const selectedDate = e.target.value;
                            // Ensure the selected date is not in the past
                            const today = new Date().toISOString().split('T')[0];
                            const dateToSet = selectedDate < today ? today : selectedDate;

                            setClientJobFormData(prev => ({
                              ...prev,
                              attendDate: dateToSet
                            }));
                          }}
                          onClick={(e) => e.target.showPicker && e.target.showPicker()}
                          disabled={clientJobCallStatus !== 'call answered'}
                          className="w-full px-2 py-1 text-sm font-light border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />

                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fourth Row - Remarks and NFD Date */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <CustomDropdown
                    value={clientJobFormData.remarks}
                    onChange={(selected) => {
                      const remarkValue = selected ? selected.value : '';

                      // Update the remarks field
                      setClientJobFormData(prev => ({
                        ...prev,
                        remarks: remarkValue
                      }));

                      // Auto-calculate NFD and Feedback ONLY for account holders
                      if (remarkValue && canEditClientJob()) {
                        const autoNfd = allocateNfd(remarkValue);
                        const autoFeedback = allocateFeedback(remarkValue);

                        if (autoNfd) {
                          setClientJobFormData(prev => ({
                            ...prev,
                            nfdDate: autoNfd
                          }));
                        }

                        if (autoFeedback) {
                          setClientJobFormData(prev => ({
                            ...prev,
                            feedback: autoFeedback
                          }));
                        }
                      }

                      handleRemarksChange(remarkValue);
                    }}
                    options={(masterData?.remarks || [])
                      .filter(remark => {
                        if (clientJobFormData.attend === 'Yes') {
                          // When attended is 'Yes', show these specific remarks including both 'In Process' and 'No Show'
                          const allowedRemarks = [
                            'Selected', 'Rejected', 'IN process',
                            'Next Round', 'Feedback Pending', 'No Show'
                          ];
                          return allowedRemarks.includes(remark.name);
                        } else {
                          // When attended is 'No', exclude the above remarks
                          const restrictedRemarks = [
                            'Selected', 'Rejected', 'IN process',
                            'Next Round', 'Feedback Pending', 'No Show'
                          ];
                          return !restrictedRemarks.includes(remark.name);
                        }
                      })
                      .map(remark => ({
                        value: remark.name,
                        label: remark.name
                      }))}
                    placeholder="Select Remarks"
                    className="w-full p-0.5 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm"
                    isSearchable={true}
                    isClearable={true}
                    isDisabled={false}
                  />
                </div>

                {/* Dynamic Date Fields Based on Selected Remark */}
                {canEditClientJob() && clientJobFormData.remarks && (() => {
                  const { showNextFollowUp, showInterviewDate, showJoiningDate } = getDateFieldsForRemark(clientJobFormData.remarks);

                  return (
                    <>
                      {showNextFollowUp && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            NFD Date
                          </label>
                          <input
                            type="date"
                            value={clientJobFormData.nfdDate || ''}
                            onChange={(e) => setClientJobFormData(prev => ({
                              ...prev,
                              nfdDate: e.target.value
                            }))}
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            className="w-full px-2 py-1 text-sm font-light border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {showInterviewDate && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Interview Fixed Date
                          </label>
                          <input
                            type="date"
                            value={clientJobFormData.ifdDate || ''}
                            onChange={(e) => setClientJobFormData(prev => ({
                              ...prev,
                              ifdDate: e.target.value
                            }))}
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            className="w-full px-2 py-1 text-sm font-light border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {showJoiningDate && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expected Joining Date
                          </label>
                          <input
                            type="date"
                            value={clientJobFormData.ejdDate || ''}
                            onChange={(e) => setClientJobFormData(prev => ({
                              ...prev,
                              ejdDate: e.target.value
                            }))}
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            className="w-full px-2 py-1 text-sm font-light border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>




              {/* Grid 1 Layout - Full Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback <span className="text-red-500">*</span> - <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedCandidateForFeedback(detailedCandidate || selectedCandidate);
                      setIsFeedbackModalOpen(true);
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
                  >
                    View
                  </button>

                </label>
                <textarea
                  value={extractMainFeedback(clientJobFormData.feedback)}
                  onChange={(e) => {
                    setClientJobFormData(prev => ({
                      ...prev,
                      feedback: e.target.value
                    }));
                    // Hide error when user starts typing
                    if (e.target.value) {
                      setShowFeedbackError(false);
                    }
                  }}
                  rows={4}
                  className={`w-full px-3 py-2 border ${showFeedbackError && !clientJobFormData.feedback
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    } rounded-md shadow-sm focus:outline-none read-only:bg-gray-100 read-only:cursor-not-allowed`}
                  placeholder="Enter detailed feedback..."
                  readOnly={clientJobCallStatus !== 'call answered'}
                  required
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Job Assignment Modal */}
      <JobAssignmentModal
        isOpen={isJobAssignmentModalOpen}
        onClose={() => {
          setIsJobAssignmentModalOpen(false);
          setSelectedJobAssignmentData(null);
        }}
        assignmentData={selectedJobAssignmentData}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={handleCloseFeedbackModal}
        candidate={selectedCandidateForFeedback}
        clientJobId={selectedCandidateForFeedback?.clientJobId}
      />
    </div>
  );
};

export default CandidateDetailsModal;
