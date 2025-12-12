import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

import { useApi } from '../NewDtr/hooks/useApi';
import { revenueService } from '../../api/revenueService';
import FeedbackModal from '../NewDtr/components/FeedbackModal';

// Format number with Indian numbering system (lakhs and crores)
const formatCurrency = (value) => {
  if (value === '' || value === null || value === undefined) return '';

  // Remove all non-numeric characters except decimal point
  let numericValue = String(value).replace(/[^0-9.]/g, '');

  // Handle empty case
  if (numericValue === '') return '';

  // Separate whole and decimal parts while preserving the '.' and any digits after it
  let wholePart = numericValue;
  let decimalPart = '';

  const dotIndex = numericValue.indexOf('.');
  if (dotIndex !== -1) {
    wholePart = numericValue.slice(0, dotIndex);
    // Includes the '.' and everything typed after it (even if it's just the dot)
    decimalPart = numericValue.slice(dotIndex);
  }

  // Format the whole number part with Indian numbering system
  if (wholePart.length > 3) {
    const lastThree = wholePart.slice(-3);
    const otherNumbers = wholePart.slice(0, -3);
    if (otherNumbers !== '') {
      wholePart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    }
  }

  return wholePart + decimalPart;
};

// Get automatic feedback suggestion based on profile and revenue status
const getAutoFeedbackSuggestion = (profileStatus, revenueStatus) => {
  if (profileStatus === 'Abscond') {
    return 'He left the system within 90 days';
  }

  if (profileStatus === 'Joined') {
    if (revenueStatus === 'Processing') return 'He joined';
    if (revenueStatus === 'Claimed')   return 'Payment received as per invoice, need to wait for the 90 days clause';
    if (revenueStatus === 'Pending')   return 'Expected revenue date crossed';
  }

  return null;
};

// Normalize revenue status values coming from / going to backend
const normalizeRevenueStatus = (status) => {
  if (!status) return '';
  const value = String(status).toLowerCase();

  if (value === 'process' || value === 'processing') {
    return 'Processing';
  }
  if (value === 'claimed') {
    return 'Claimed';
  }
  if (value === 'pending') {
    return 'Pending';
  }
  return status;
};

const inputStyle = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const labelStyle = 'block text-left text-sm font-medium text-gray-700 mb-1';
const sectionTitleStyle = 'text-md font-semibold text-gray-800 mb-2 pb-2 border-b border-gray-200';

