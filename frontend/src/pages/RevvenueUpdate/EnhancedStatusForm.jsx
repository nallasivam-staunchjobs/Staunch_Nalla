import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Info, Edit, Trash2, Plus, Minus, Eye } from 'lucide-react';
import { useApi } from '../NewDtr/hooks/useApi';
import { revenueService } from '../../api/revenueService';
import FeedbackModal from '../NewDtr/components/FeedbackModal';

// Format number with commas
const formatNumber = (num) => {
  if (num === '' || num === null || num === undefined) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Parse formatted number string back to number
const parseFormattedNumber = (str) => {
  if (!str) return '';
  return str.replace(/,/g, '');
};

const inputStyle = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const labelStyle = 'block text-left text-sm font-medium text-gray-700 mb-1';
const sectionTitleStyle = 'text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200';

// Get automatic feedback suggestion based on profile and revenue status
const getAutoFeedbackSuggestion = (profileStatus, revenueStatus) => {
  if (profileStatus === 'Abscond') {
    return 'He left the system within 90 days';
  }

  if (profileStatus === 'Joined') {
    if (revenueStatus === 'Processing') return 'He joined';
    if (revenueStatus === 'Claimed') return 'Payment received as per invoices, need to wait for the 90 days clause';
    if (revenueStatus === 'Pending') return 'Expected revenue date crossed';
  }

  return null;
};

const EnhancedStatusForm = ({ candidate, onClose, onStatusChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    candidateId: null,
    candidate: '',
    employeeName: '',
    clientName: '',
    profileStatus: 'Joined',

    joiningDate: '',
    accountableCTC: '',
    offerCTC: '',
    percentageInput: "",
    amountInput: "",
    revenue: '',
    revenueStatus: 'Processing',
    itbrDate: '',
    erdDate: '',
    brDate: '',
    invoiceNumber: '',
    feedback: ''
  });

  // Track if user has manually edited the feedback field
  const [feedbackTouched, setFeedbackTouched] = useState(false);

  const [showAdditionalFields, setShowAdditionalFields] = useState(true);
  const isAbscond = formData.profileStatus === 'Abscond';
  const [percentOrAmount, setPercentOrAmount] = useState('%'); // default %
  const { candidates, clientJobs } = useApi();
  const [editingId, setEditingId] = useState(null);
  const [revenues, setRevenues] = useState([]);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [currentRevenueId, setCurrentRevenueId] = useState(null);
  const navigate = useNavigate();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use passed candidate data if available, otherwise fetch from API
        if (candidate && candidate.backendData) {
          const candidateData = candidate.backendData;

          // Helper function to parse dates
          const parseDate = (dateString) => {
            if (!dateString) return null;
            try {
              return new Date(dateString);
            } catch {
              return null;
            }
          };

          setFormData((prev) => ({
            ...prev,
            candidateId: candidateData.id,
            candidate: candidateData.candidate_name || candidate.candidateName || "",
            employeeName: candidateData.executive_display || candidate.executiveName || "",
            clientName: (candidateData.client_jobs && candidateData.client_jobs[0]?.client_name) || candidateData.client_name || "",
            profileStatus: 'Joined',
            location: [candidateData.city, candidateData.state].filter(Boolean).join(', ') || "",
            joiningDate: candidateData.joining_date || "",
            accountableCTC: candidateData.accountable_ctc || "",
            offerCTC: candidateData.offer_ctc || "",
            percentageInput: candidateData.percentage || "",
            amountInput: candidateData.amount || "",
            revenue: candidateData.revenue || "",
            revenueStatus: candidateData.revenue_status || "Processing",
            itbrDate: candidateData.itbr_date || "",
            erdDate: candidateData.erd_date || "",
            brDate: candidateData.br_date || "",
            invoiceNumber: candidateData.invoice_number || "",
          }));

          // Set the percentage/amount toggle based on existing data
          if (candidateData.percentage && candidateData.percentage > 0) {
            setPercentOrAmount('%');
          } else if (candidateData.amount && candidateData.amount > 0) {
            setPercentOrAmount('₹');
          }
        } else {
          // Fallback to fetching first candidate if no candidate prop provided
          const allCandidates = await candidates.getAll();

          if (allCandidates.length > 0) {
            const firstCandidate = allCandidates[0];
            setFormData((prev) => ({
              ...prev,
              candidateId: firstCandidate.id,
              candidate: firstCandidate.candidate_name || "",
              employeeName: firstCandidate.executive_name || "",
            }));

            const jobs = await clientJobs.getByCandidate(firstCandidate.id);
            if (jobs.length > 0) {
              setFormData((prev) => ({
                ...prev,
                clientName: jobs[0].client_name || "",
              }));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
  }, [candidate]);


  useEffect(() => {
    const fetchRevenues = async () => {
      if (formData.candidateId) {
        const data = await revenueService.getRevenuesByCandidate(formData.candidateId);
        setRevenues(data);
      }
    };
    fetchRevenues();
  }, [formData.candidateId]);


  // Auto-fill feedback on initial load or when status fields change
  // Only when user has NOT manually edited the feedback yet
  useEffect(() => {
    if (!feedbackTouched && (!formData.feedback || !formData.feedback.trim())) {
      const suggestion = getAutoFeedbackSuggestion(formData.profileStatus, formData.revenueStatus);
      if (suggestion) {
        setFormData(prev => ({
          ...prev,
          feedback: suggestion,
        }));
      }
    }
  }, [formData.profileStatus, formData.revenueStatus, formData.feedback, feedbackTouched]);


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

  // Update handleChange to handle formatted numbers
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle profile status separately
    if (name === "profileStatus") {
      setFormData(prev => {
        const updated = {
          ...prev,
          profileStatus: value
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

    // Skip number formatting for other non-numeric fields
    if (['candidate', 'employeeName', 'clientName', 'revenueStatus', 'invoiceNumber', 'feedback'].includes(name)) {
      if (name === 'revenueStatus') {
        setFormData(prev => {
          const updated = {
            ...prev,
            revenueStatus: value
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
          feedback: value
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
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
  useEffect(() => {
    setFormData(prev => {
      const offer = parseFloat(prev.offerCTC) || 0;
      let revenueValue = "";

      if (percentOrAmount === "%") {
        const percentage = parseFloat(prev.percentageInput) || 0;
        revenueValue = offer > 0 ? ((offer * percentage) / 100).toFixed(2) : "";
      } else if (percentOrAmount === "₹") {
        const amount = parseFloat(prev.amountInput) || 0;
        revenueValue = amount > 0 ? amount.toFixed(2) : "";
      }

      return {
        ...prev,
        revenue: revenueValue
      };
    });
  }, [formData.offerCTC, formData.percentageInput, formData.amountInput, percentOrAmount]);



  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Function to update client job status
    const updateClientJobStatus = async (candidateId, status) => {
      try {
        if (!candidateId || !status) {
          console.warn('Missing candidateId or status for job status update');
          return;
        }
        await revenueService.updateClientJobStatus(candidateId, status);
        console.log('Successfully updated client job status');
      } catch (error) {
        console.error('Error updating client job status:', error);
        // Don't rethrow the error to prevent blocking the main operation
      }
    };

    const formatDate = (dateString) => {
      // For optional dates, send null (not empty string) when no value is provided
      if (!dateString) return null;

      // If it's already in YYYY-MM-DD format, return as is
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
      }

      // Try to parse other date formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    console.log('Form feedback value:', formData.feedback);
    console.log('Date values:', {
      joiningDate: formData.joiningDate,
      itbrDate: formData.itbrDate,
      erdDate: formData.erdDate,
      brDate: formData.brDate
    });

    // Helper to parse numeric values from formatted strings
    const parseFormattedNumber = (str) => {
      if (!str) return 0;
      // Remove all non-numeric characters except decimal point
      const numStr = String(str).replace(/[^0-9.]/g, '');
      return parseFloat(numStr) || 0;
    };

    if (!formData.candidateId) {
      console.error('No candidate ID found');
      toast.error('Error: No candidate selected');
      return;
    }

    // Require joining date for non-Abscond profiles
    if (formData.profileStatus !== 'Abscond' && !formData.joiningDate) {
      toast.error('Joining Date is required');
      setIsLoading(false);
      return;
    }

    // Require feedback for all submissions
    if (!formData.feedback || !formData.feedback.trim()) {
      toast.error('Feedback is required');
      setIsLoading(false);
      return;
    }

    // Validate revenue / percentage / amount against Offer CTC (for non-Abscond)
    if (formData.profileStatus !== 'Abscond') {
      const offer = parseFormattedNumber(formData.offerCTC);
      const percentage = parseFormattedNumber(formData.percentageInput);
      const amount = parseFormattedNumber(formData.amountInput);
      const revenue = parseFormattedNumber(formData.revenue);

      const hasPercentage = percentage > 0;
      const hasAmount = amount > 0;

      // Require that the currently selected input (% or ₹) has a value.
      if (percentOrAmount === '%' && !hasPercentage) {
        toast.error('Please enter a percentage value');
        setIsLoading(false);
        return;
      }

      if (percentOrAmount === '₹' && !hasAmount) {
        toast.error('Please enter a revenue amount');
        setIsLoading(false);
        return;
      }

      if (offer <= 0 && (percentage > 0 || amount > 0 || revenue > 0)) {
        toast.error('Please enter a valid Offer CTC before calculating revenue');
        setIsLoading(false);
        return;
      }

      if (offer > 0) {
        if (percentOrAmount === '%') {
          if (percentage <= 0 || percentage > 100) {
            toast.error('Please enter a valid percentage between 0 and 100');
            setIsLoading(false);
            return;
          }

          const expectedRevenue = (offer * percentage) / 100;
          const diff = Math.abs(expectedRevenue - revenue);

          if (diff > 1) {
            toast.error('Revenue does not match Offer CTC and percentage');
            setIsLoading(false);
            return;
          }
        } else if (percentOrAmount === '₹') {
          if (amount <= 0) {
            toast.error('Please enter a valid revenue amount');
            setIsLoading(false);
            return;
          }

          if (amount > offer) {
            toast.error('Revenue amount cannot be greater than Offer CTC');
            setIsLoading(false);
            return;
          }

          const diff = Math.abs(amount - revenue);

          if (diff > 1) {
            toast.error('Revenue should be equal to entered amount');
            setIsLoading(false);
            return;
          }
        }
      }
    }

    const isAbscond = formData.profileStatus === 'Abscond';

    // Decide which value to send based on the active toggle (% or ₹)
    let percentageValue = null;
    let amountValue = null;

    if (!isAbscond) {
      if (percentOrAmount === '%') {
        percentageValue = parseFormattedNumber(formData.percentageInput);
      } else if (percentOrAmount === '₹') {
        amountValue = parseFormattedNumber(formData.amountInput);
      }
    }

    const payload = {
      candidate: parseInt(formData.candidateId),

      // For 'Abscond' we do not require / use these values; send safe defaults
      joining_date: isAbscond ? null : formatDate(formData.joiningDate),
      accountable_ctc: isAbscond ? 0 : parseFormattedNumber(formData.accountableCTC),
      offer_ctc: isAbscond ? 0 : parseFormattedNumber(formData.offerCTC),
      percentage: percentageValue,
      amount: amountValue,
      revenue: isAbscond ? 0 : parseFormattedNumber(formData.revenue),
      revenue_status: isAbscond ? '' : formData.revenueStatus,

      // Pass profilestatus so backend can sync ClientJob.profilestatus
      profilestatus: formData.profileStatus,

      itbr_date: isAbscond ? null : formatDate(formData.itbrDate),
      erd_date: isAbscond ? null : formatDate(formData.erdDate),
      br_date: isAbscond ? null : formatDate(formData.brDate),
      invoice_number: isAbscond ? null : (formData.invoiceNumber || null),
      // feedback removed - handled separately
    };

    console.log('Payload to be sent:', payload);




    try {
      let revenueId;
      let revenueSaved = false;

      // Main revenue creation/update
      if (editingId) {
        await revenueService.updateRevenue(editingId, payload);
        revenueId = editingId;
        setEditingId(null);
        revenueSaved = true;
        console.log('Revenue updated successfully');
      } else {
        const newRevenue = await revenueService.createRevenue(payload);
        revenueId = newRevenue.id;
        revenueSaved = true;
        console.log('Revenue created successfully');
      }

      // Handle feedback separately if provided
      if (formData.feedback.trim() && revenueId) {
        try {
          await revenueService.createFeedback({
            candidate_revenue: revenueId,
            feedback: formData.feedback
          });
          console.log('Feedback created successfully');
        } catch (feedbackError) {
          console.error('Error creating feedback:', feedbackError);
          // Don't fail the entire submission if feedback fails
        }
      }

      // Try to update client job status
      if (formData.candidateId && formData.profileStatus) {
        try {
          await updateClientJobStatus(formData.candidateId, formData.profileStatus);
        } catch (statusError) {
          console.error('Error updating client job status:', statusError);
          // Don't fail the submission for this
        }
      }

      // Try to refresh the list, but don't fail if it errors
      try {
        const updatedList = await revenueService.getRevenuesByCandidate(formData.candidateId);
        setRevenues(updatedList);
        setCurrentRevenueId(revenueId);
      } catch (listError) {
        console.error('Error refreshing revenue list:', listError);
        // Don't fail the submission for this
      }

      // Try to load feedback history, but don't fail if it errors
      if (revenueId) {
        try {
          loadFeedbackHistory(revenueId);
        } catch (historyError) {
          console.error('Error loading feedback history:', historyError);
          // Don't fail the submission for this
        }
      }

      // Show success message and close modal
      toast.success(`Revenue has been marked for ${formData.candidate || ''}`);

      // Navigate to itbrview after a short delay
      setTimeout(() => {
        window.location.href = '/itbrview';
      }, 1000);

      // Reset form
      setFormData(prev => ({
        ...prev,
        feedback: "",
        profileStatus: 'Joined',

        joiningDate: null,
        percentageInput: "",
        amountInput: "",
        revenue: '',
        revenueStatus: '',
        itbrDate: null,
        erdDate: null,
        brDate: null,
        invoiceNumber: ''
      }));

      // Close modal after short delay
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 1500);

    } catch (err) {
      console.error("Error saving revenue", err);
      toast.error('Failed to save revenue data. Please try again.');
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

  const handleFeedbackSubmit = async () => {
    if (formData.feedback.trim() && currentRevenueId) {
      try {
        await revenueService.createFeedback({
          candidate_revenue: currentRevenueId,
          feedback: formData.feedback
        });
        setFormData(prev => ({ ...prev, feedback: '' }));
        loadFeedbackHistory(currentRevenueId);
      } catch (err) {
        console.error("Error submitting feedback", err);
      }
    }
  };

  const basicFields = [
    { id: 'candidate', label: 'Candidate Name', type: 'text' },
    { id: 'employeeName', label: 'Employee Name', type: 'text' },
    { id: 'clientName', label: 'Client Name', type: 'text' },
    { id: 'profileStatus', label: 'Profile Status', type: 'select', options: ['', 'Joined', 'Abscond'] },
  ];

  const additionalFields = [
    { id: 'joiningDate', label: 'Joining Date', type: 'date' },
    { id: 'accountableCTC', label: 'Accountable CTC', type: 'number', prefix: '₹' },
    { id: 'offerCTC', label: 'Offer CTC', type: 'number', prefix: '₹' },
    { id: '% / $', label: '% / $', type: 'text', title: 'Percentage / Amount' },
    { id: 'revenue', label: 'Revenue', type: 'number', prefix: '₹' },
    { 
      id: 'revenueStatus', 
      label: 'Revenue Status', 
      type: 'select', 
      options: ['', 'Processing', 'Claimed', 'Pending'],
      disabled: formData.profileStatus === 'Abscond'
    },
    { id: 'itbrDate', label: 'ITBR Date', title: 'Invoice To Be Raised Date', type: 'date' },
    { id: 'erdDate', label: 'ERD Date', title: 'Expected Revenue Date', type: 'date' },
    { id: 'brDate', label: 'BR Date', title: 'Business Report Date', type: 'date' },
    // { id: 'invoice', label: 'Invoice', type: 'file' },
    // { id: 'invoiceNumber', label: 'Invoice Number', type: 'text' },
  ];


  return (

    <div className="">
      {/* Header with Title and Action Buttons */}
      <form onSubmit={handleSubmit} id="revenue-form" className="">
        <div className="flex gap-2">
          {/* Left Side - Basic Fields (Vertical Layout) */}
          <div className={`transition-all duration-500  ${showAdditionalFields ? 'w-1/3' : ' w-full'}`}>
            <div className={`${showAdditionalFields ? 'grid-cols-1' : 'grid grid-cols-2 gap-4'}`}>

              <div>
                <div className=" p-2 rounded-md">
                  <h3 className={sectionTitleStyle}>Basic Information</h3>

                  {showAdditionalFields ? (
                    // Show as text summary when additional fields are visible
                    <div className="space-y-4 transition-all duration-300">
                      <div className='grid grid-cols-2 gap-4'>
                      <div className="text-sm text-left">
                        <span className="font-medium  text-gray-700">Candidate Name:</span>
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
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <label
                          htmlFor="profileStatus"
                          className="font-medium text-gray-700 whitespace-nowrap"
                        >
                          Status:
                        </label>
                        <select
                          id="profileStatus"
                          name="profileStatus"
                          value={formData.profileStatus}
                          onChange={handleChange}
                          className="px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors w-40"
                        >
                          {basicFields[3].options.map(option => (
                            <option key={option} value={option}>
                              {option || 'Select Status'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    // Show as form fields vertically
                    <div className="space-y-3">
                      {basicFields.map((field, index) => (
                        <div key={field.id} className="transition-all duration-300">
                          <label htmlFor={field.id} className={labelStyle}>{field.label}</label>
                          {field.type === 'select' ? (
                            <select
                              id={field.id}
                              name={field.id}
                              value={formData[field.id] || ''}
                              onChange={handleChange}
                              className={`${inputStyle} ${isAbscond || field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              disabled={isAbscond || field.disabled}
                            >
                              {field.options && field.options.map(option => (
                                <option key={option} value={option}>
                                  {option || 'Select...'}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              id={field.id}
                              name={field.id}
                              value={formData[field.id] || ''}
                              onChange={handleChange}
                              className={`${inputStyle} ${isAbscond || field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              disabled={isAbscond || field.disabled}
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
                      {/* <button
                          type="button"
                          onClick={handleFeedbackSubmit}
                          disabled={!formData.feedback.trim() || !currentRevenueId}
                          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Add Feedback
                        </button> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>

           
            
          </div>

          {/* Right Side - Additional Fields */}
          {showAdditionalFields && (
            <div className="w-2/3 overflow-hidden transition-all duration-500">
              <div className=" p-2 rounded-md overflow-y-auto">
                <h3 className={sectionTitleStyle}>Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {additionalFields.map((field) => (
                    <div
                      key={field.id}
                      className="relative transition-all duration-300"
                    >
                      {/* Special % / $ handling */}
                      {field.id === "% / $" ? (
                        <>
                          <div className="flex space-x-2 mb-1">
                            <button
                              type="button"
                              onClick={() => setPercentOrAmount("%")}
                              className={`px-3 py-1 text-sm font-medium rounded-lg transition 
              ${percentOrAmount === "%"
                                  ? "bg-blue-700 text-white"
                                  : "bg-gray-200 text-gray-700 hover:bg-blue-400 hover:text-white"
                                }`}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              onClick={() => setPercentOrAmount("₹")}
                              className={`px-3 py-1 text-sm font-medium rounded-lg transition 
    ${percentOrAmount === "₹"
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

                          {/* Dropdown */}
                          {field.type === "select" ? (
                            <select
                              id={field.id}
                              name={field.id}
                              value={formData[field.id]}
                              onChange={handleChange}
                              className={`${inputStyle} ${isAbscond || field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              disabled={isAbscond || field.disabled}
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
                              value={formData[field.id] || ''}
                              onChange={(e) => !isAbscond && setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                              onClick={(e) => !isAbscond && e.target.showPicker && e.target.showPicker()}
                              placeholder={`Select ${field.label}`}
                              disabled={isAbscond}
                              required={field.id === 'joiningDate' && !isAbscond}
                            />
                          ) : field.prefix ? (
                            /* Inputs with prefix (₹ for CTC etc.) */
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
                                className={`${inputStyle} pl-8 ${field.readonly || isAbscond ? "bg-gray-100 cursor-not-allowed" : ""
                                  }`}
                                placeholder={field.type === "number" ? "0.00" : ""}
                                inputMode={field.type === "number" ? "numeric" : "text"}
                                disabled={isAbscond}
                              />
                            </div>
                          ) : (
                            /* Regular input */
                            field.type === "file" ? (
                              <input
                                type="file"
                                id={field.id}
                                name={field.id}
                                onChange={handleChange}
                                className={`file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold ${
                                  isAbscond 
                                    ? 'file:bg-gray-100 file:text-gray-400 cursor-not-allowed' 
                                    : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
                                }`}
                                disabled={isAbscond}
                              />
                            ) : (
                              <input
                                type={field.type === "number" ? "text" : field.type}
                                id={field.id}
                                name={field.id}
                                value={field.type === "number" ? getDisplayValue(field.id, formData[field.id]) : formData[field.id]}
                                onChange={handleChange}
                                readOnly={field.readonly || isAbscond || false}
                                className={`${inputStyle} ${field.readonly || isAbscond ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                inputMode={field.type === "number" ? "numeric" : field.type === "email" ? "email" : "text"}
                                disabled={isAbscond}
                              />
                            )
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

        {/* Form Actions */}
        <div className="flex justify-end gap-4 mt-3 pb-4 px-2 border-t border-gray-200 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 border border-transparent text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          candidate={candidate}
          clientJobId={candidate?.client_job_id || (candidate.client_jobs && candidate.client_jobs[0]?.id)}
        />
      )}
    </div>
  );
};

export default EnhancedStatusForm;