const EditRevenueForm = ({ candidate, onClose, isPage = false, onStatusChange }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const showToast = (message, type = 'success') => {
    const toastOptions = {
      position: 'top-center',
      duration: 3000,
      style: {
        minWidth: '250px',
        textAlign: 'center',
        borderRadius: '8px',
        padding: '12px 20px',
        fontWeight: 500,
      },
    };

    if (type === 'success') {
      toast.success(message, toastOptions);
    } else if (type === 'error') {
      toast.error(message, toastOptions);
    } else {
      toast(message, toastOptions);
    }
  };
  const [formData, setFormData] = useState({
    candidateId: null,
    candidate: '',
    employeeName: '',
    location: '',
    clientName: '',
    profileStatus: 'Joined',
    joiningDate: null,
    accountableCTC: '',
    offerCTC: '',
    percentageInput: "",
    amountInput: "",
    revenue: '',
    revenueStatus: '',
    itbrDate: null,
    erdDate: null,
    brDate: null,
    invoiceNumber: '',
    feedback: '',
  });

  const [showAdditionalFields, setShowAdditionalFields] = useState(true);
  const [percentOrAmount, setPercentOrAmount] = useState('%');
  const { candidates, clientJobs } = useApi();
  const isAbscond = formData.profileStatus === 'Abscond';
  const [editingId, setEditingId] = useState(null);
  const [revenues, setRevenues] = useState([]);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [currentRevenueId, setCurrentRevenueId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [originalRevenue, setOriginalRevenue] = useState('');
  const [feedbackTouched, setFeedbackTouched] = useState(false);

  // useEffect(() => {
  //   if (candidate && candidate.backendData) {
  //     const candidateData = candidate.backendData;
      
  //     // Helper function to parse dates
  //     const parseDate = (dateString) => {
  //       if (!dateString) return null;
  //       try {
  //         return new Date(dateString);
  //       } catch {
  //         return null;
  //       }
  //     };

  //     setFormData({
  //       candidateId: candidateData.id,
  //       candidate: candidateData.candidate_name || candidate.candidateName || "",
  //       employeeName: candidateData.executive_name || candidate.executiveName || "",
  //       clientName: candidate.clientJob?.clientName || candidateData.client_name || "",
  //       profileStatus: 'Joined',
  //       joiningDate: parseDate(candidateData.joining_date),
  //       accountableCTC: candidateData.accountable_ctc || "",
  //       offerCTC: candidateData.offer_ctc || "",
  //       percentageInput: candidateData.percentage || "",
  //       amountInput: candidateData.amount || "",
  //       revenue: candidateData.revenue || "",
  //       revenueStatus: candidateData.revenue_status || "",
  //       itbrDate: parseDate(candidateData.itbr_date),
  //       erdDate: parseDate(candidateData.erd_date),
  //       brDate: parseDate(candidateData.br_date),
  //       invoiceNumber: candidateData.invoice_number || "",
  //       feedback: '',
  //     });

  //     // Set revenue ID for updating
  //     setEditingId(candidateData.revenue_id || candidateData.id);
  //     setCurrentRevenueId(candidateData.revenue_id || candidateData.id);
      
  //     // Set the percentage/amount toggle based on existing data
  //     if (candidateData.percentage && candidateData.percentage > 0) {
  //       setPercentOrAmount('%');
  //     } else if (candidateData.amount && candidateData.amount > 0) {
  //       setPercentOrAmount('₹');
  //     }
  //   }
  // }, [candidate]);

  useEffect(() => {
  if (candidate) {
    // Helper function to parse dates
    const parseDate = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    };

    // Map API response to form fields
    setFormData(prev => ({
      ...prev,
      candidateId: candidate.id || candidate.candidate,
      candidate: candidate.candidate_name || "",
      employeeName: candidate.executive_name || "",
      clientName: candidate.client_name || "",
      location: candidate.location || "",
      profileStatus: candidate.profile_status || 'Joined',
      joiningDate: parseDate(candidate.joining_date),
      accountableCTC: candidate.accountable_ctc?.toString() || "",
      offerCTC: candidate.offer_ctc?.toString() || "",
      percentageInput: candidate.percentage?.toString() || "",
      amountInput: candidate.amount?.toString() || "",
      revenue: candidate.revenue?.toString() || "",
      revenueStatus: normalizeRevenueStatus(candidate.revenue_status || ""),
      itbrDate: parseDate(candidate.itbr_date),
      erdDate: parseDate(candidate.erd_date),
      brDate: parseDate(candidate.br_date),
      invoiceNumber: candidate.invoice_number || "",
    }));

    // Capture original revenue from candidate for later restore
    setOriginalRevenue(
      candidate.revenue !== null && candidate.revenue !== undefined
        ? candidate.revenue.toString()
        : ''
    );

    // Set the percentage/amount toggle based on existing data
    if (candidate.percentage && parseFloat(candidate.percentage) > 0) {
      setPercentOrAmount('%');
    } else if (candidate.amount && parseFloat(candidate.amount) > 0) {
      setPercentOrAmount('₹');
    }
  }
}, [candidate]);
  
  useEffect(() => {
    const fetchRevenues = async () => {
      if (formData.candidateId) {
        // Make sure we're passing just the ID, not the entire candidate object
        const candidateId = typeof formData.candidateId === 'object' ? formData.candidateId.id : formData.candidateId;
        try {
          const data = await revenueService.getRevenuesByCandidate(candidateId);
          const list = Array.isArray(data)
            ? data
            : data && typeof data === 'object'
              ? data.results || data.data || []
              : [];
          setRevenues(list);
        } catch (error) {
          console.error('Error fetching revenues:', error);
          // Handle error appropriately, maybe show a toast message
          toast.error('Failed to load revenue data');
        }
      }
    };
    fetchRevenues();
  }, [formData.candidateId]);

  useEffect(() => {
    if (!revenues || revenues.length === 0) {
      return;
    }

    const latestRevenue = revenues[0];

    const parseDate = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    };

    setFormData(prev => ({
      ...prev,
      candidateId: latestRevenue.candidate || prev.candidateId,
      candidate: latestRevenue.candidate_name || prev.candidate || candidate?.candidate_name || "",
      employeeName: latestRevenue.display_executive_name|| prev.employeeName || "",
      clientName: latestRevenue.client_name || prev.clientName || "",
      location: latestRevenue.location || prev.location || "",
      profileStatus: latestRevenue.profile_status || prev.profileStatus || 'Joined',
      joiningDate: parseDate(latestRevenue.joining_date) || prev.joiningDate,
      accountableCTC: latestRevenue.accountable_ctc !== null && latestRevenue.accountable_ctc !== undefined
        ? String(latestRevenue.accountable_ctc)
        : prev.accountableCTC,
      offerCTC: latestRevenue.offer_ctc !== null && latestRevenue.offer_ctc !== undefined
        ? String(latestRevenue.offer_ctc)
        : prev.offerCTC,
      percentageInput: latestRevenue.percentage !== null && latestRevenue.percentage !== undefined
        ? String(latestRevenue.percentage)
        : prev.percentageInput,
      amountInput: latestRevenue.amount !== null && latestRevenue.amount !== undefined
        ? String(latestRevenue.amount)
        : prev.amountInput,
      revenue: latestRevenue.revenue !== null && latestRevenue.revenue !== undefined
        ? String(latestRevenue.revenue)
        : prev.revenue,
      revenueStatus: normalizeRevenueStatus(latestRevenue.revenue_status || prev.revenueStatus || ""),
      itbrDate: parseDate(latestRevenue.itbr_date) || prev.itbrDate,
      erdDate: parseDate(latestRevenue.erd_date) || prev.erdDate,
      brDate: parseDate(latestRevenue.br_date) || prev.brDate,
      invoiceNumber: latestRevenue.invoice_number || prev.invoiceNumber || "",
    }));

    // Latest revenue from backend becomes the canonical original revenue
    setOriginalRevenue(
      latestRevenue.revenue !== null && latestRevenue.revenue !== undefined
        ? String(latestRevenue.revenue)
        : ''
    );

    setEditingId(latestRevenue.id);
    setCurrentRevenueId(latestRevenue.id);

    if (latestRevenue.percentage && parseFloat(latestRevenue.percentage) > 0) {
      setPercentOrAmount('%');
    } else if (latestRevenue.amount && parseFloat(latestRevenue.amount) > 0) {
      setPercentOrAmount('₹');
    }
  }, [revenues, candidate]);

  // Handle numeric input changes
  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    // Remove all non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    setFormData(prev => ({
      ...prev,
      [name]: numericValue // Store raw number for calculations
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle profile status separately so we can toggle additional fields visibility
    if (name === 'profileStatus') {
      setFormData(prev => {
        const updated = {
          ...prev,
          profileStatus: value,
        };

        // Auto-suggest feedback based on status combo, as long as user hasn't edited feedback
        if (!feedbackTouched) {
          const suggestion = getAutoFeedbackSuggestion(updated.profileStatus, updated.revenueStatus);
          if (suggestion) {
            updated.feedback = suggestion;
          }
        }

        return updated;
      });
      if (onStatusChange) {
        onStatusChange(value);
      }
      // Always show additional fields, but they'll be disabled when status is 'Abscond'
      setShowAdditionalFields(true);
      return;
    }

    // Skip number formatting for non-numeric fields
    if (['candidate', 'employeeName', 'clientName', 'revenueStatus', 'invoiceNumber', 'feedback'].includes(name)) {
      if (name === 'revenueStatus') {
        setFormData(prev => {
          const updated = {
            ...prev,
            revenueStatus: value,
          };

          // Auto-suggest feedback based on status combo,
          // as long as user hasn't manually edited feedback yet
          if (!feedbackTouched) {
            const suggestion = getAutoFeedbackSuggestion(updated.profileStatus, updated.revenueStatus);
            if (suggestion) {
              updated.feedback = suggestion;
            }
          }

          return updated;
        });
      } else if (name === 'feedback') {
        // Mark feedback as manually edited and update its value
        setFeedbackTouched(true);
        setFormData(prev => ({
          ...prev,
          feedback: value,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value,
        }));
      }
      return;
    }

    // Handle numeric input changes
    if (['accountableCTC', 'offerCTC', 'revenue', 'percentageInput', 'amountInput'].includes(name)) {
      handleNumericChange(e);
      return;
    }

    // Handle other fields
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Format display values with commas
  const getDisplayValue = (name, value) => {
    if (['accountableCTC', 'offerCTC', 'revenue', 'amountInput'].includes(name) && value) {
      return formatCurrency(value);
    }
    return value || '';
  };

  // Recalculate revenue whenever relevant fields change
  // IMPORTANT: Do NOT overwrite existing backend revenue unless user has entered
  // a percentage or amount. This preserves stored revenue like 37485 when
  // percentage/amount are null.
  useEffect(() => {
    setFormData(prev => {
      const hasPercentage = prev.percentageInput && parseFloat(prev.percentageInput) > 0;
      const hasAmount = prev.amountInput && parseFloat(prev.amountInput) > 0;

      // If user has not entered percentage or amount, keep existing revenue
      if (!hasPercentage && !hasAmount) {
        return {
          ...prev,
          // When % / amount are empty, always show the original backend revenue
          revenue: originalRevenue !== '' ? originalRevenue : prev.revenue,
        };
      }

      const offer = parseFloat(prev.offerCTC) || 0;
      let revenueValue = prev.revenue || "";

      if (percentOrAmount === "%") {
        const percentage = parseFloat(prev.percentageInput) || 0;
        // Calculate with 2 decimals, then drop .00 if it's a whole number
        if (offer > 0 && percentage > 0) {
          revenueValue = ((offer * percentage) / 100).toFixed(2).replace(/\.00$/, '');
        }
      } else if (percentOrAmount === "₹") {
        const amount = parseFloat(prev.amountInput) || 0;
        if (amount > 0) {
          revenueValue = amount.toFixed(2).replace(/\.00$/, '');
        }
      }

      return {
        ...prev,
        revenue: revenueValue
      };
    });
  }, [formData.offerCTC, formData.percentageInput, formData.amountInput, percentOrAmount, originalRevenue]);

  // Handle feedback submission separately from main form data
  const handleFeedbackSubmit = async (feedbackText) => {
    if (!feedbackText || !formData.candidateId) return;
    
    const feedbackData = {
      candidate: formData.candidateId,
      candidate_revenue: currentRevenueId || null,  // Changed from revenue_id to candidate_revenue
      feedback: feedbackText,
      created_by: localStorage.getItem('employeeCode') || 'System'
    };
    
    const response = await revenueService.createFeedback(feedbackData);
    
    // Update local state to show the new feedback
    setFeedbackHistory(prev => [{
      ...feedbackData,
      id: response?.data?.id || Date.now(),
      created_at: new Date().toISOString(),
      ...response?.data // Spread any additional data from the response
    }, ...prev]);
    
    // Clear the feedback input
    setFormData(prev => ({
      ...prev,
      feedback: ''
    }));
    
    return response;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Require joining date for non-Abscond profiles
    if (!isAbscond && !formData.joiningDate) {
      showToast('Joining Date is required', 'error');
      setIsLoading(false);
      return;
    }

    // Require feedback for all submissions
    if (!formData.feedback || !formData.feedback.trim()) {
      showToast('Feedback is required', 'error');
      setIsLoading(false);
      return;
    }

    // Validate percentage / amount rule for non-Abscond profiles
    if (!isAbscond) {
      const parseNumericInline = (str) => {
        if (!str) return 0;
        const numStr = String(str).replace(/[^0-9.]/g, '');
        return parseFloat(numStr) || 0;
      };

      const percentage = parseNumericInline(formData.percentageInput);
      const amount = parseNumericInline(formData.amountInput);

      const hasPercentage = percentage > 0;
      const hasAmount = amount > 0;

      // Require only the currently selected input (% or ) to have a value
      if (percentOrAmount === '%' && !hasPercentage) {
        showToast('Please enter a percentage value', 'error');
        setIsLoading(false);
        return;
      }

      if (percentOrAmount === '' && !hasAmount) {
        showToast('Please enter a revenue amount', 'error');
        setIsLoading(false);
        return;
      }
    }

    // Submit feedback first (now we know it exists)
    if (formData.feedback && formData.feedback.trim()) {
      try {
        await handleFeedbackSubmit(formData.feedback);
        // Optional: no separate toast here; main success toast will show after revenue save
      } catch (error) {
        console.error('Error submitting feedback:', error);
        showToast('Error submitting feedback', 'error');
        setIsLoading(false);
        return;
      }
    }

    const formatDate = (date) => {
      if (!date) return null;
      return new Date(date).toISOString().split('T')[0];
    };

    const parseNumeric = (str) => {
      if (!str) return 0;
      const numStr = String(str).replace(/[^0-9.]/g, '');
      return parseFloat(numStr) || 0;
    };

    // Decide which value to send based on the active toggle (% or ₹)
    let percentageValue = null;
    let amountValue = null;

    if (!isAbscond) {
      if (percentOrAmount === '%') {
        percentageValue = parseNumeric(formData.percentageInput);
      } else if (percentOrAmount === '₹') {
        amountValue = parseNumeric(formData.amountInput);
      }
    }

    const formattedData = {
      candidate: formData.candidateId,
      candidate_name: formData.candidate,
      executive_name: formData.display_executive_name,
      client_name: formData.clientName,
      location: formData.location,
      profile_status: formData.profileStatus,

      joining_date: formatDate(formData.joiningDate),
      itbr_date: formatDate(formData.itbrDate),
      erd_date: formatDate(formData.erdDate),

      accountable_ctc: parseNumeric(formData.accountableCTC),
      offer_ctc: parseNumeric(formData.offerCTC),
      percentage: percentageValue,
      amount: amountValue,
      revenue: parseNumeric(formData.revenue),
      revenue_status: normalizeRevenueStatus(formData.revenueStatus),

      br_date: formData.brDate ? formatDate(formData.brDate) : null,
      invoice_number: formData.invoiceNumber || null,
    };

    // Determine if we should update an existing revenue record or create a new one
    const existingRevenueId =
      Array.isArray(revenues) && revenues.length > 0
        ? revenues[0]?.id
        : null;

    try {
      if (existingRevenueId) {
        // Update existing record
        await revenueService.updateRevenue(existingRevenueId, formattedData);
        showToast(`Revenue has been marked for ${formData.candidate || ''}`, 'success');
      } else {
        // Create new record
        await revenueService.createRevenue(formattedData);
        showToast(`Revenue has been marked for ${formData.candidate || ''}`, 'success');
      }

      // Notify opener (e.g., ItbrView) to refresh data if this page was opened from there
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'REVENUE_UPDATED' }, window.location.origin);
        }
      } catch (notifyError) {
        console.error('Error notifying opener about revenue update:', notifyError);
      }

      // Add a small delay before navigation to allow toast to be seen
      setTimeout(() => {
        // Handle navigation based on whether we're in page or modal mode
        if (isPage) {
          // Navigate back to ItbrView with smooth transition and plan parameter
          const currentParams = new URLSearchParams(location.search);
          const planId = currentParams.get('plan');
          
          // Add smooth scroll effect before navigation
          document.documentElement.style.scrollBehavior = 'smooth';
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
          // Small delay to allow scroll to complete
          setTimeout(() => {
            navigate({
              pathname: '/itbr-view',
              search: planId ? `?plan=${planId}` : '',
              state: { 
                from: location.pathname,
                transition: 'smooth' 
              }
            }, { replace: true });
            
            // Reset scroll behavior after navigation
            setTimeout(() => {
              document.documentElement.style.scrollBehavior = 'auto';
            }, 500);
          }, 300);
        } else if (onClose) {
          // Modal mode - close the modal with a callback
          onClose(true, () => {
            // Optional: Add any additional logic after modal closes
            document.body.style.transition = 'opacity 300ms ease-in-out';
            document.body.style.opacity = '0';
            
            setTimeout(() => {
              document.body.style.opacity = '1';
            }, 50);
          });
        }
      }, 1500); // 1.5 second delay before navigation
    } catch (error) {
      console.error('Error saving revenue data:', error);
      showToast('Failed to save revenue data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeedbackHistory = async (revenueId) => {
    try {
      const feedbacks = await revenueService.getFeedbacksByRevenue(revenueId);
      setFeedbackHistory(feedbacks);
    } catch (err) {
      console.error("Error loading feedback history", err);
    }
  };

  const basicFields = [
    { id: 'candidate', label: 'Candidate Name', type: 'text' },
    { id: 'employeeName', label: 'Employee Name', type: 'text' },
    { id: 'clientName', label: 'Client Name', type: 'text' },
    { id: 'location', label: 'Location', type: 'text' },
    { id: 'profileStatus', label: 'Profile Status', type: 'select', options: ['', 'Joined', 'Abscond'] },
  ];

  const additionalFields = [
    { id: 'joiningDate', label: 'Joining Date', type: 'date' },
    { id: 'accountableCTC', label: 'Accountable CTC', type: 'number', prefix: '₹' },
    { id: 'offerCTC', label: 'Offer CTC', type: 'number', prefix: '₹' },
    { id: '% / ₹', label: '% / ₹', type: 'text', title: 'Percentage / Amount' },
    { id: 'revenue', label: 'Revenue', type: 'number', prefix: '₹', readonly: true },
    { id: 'revenueStatus', label: 'Revenue Status', type: 'select', options: ['', 'Processing', 'Claimed', 'Pending'] },
    { id: 'itbrDate', label: 'ITBR Date', title: 'Invoice To Be Raised Date', type: 'date' },
    { id: 'erdDate', label: 'ERD Date', title: 'Expected Revenue Date', type: 'date' },
    { id: 'brDate', label: 'BR Date', title: 'Business Report Date', type: 'date' },
    // { id: 'invoiceNumber', label: 'Invoice Number', type: 'text' },
  ];

  return (
    <div className="flex items-start justify-center">
      <Toaster position="top-center" />
      <div className="w-full">
        <form onSubmit={handleSubmit} className="">
          <div className="flex gap-2">
            {/* Left Side - Basic Fields (Vertical Layout) */}
            <div className={`transition-all duration-500 ${showAdditionalFields ? 'w-1/3' : 'w-full'}`}>
              <div className={`${showAdditionalFields ? 'grid-cols-1' : 'grid grid-cols-2 gap-4'}`}>
                <div>
                  <div className="bg-white p-2 rounded-lg">
                    <h3 className={sectionTitleStyle}>Basic Information</h3>
                    {showAdditionalFields ? (
                      // Show as text summary when additional fields are visible
                      <div className="space-y-4 transition-all duration-300">
                        <div className='grid grid-cols-2 gap-3'>
                        <div className="text-sm text-left">
                          <span className="font-medium text-gray-700">Candidate Name:</span>
                          <span className="ml-2 text-gray-900">{formData.candidate || 'Not specified'}</span>
                        </div>
                        <div className="text-sm text-left">
                          <span className="font-medium text-gray-700">Employee:</span>
                          <span className="ml-2 text-gray-900">{formData.employeeName || 'Not specified'}</span>
                        </div>
                        <div className="text-sm text-left">
                          <span className="font-medium text-gray-700">Client:</span>
                          <span className="ml-2 text-gray-900">{formData.clientName || 'Not specified'}</span>
                        </div>
                        <div className="text-sm text-left">
                          <span className="font-medium text-gray-700">Location:</span>
                          <span className="ml-2 text-gray-900">{formData.location || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          <label htmlFor="profileStatus" className="font-medium text-gray-700 whitespace-nowrap">
                            Status:
                          </label>
                          <select
                            id="profileStatus"
                            name="profileStatus"
                            value={formData.profileStatus}
                            onChange={handleChange}
                            className={inputStyle}
                          >
                            {(basicFields.find(field => field.id === 'profileStatus')?.options || []).map(option => (
                              <option key={option} value={option}>
                                {option || 'Select Status'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      </div>
                    ) : (
                      // Show as form fields vertically
                      <div className={`space-y-6 ${isPage ? 'p-4' : ''}`}>
                        {basicFields.map((field) => (
                          <div key={field.id} className="transition-all duration-300">
                            <label htmlFor={field.id} className={labelStyle}>{field.label}</label>
                            {field.type === 'select' ? (
                              <select
                                id={field.id}
                                name={field.id}
                                value={formData[field.id]}
                                onChange={handleChange}
                                className={inputStyle}
                              >
                                {field.options.map(option => (
                                  <option key={option} value={option}>
                                    {option || 'Select Status'}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={field.type}
                                id={field.id}
                                name={field.id}
                                value={formData[field.id]}
                                onChange={handleChange}
                                className={inputStyle}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                readOnly={['candidate', 'employeeName', 'clientName'].includes(field.id)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </div>

                {/* Feedback Section */}
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      Feedback
                      <span className="mx-2 text-gray-400">-</span>
                      <button
                        type="button"
                        onClick={() => setShowFeedbackModal(true)}
                        className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Feedback
                      </button>
                    </h3>
                  </div>
                  <div className="border-t border-gray-200 mb-2"></div>
                  <div className="p-2 rounded-md">
                    <div className="space-y-2">
                      <div>
                        <label htmlFor="feedback" className={labelStyle}>
                          Add Feedback <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="feedback"
                          name="feedback"
                          value={formData.feedback}
                          onChange={handleChange}
                          className={inputStyle}
                          rows="3"
                          placeholder="Enter your feedback..."
                          required
                        />
                        {/* Feedback will be submitted with the main form */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              
            </div>

            {/* Right Side - Additional Fields */}
            {showAdditionalFields && (
              <div className="w-2/3 overflow-hidden transition-all duration-500">
                <div className="bg-white p-2 rounded-lg overflow-y-auto">
                  <h3 className={sectionTitleStyle}>Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {additionalFields.map((field) => (
                      <div key={field.id} className="relative transition-all duration-300">
                        {/* Special % / ₹ handling */}
                        {field.id === "% / ₹" ? (
                          <>
                            <div className="flex space-x-2 mb-1">
                              <button
                                type="button"
                                onClick={() => setPercentOrAmount("%")}
                                className={`px-3 py-1 text-sm font-medium rounded-lg transition ${
                                  percentOrAmount === "%" 
                                    ? "bg-blue-700 text-white" 
                                    : "bg-gray-200 text-gray-700 hover:bg-blue-400 hover:text-white"
                                }`}
                              >
                                %
                              </button>
                              <button
                                type="button"
                                onClick={() => setPercentOrAmount("₹")}
                                className={`px-3 py-1 text-sm font-medium rounded-lg transition ${
                                  percentOrAmount === "₹" 
                                    ? "bg-yellow-500 text-white" 
                                    : "bg-gray-200 text-gray-700 hover:bg-yellow-400 hover:text-white"
                                }`}
                              >
                                ₹
                              </button>
                            </div>
                            {percentOrAmount === "%" ? (
                              <div className="relative">
                                <input
                                  type="number"
                                  id="percentageInput"
                                  name="percentageInput"
                                  value={formData.percentageInput || ""}
                                  onChange={handleChange}
                                  className={`${inputStyle} pr-6 ${isAbscond ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                  placeholder="Enter % value"
                                  disabled={isAbscond}
                                />
                                <span className="absolute right-3 top-2 text-gray-500">%</span>
                              </div>
                            ) : (
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">₹</span>
                                <input
                                  type="number"
                                  id="amountInput"
                                  name="amountInput"
                                  value={formData.amountInput || ""}
                                  onChange={handleChange}
                                  className={`${inputStyle} pl-8 ${isAbscond ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                  placeholder="Enter amount"
                                  disabled={isAbscond}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <label 
                            htmlFor={field.id} 
                            className={labelStyle}
                            title={field.title || field.label}
                          >
                            {field.label}
                            {field.id === 'joiningDate' && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                            {field.type === "select" ? (
                              <select
                                id={field.id}
                                name={field.id}
                                value={formData[field.id]}
                                onChange={handleChange}
                                className={`${inputStyle} ${isAbscond ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                disabled={isAbscond}
                              >
                                {field.options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt || "Select Status"}
                                  </option>
                                ))}
                              </select>
                            ) : field.type === "date" ? (
                              <input
                                type="date"
                                className={`${inputStyle} cursor-pointer ${isAbscond ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                value={formData[field.id] ? new Date(formData[field.id]).toISOString().split('T')[0] : ''}
                                onChange={(e) => !isAbscond && setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                onClick={(e) => !isAbscond && e.target.showPicker && e.target.showPicker()}
                                placeholder={`Select ${field.label}`}
                                disabled={isAbscond}
                                required={field.id === 'joiningDate' && !isAbscond}
                              />
                            ) : field.prefix ? (
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">
                                  {field.prefix}
                                </span>
                                <input
                                  type="text"
                                  id={field.id}
                                  name={field.id}
                                  value={getDisplayValue(field.id, formData[field.id])}
                                  onChange={handleChange}
                                  readOnly={field.readonly || isAbscond || false}
                                  className={`${inputStyle} pl-8 ${(field.readonly || isAbscond) ? "bg-gray-100 cursor-not-allowed" : ""
                                  }`}
                                  placeholder={field.type === "number" ? "0.00" : ""}
                                  inputMode={field.type === "number" ? "numeric" : "text"}
                                />
                              </div>
                            ) : (
                              <input
                                type={field.type === "number" ? "text" : field.type}
                                id={field.id}
                                name={field.id}
                                value={field.type === "number" ? getDisplayValue(field.id, formData[field.id]) : formData[field.id]}
                                onChange={handleChange}
                                readOnly={field.readonly || isAbscond || false}
                                className={`${inputStyle} ${(field.readonly || isAbscond) ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                inputMode={field.type === "number" ? "numeric" : field.type === "email" ? "email" : "text"}
                              />
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submission Button */}
          <div className="p-3 border-t border-gray-100">
          <div className="w-full">
            <div className="flex justify-end gap-4  transition-all duration-300">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof onClose === 'function') {
                    onClose(false); // Pass false to indicate no refresh needed
                  } else {
                    // Fallback behavior if onClose is not provided
                    if (window.history.length > 1) {
                      navigate(-1);
                    } else {
                      window.close();
                    }
                  }
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 flex items-center hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Revenue'
                )}
              </button>
            </div>
          </div>
          </div>
        </form>
        {showFeedbackModal && (
          <FeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
            candidate={candidate}
            clientJobId={candidate?.client_job_id || (candidate.client_jobs && candidate.client_jobs[0]?.id)}
          />
        )}
      </div>
    </div>
  );
};

export default EditRevenueForm;
