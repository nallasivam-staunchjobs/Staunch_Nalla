import React, { useState, useEffect, useRef } from 'react';
import { saveFormProgress } from '../utils/localStorage';
import toast from 'react-hot-toast';
import { CustomDropdown } from '../../../components/UIComponents';
import { Phone, PhoneOff } from 'lucide-react';
import { useSelector } from 'react-redux';

import { useAppContext, useAppActions } from '../../../context/AppContext';
import ResumePreview from './ResumePreview';
import { useMasterData } from '../../../hooks/useMasterData';
import { useLocationDropdowns } from '../../../hooks/useLocationDropdowns';
import { CNASubmissionService } from '../services/cnaSubmissionService';
import { useCandidateIntegration } from '../hooks/useCandidateIntegration';

const FormStep1 = () => {
  const { state } = useAppContext();
  const actions = useAppActions();
  const { formData, resumeFile, resumePreview, currentStep, searchPreFillData, selectedCandidate } = state;
  const { masterData, loading: masterLoading, error: masterError } = useMasterData();
  const { 
    locationData, 
    loading: locationLoading, 
    error: locationError,
    getCitiesByState,
    getStatesByCountry 
  } = useLocationDropdowns();
  const { searchCandidates } = useCandidateIntegration();

  // Get user information from Redux for executive name functionality
  const user = useSelector((state) => state.auth);
  const executiveDisplayName = user?.firstName ;
  const executiveName = user?.employeeCode ;

  // State for mobile number duplicate checking
  const [mobileCheckResults, setMobileCheckResults] = useState({
    mobile1: null,
    mobile2: null
  });
  const [isCheckingMobile, setIsCheckingMobile] = useState({
    mobile1: false,
    mobile2: false
  });
  
  // Refs to store timeout IDs for each field
  const mobileCheckTimeouts = useRef({
    mobile1: null,
    mobile2: null
  });

  // Flag to track if resume parsing is in progress
  const [isResumeParsing, setIsResumeParsing] = useState(false);


  // State for tag inputs and errors
  const [tagInputs, setTagInputs] = useState({
    languages: '',
    skills: ''
  });
  const [tagErrors, setTagErrors] = useState({
    languages: '',
    skills: ''
  });

  // Expose setIsResumeParsing to global scope for ResumePreview component
  useEffect(() => {
    window.FormStep1Instance = {
      setIsResumeParsing: setIsResumeParsing
    };
    return () => {
      delete window.FormStep1Instance;
    };
  }, []);

  // Convert master data to dropdown format
  const genderOptions = masterData.genders.map(gender => ({
    value: gender.name,
    label: gender.name
  }));

  const sourceOptions = masterData.sources.map(source => ({
    value: source.name,
    label: source.name
  }));

  const communicationOptions = masterData.communications.map(communication => ({
    value: communication.name,
    label: communication.name
  }));

  const educationOptions = masterData.educations.map(education => ({
    value: education.name,
    label: education.name
  }));

  const experienceOptions = masterData.experiences.map(experience => ({
    value: experience.name,
    label: experience.name
  }));

  // Dynamic location options from API with proper structure
  const countryOptions = locationData.countries || [];
  
  // Filter states based on selected country
  const stateOptions = formData.country 
    ? getStatesByCountry(formData.country)
    : locationData.states || [];
  
  // Filter cities based on selected state
  const cityOptions = formData.state 
    ? getCitiesByState(formData.state)
    : locationData.cities || [];


  // Generate profile number if not exists
  useEffect(() => {
    if (!formData.profileNumber) {
      const generateProfileNumber = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const microseconds = performance.now().toString().replace('.', '').slice(-3);
        return `PROF-${timestamp}-${random}-${microseconds}`;
      };
      actions.updateFormField('profileNumber', generateProfileNumber());
    }
  }, [formData.profileNumber, actions]);

  // Auto-populate executive name field with logged-in user's information
  useEffect(() => {
    // Auto-populate executive name from Redux user data
    if (user?.firstName && !formData.executiveName) {
      actions.updateFormField('executiveName', user.firstName);
    }
  }, [user, formData.executiveName, actions]);

  // Check existing mobile numbers only on component mount
  useEffect(() => {
    // Only check on initial load, not on every formData change
    const checkInitialNumbers = () => {
      if (formData.mobile1 && formData.mobile1.length >= 10) {
        checkMobileNumber(formData.mobile1, 'mobile1');
      }
      if (formData.mobile2 && formData.mobile2.length >= 10) {
        checkMobileNumber(formData.mobile2, 'mobile2');
      }
    };
    
    // Only run once on mount
    checkInitialNumbers();
  }, []); // Empty dependency array to run only once

  // Handle search pre-fill data
  useEffect(() => {
    if (searchPreFillData) {
      let preFilledFields = [];

      // Handle multiple fields from search pre-fill data
      Object.keys(searchPreFillData).forEach(key => {
        if (key !== 'searchTerm' && key !== 'timestamp' && searchPreFillData[key]) {
          // Only pre-fill if the field is currently empty
          if (!formData[key]) {
            actions.updateFormField(key, searchPreFillData[key]);
            preFilledFields.push(key);
          }
        }
      });

      // Only show toast once when fields are actually pre-filled
      if (preFilledFields.length > 0) {
        const fieldNames = preFilledFields.map(field => {
          switch (field) {
            case 'mobile1': return 'primary mobile';
            case 'mobile2': return 'secondary mobile';
            case 'email': return 'email';
            case 'candidateName': return 'candidate name';
            default: return field;
          }
        }).join(', ');

        // Removed toast message for pre-fill notification
      }
    }
  }, [searchPreFillData, formData, actions]);

  // Handle default country and candidate data pre-fill
  useEffect(() => {
    // Set default country to India if not already set
    if (!formData.country) {
      actions.updateFormField('country', 'India');
    }

    // Pre-fill state and city from selectedCandidate if available
    if (selectedCandidate) {
      // Pre-fill state if available and not already set
      if (selectedCandidate.state && !formData.state) {
        actions.updateFormField('state', selectedCandidate.state);
      }
      
      // Pre-fill city if available and not already set
      if (selectedCandidate.city && !formData.city) {
        actions.updateFormField('city', selectedCandidate.city);
      }
    }
  }, [selectedCandidate, formData.country, formData.state, formData.city, actions]);


  // Auto-check mobile number for duplicates
  const checkMobileNumber = async (mobileNumber, fieldName) => {
    if (!mobileNumber || mobileNumber.length < 10) {
      setMobileCheckResults(prev => ({
        ...prev,
        [fieldName]: null
      }));
      return;
    }

    setIsCheckingMobile(prev => ({
      ...prev,
      [fieldName]: true
    }));

    try {
      console.log(`Checking mobile number: ${mobileNumber} for field: ${fieldName}`);
      const results = await searchCandidates(mobileNumber);
      console.log(`Search results for ${mobileNumber}:`, results);
      
      if (results && results.length > 0) {
        // Found duplicate mobile number
        const duplicateCandidate = results[0];
        console.log(`Duplicate found for ${fieldName}:`, duplicateCandidate);
        
        // Force state update to ensure UI reflects the duplicate status
        setTimeout(() => {
          setMobileCheckResults(prev => ({
            ...prev,
            [fieldName]: {
              isDuplicate: true,
              candidate: duplicateCandidate,
              message: 'Mobile number already exists'
            }
          }));
        }, 100);
        
        toast.error('Mobile number already exists', {
          duration: 4000
        });
      } else {
        // No duplicate found
        console.log(`No duplicate found for ${fieldName}`);
        setMobileCheckResults(prev => ({
          ...prev,
          [fieldName]: {
            isDuplicate: false,
            message: '' // No message shown for valid numbers
          }
        }));
      }
    } catch (error) {
      console.error('Error checking mobile number:', error);
      setMobileCheckResults(prev => ({
        ...prev,
        [fieldName]: {
          isDuplicate: false,
          message: 'Error checking mobile number'
        }
      }));
    } finally {
      setIsCheckingMobile(prev => ({
        ...prev,
        [fieldName]: false
      }));
    }
  };

  // Smart dropdown handlers that store names and clear dependent fields
  const handleCountryChange = (selected) => {
    const countryName = selected ? selected.value : ''; // Country already uses name as value
    actions.updateFormField('country', countryName);
    
    // Clear state and city when country changes
    if (formData.state) {
      actions.updateFormField('state', '');
    }
    if (formData.city) {
      actions.updateFormField('city', '');
    }
  };

  const handleStateChange = (selected) => {
    const stateName = selected ? selected.value : ''; // Use value directly since it's now the state name
    actions.updateFormField('state', stateName);
    
    // Clear city when state changes
    if (formData.city) {
      actions.updateFormField('city', '');
    }
  };

  const handleCityChange = (selected) => {
    const cityName = selected ? selected.city : ''; // Extract city name from object
    actions.updateFormField('city', cityName);
    
    // Trigger city matching logic when city is selected
    if (cityName) {
      checkCityMatching(cityName);
    }
  };

  // State for city matching status
  const [cityMatchStatus, setCityMatchStatus] = useState(null);

  // City matching logic for candidate placement
  const checkCityMatching = async (candidateCity) => {
    // Get employee's working city from user context
    const employeeCode = user?.employeeCode;
    
    if (!employeeCode || !candidateCity) {
      console.log('[CITY MATCH] Missing employee code or candidate city');
      setCityMatchStatus(null);
      return;
    }

    console.log(`[CITY MATCH] Checking city match for employee: ${employeeCode}, candidate city: ${candidateCity}`);
    
    try {
      // Fetch employee's assigned working city from backend
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/empreg/employees/?employeeCode=${employeeCode}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const employeeData = await response.json();
        // Assuming the API returns employee's assigned city
        const employeeCity = employeeData.assignedCity || employeeData.workingCity;
        
        if (employeeCity) {
          const isMatch = candidateCity.toLowerCase() === employeeCity.toLowerCase();
          
          setCityMatchStatus({
            isMatch: isMatch,
            employeeCity: employeeCity,
            candidateCity: candidateCity,
            placement: isMatch ? 'onplan' : 'onothers'
          });
          
          console.log(`[CITY MATCH] Result: ${isMatch ? 'MATCH' : 'NO MATCH'} - Employee: ${employeeCity}, Candidate: ${candidateCity}`);
          
          // Store the matching info in form data for backend processing
          actions.updateFormField('cityMatchingInfo', {
            employeeCode: employeeCode,
            employeeCity: employeeCity,
            candidateCity: candidateCity,
            isMatch: isMatch,
            placement: isMatch ? 'onplan' : 'onothers',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('[CITY MATCH] Error fetching employee data:', error);
      setCityMatchStatus(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target
    actions.updateFormField(name, value)

    // Auto-check mobile numbers for duplicates
    if (name === 'mobile1' || name === 'mobile2') {
      // Skip duplicate check if resume parsing is in progress
      if (isResumeParsing) {
        return;
      }

      // Clear previous results when user starts typing
      setMobileCheckResults(prev => ({
        ...prev,
        [name]: null
      }));
      
      // Clear existing timeout for this specific field
      if (mobileCheckTimeouts.current[name]) {
        clearTimeout(mobileCheckTimeouts.current[name]);
      }
      
      // Only check if number has 10+ digits, otherwise keep results cleared
      if (value && value.length >= 10) {
        // Set new timeout for this specific field
        mobileCheckTimeouts.current[name] = setTimeout(() => {
          checkMobileNumber(value, name);
        }, 1000); // 1 second debounce
      } else {
        // Ensure results stay cleared for numbers less than 10 digits
        setMobileCheckResults(prev => ({
          ...prev,
          [name]: null
        }));
      }
    }
  };

  // Unified tag input handler
  const handleTagInputChange = (e, field) => {
    setTagInputs(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Clear error when typing
    if (tagErrors[field]) {
      setTagErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Add tag to Redux store
  const handleAddTag = (field) => {
    const value = tagInputs[field].trim();

    if (!value) {
      setTagErrors(prev => ({
        ...prev,
        [field]: 'Cannot be empty'
      }));
      return;
    }

    // Check for duplicates (case-insensitive)
    const isDuplicate = formData[field].some(
      existing => existing.toLowerCase() === value.toLowerCase()
    );

    if (isDuplicate) {
      setTagErrors(prev => ({
        ...prev,
        [field]: 'Already exists'
      }));
      return;
    }

    // Update form data with new tag
    const updatedTags = [...formData[field], value];
    actions.updateFormField(field, updatedTags);
    setTagInputs(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  // Handle key events for tags
  const handleTagKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(field);
    }
  };

  // Handle blur events for tags
  const handleTagBlur = (field) => {
    if (tagInputs[field].trim()) {
      handleAddTag(field);
    }
  };

  // Remove tag from form data
  const handleRemoveTag = (field, index) => {
    const updatedTags = formData[field].filter((_, i) => i !== index);
    actions.updateFormField(field, updatedTags);
  };

  const handleDobChange = (e) => {
    const dob = e.target.value
    
    // Calculate age
    if (dob) {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Validate minimum age (18 years)
      if (age < 18) {
        toast.error('Candidate must be at least 18 years old', {
          duration: 4000
        });
        return; // Don't update if age is less than 18
      }
      
      actions.updateFormField('dob', dob);
      actions.updateFormField('age', age.toString());
    } else {
      actions.updateFormField('dob', dob);
      actions.updateFormField('age', '');
    }
  }

  const handlePincodeChange = (e) => {
    const pincode = e.target.value
    actions.updateFormField('pincode', pincode)

    if (pincode.length === 6) {
      setTimeout(() => {
        actions.updateFormField('state', formData.state)
        actions.updateFormField('city', formData.city)
        actions.updateFormField('country', formData.country)
      }, 800)
    }
  }

  const nextStep = async () => {
    // Validate required field: Candidate Name
    if (!formData.candidateName || formData.candidateName.trim() === '') {
      toast.error('Please enter Candidate Name', {
        duration: 4000
      });
      return;
    }

    // Validate required field: Primary Number
    if (!formData.mobile1 || formData.mobile1.trim() === '') {
      toast.error('Please enter Primary Number', {
        duration: 4000
      });
      return;
    }

    // Validate required field: Email
    if (!formData.email || formData.email.trim() === '') {
      toast.error('Please enter Email', {
        duration: 4000
      });
      return;
    }

    // Validate required field: Source
    if (!formData.source || formData.source.trim() === '') {
      toast.error('Please select a Source', {
        duration: 4000
      });
      return;
    }

    // Validate email format
    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address', {
          duration: 4000
        });
        return;
      }
    }

    // Check for duplicate mobile numbers before proceeding
    const mobile1 = formData.mobile1;
    const mobile2 = formData.mobile2;
    
    if (mobile1 && mobile1.length >= 10) {
      try {
        const results = await searchCandidates(mobile1);
        if (results && results.length > 0) {
          toast.error('Cannot proceed: Primary mobile number already exists in database', {
            duration: 5000
          });
          return;
        }
      } catch (error) {
        console.error('Error checking mobile1:', error);
      }
    }
    
    if (mobile2 && mobile2.length >= 10) {
      try {
        const results = await searchCandidates(mobile2);
        if (results && results.length > 0) {
          toast.error('Cannot proceed: Secondary mobile number already exists in database', {
            duration: 5000
          });
          return;
        }
      } catch (error) {
        console.error('Error checking mobile2:', error);
      }
    }

    // Set call status as 'call answered' when proceeding to next step
    actions.updateFormField('call_status', 'call answered')

    const newStep = currentStep + 1
    actions.addCompletedStep(currentStep)
    actions.setCurrentStep(newStep)
    saveFormProgress(newStep, formData, resumeFile, resumePreview)
    // toast.success(`Step ${currentStep} completed and saved!`)
  }

  const handleCNASubmission = async () => {
    try {
      // Validate required field: Candidate Name
      if (!formData.candidateName || formData.candidateName.trim() === '') {
        toast.error('Please enter Candidate Name', {
          duration: 4000
        });
        return;
      }

      // Validate required field: Primary Number
      if (!formData.mobile1 || formData.mobile1.trim() === '') {
        toast.error('Please enter Primary Number', {
          duration: 4000
        });
        return;
      }

      // Validate required field: Email
      if (!formData.email || formData.email.trim() === '') {
        toast.error('Please enter Email', {
          duration: 4000
        });
        return;
      }

      // Validate required field: Source
      if (!formData.source || formData.source.trim() === '') {
        toast.error('Please select a Source', {
          duration: 4000
        });
        return;
      }

      // Validate email format
      if (formData.email && formData.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          toast.error('Please enter a valid email address', {
            duration: 4000
          });
          return;
        }
      }

      // Set call status as 'call not answered' before submission
      actions.updateFormField('call_status', 'call not answered');

      // Show loading toast
      toast.loading('Saving candidate with Call Not Answered status...', { id: 'cna-submission' });

      // Validate required fields
      const validation = CNASubmissionService.validateCNASubmission(formData);
      if (!validation.isValid) {
        toast.error(`Please fill required fields: ${validation.errors.join(', ')}`, { id: 'cna-submission' });
        return;
      }

      // Submit candidate with CNA status (including updated call_status)
      const enhancedFormData = { ...formData, call_status: 'call not answered' };
      const result = await CNASubmissionService.submitCNACandidate(enhancedFormData, resumeFile);

      if (result.success) {
        // Show success message with resume status
        let successMessage = `Candidate saved! Next follow-up: ${result.nextFollowUpDate}`;
        if (resumeFile) {
          successMessage += result.resumeUploaded ? ' (Resume uploaded)' : ' (Resume upload failed)';
        }

        toast.success(successMessage, {
          id: 'cna-submission',
          duration: 4000
        });

        // Clear form data after successful submission
        actions.resetForm();


        // Set data refresh flag and navigate to search view
        actions.setNeedsDataRefresh(true);

        // Clear any existing search data to ensure fresh duplicate check
        actions.setSearchResults([]);
        actions.setHasSearched(false);
        actions.setSearchTerm('');

        // Navigate back to search view for fast render
        setTimeout(() => {
          actions.setCurrentView("search");
        }, 500);
      }
    } catch (error) {
      console.error('CNA submission error:', error);
      toast.error(`Failed to save candidate: ${error.message}`, { id: 'cna-submission' });
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1
      actions.setCurrentStep(newStep)
      saveFormProgress(newStep, formData, resumeFile, resumePreview)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-1 gap-3">
        {/* Left Side - Form Fields */}
        <div className="bg-white rounded-lg  flex flex-col">
          <div className="border-b border-gray-200 p-3">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Basic Information
            </h4>
          </div>

          <div className="flex-1  p-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Profile Number</label>
                <input
                  type="text"
                  value={formData.profileNumber || "iihfiuuhfiuwh"}
                  readOnly
                  className="w-full px-2 py-1 text-xs font-light border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                />

              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Executive Name</label>
                <input
                  type="text"
                  name="executiveName"
                  value={executiveDisplayName }
                  onChange={handleInputChange}
                  tabIndex={1}
                  readOnly
                  className="w-full px-2 py-1 border text-xs font-light border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Candidate Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="candidateName"
                  value={formData.candidateName}
                  onChange={handleInputChange}
                  autoFocus
                  tabIndex={2}
                  className="w-full px-2 py-1 border text-xs font-light border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Primary Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="mobile1"
                    value={formData.mobile1}
                    onChange={handleInputChange}
                    tabIndex={3}
                    className={`w-full px-2 py-1 border text-xs font-light rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      mobileCheckResults.mobile1?.isDuplicate 
                        ? 'border-red-500 bg-red-50' 
                        : mobileCheckResults.mobile1?.isDuplicate === false 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300'
                    }`}
                  />
                  {isCheckingMobile.mobile1 && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                {mobileCheckResults.mobile1?.message && (
                  <p className={`mt-1 text-xs ${
                    mobileCheckResults.mobile1.isDuplicate ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {mobileCheckResults.mobile1.message}
                  </p>
                )}
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Secondary Number</label>
                <div className="relative">
                  <input
                    type="number"
                    name="mobile2"
                    value={formData.mobile2}
                    onChange={handleInputChange}
                    tabIndex={4}
                    className={`w-full px-2 py-1 border text-xs font-light rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      mobileCheckResults.mobile2?.isDuplicate 
                        ? 'border-red-500 bg-red-50' 
                        : mobileCheckResults.mobile2?.isDuplicate === false 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300'
                    }`}
                  />
                  {isCheckingMobile.mobile2 && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                {mobileCheckResults.mobile2?.message && (
                  <p className={`mt-1 text-xs ${
                    mobileCheckResults.mobile2.isDuplicate ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {mobileCheckResults.mobile2.message}
                  </p>
                )}
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  tabIndex={5}
                  className="w-full px-2 py-1 border text-xs font-light border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                <CustomDropdown
                  value={formData.gender}
                  onChange={(selected) => {
                    actions.updateFormField('gender', selected ? selected.value : '');
                  }}
                  options={genderOptions}
                  placeholder="Select Gender"
                  isDisabled={masterLoading}
                  noOptionsMessage={masterLoading ? "Loading genders..." : "No genders found"}
                  isSearchable={true}
                  isClearable={true}
                  tabIndex={6}
                  error={masterError}
                />
                {masterError && (
                  <p className="mt-1 text-xs text-red-500">Error loading genders</p>
                )}
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date of Birth {formData.age && <span className="text-blue-600 font-normal">({formData.age} years)</span>}
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleDobChange}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  max={(() => {
                    const today = new Date();
                    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                    return maxDate.toISOString().split("T")[0];
                  })()}
                  tabIndex={7}
                  className="w-full px-2 py-1 border text-xs font-light border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {formData.age && parseInt(formData.age) < 18 && (
                  <p className="mt-1 text-xs text-red-500">Minimum age requirement: 18 years</p>
                )}
              </div>

              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Country</label>
                <CustomDropdown
                  value={formData.country}
                  onChange={handleCountryChange}
                  options={countryOptions}
                  placeholder="Select Country"
                  isSearchable={true}
                  isClearable={true}
                  tabIndex={8}
                  isDisabled={locationLoading}
                  noOptionsMessage={locationLoading ? "Loading countries..." : "No countries found"}
                />
                {locationError && (
                  <p className="mt-1 text-xs text-red-500">Error loading countries</p>
                )}
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                <CustomDropdown
                  value={formData.state}
                  onChange={handleStateChange}
                  options={stateOptions}
                  placeholder={formData.country ? "Select State" : "Select Country first"}
                  isSearchable={true}
                  isClearable={true}
                  tabIndex={9}
                  isDisabled={locationLoading || !formData.country}
                  noOptionsMessage={
                    locationLoading ? "Loading states..." : 
                    !formData.country ? "Please select a country first" :
                    stateOptions.length === 0 ? "No states found for selected country" :
                    "No states found"
                  }
                />
                {locationError && (
                  <p className="mt-1 text-xs text-red-500">Error loading states</p>
                )}
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                <CustomDropdown
                  value={formData.city}
                  onChange={handleCityChange}
                  options={cityOptions}
                  placeholder={formData.state ? "Select City" : "Select State first"}
                  isSearchable={true}
                  isClearable={true}
                  tabIndex={10}
                  isDisabled={locationLoading || !formData.state}
                  noOptionsMessage={
                    locationLoading ? "Loading cities..." : 
                    !formData.state ? "Please select a state first" :
                    cityOptions.length === 0 ? "No cities found for selected state" :
                    "No cities found"
                  }
                />
                {locationError && (
                  <p className="mt-1 text-xs text-red-500">Error loading cities</p>
                )}
                
                {/* City Matching Status Indicator */}
                {cityMatchStatus && (
                  <div className={`mt-2 p-2 rounded-md text-xs ${
                    cityMatchStatus.isMatch 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-orange-50 border border-orange-200'
                  }`}>
                    <div className="flex items-center">
                      {cityMatchStatus.isMatch ? (
                        <>
                          <svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-green-800 font-medium">✅ Same Plan City</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-orange-800 font-medium">🚫 Different Plan City</span>
                        </>
                      )}
                    </div>
                    <div className="mt-1 text-xs">
                      <span className={cityMatchStatus.isMatch ? 'text-green-700' : 'text-orange-700'}>
                        Employee City: <strong>{cityMatchStatus.employeeCity}</strong> | 
                        Candidate City: <strong>{cityMatchStatus.candidateCity}</strong>
                      </span>
                    </div>
                    <div className="mt-1 text-xs">
                      <span className={cityMatchStatus.isMatch ? 'text-green-600' : 'text-orange-600'}>
                        Will be stored in: <strong>
                          {cityMatchStatus.isMatch 
                            ? 'tb_calls_onplan + tb_calls_profiles' 
                            : 'tb_calls_onothers + tb_calls_profilesothers'
                          }
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pincode</label>
                <input
                  type="number"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handlePincodeChange}
                  tabIndex={11}
                  className="w-full px-2 py-1 border text-xs font-light border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>





            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Education</label>
                <CustomDropdown
                  value={formData.education}
                  onChange={(selected) => {
                    actions.updateFormField('education', selected ? selected.value : '');
                  }}
                  options={educationOptions}
                  placeholder="Select Education"
                  isDisabled={masterLoading}
                  noOptionsMessage={masterLoading ? "Loading educations..." : "No educations found"}
                  isSearchable={true}
                  isClearable={true}
                  tabIndex={12}
                  error={masterError}
                />
                {masterError && (
                  <p className="mt-1 text-xs text-red-500">Error loading educations</p>
                )}
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Experience</label>
                <CustomDropdown
                  value={formData.experience}
                  onChange={(selected) => {
                    actions.updateFormField('experience', selected ? selected.value : '');
                  }}
                  options={experienceOptions}
                  placeholder="Select Experience"
                  isDisabled={masterLoading}
                  noOptionsMessage={masterLoading ? "Loading experiences..." : "No experiences found"}
                  isSearchable={true}
                  isClearable={true}
                  tabIndex={13}
                  error={masterError}
                />
                {masterError && (
                  <p className="mt-1 text-xs text-red-500">Error loading experiences</p>
                )}
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Source <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  value={formData.source}
                  onChange={(selected) => {
                    actions.updateFormField('source', selected ? selected.value : '');
                  }}
                  options={sourceOptions}
                  placeholder="Select Source"
                  isDisabled={masterLoading}
                  noOptionsMessage={masterLoading ? "Loading sources..." : "No sources found"}
                  isSearchable={true}
                  isClearable={true}
                  tabIndex={14}
                  error={masterError}
                />
                {masterError && (
                  <p className="mt-1 text-xs text-red-500">Error loading sources</p>
                )}
              </div>


              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Languages
                </label>
                <input
                  type="text"
                  value={tagInputs.languages}
                  onChange={(e) => handleTagInputChange(e, 'languages')}
                  onKeyDown={(e) => handleTagKeyDown(e, 'languages')}
                  onBlur={() => handleTagBlur('languages')}
                  tabIndex={15}
                  className="w-full px-2 py-1 border text-xs font-light border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add language and press Enter"
                />
                {tagErrors.languages && (
                  <p className="mt-1 text-xs text-red-500">{tagErrors.languages}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.languages?.map((lang, index) => (
                    <span
                      key={`lang-${index}`}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {lang}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag('languages', index)}
                        className="ml-1.5 inline-flex text-blue-400 hover:text-blue-600 focus:outline-none"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Skills Field */}
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Skills
                </label>
                <input
                  type="text"
                  value={tagInputs.skills}
                  onChange={(e) => handleTagInputChange(e, 'skills')}
                  onKeyDown={(e) => handleTagKeyDown(e, 'skills')}
                  onBlur={() => handleTagBlur('skills')}
                  tabIndex={16}
                  className="w-full px-2 py-1 border text-xs font-light border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add skill and press Enter"
                />
                {tagErrors.skills && (
                  <p className="mt-1 text-xs text-red-500">{tagErrors.skills}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills?.map((skill, index) => (
                    <span
                      key={`skill-${index}`}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag('skills', index)}
                        className="ml-1.5 inline-flex text-green-400 hover:text-green-600 focus:outline-none"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Communication</label>
                <CustomDropdown
                  value={formData.communication}
                  onChange={(selected) => {
                    actions.updateFormField('communication', selected ? selected.value : '');
                  }}
                  options={communicationOptions}
                  tabIndex={17}
                  placeholder="Select Communication"
                  isDisabled={masterLoading}
                  noOptionsMessage={masterLoading ? "Loading communications..." : "No communications found"}
                  isSearchable={true}
                  isClearable={true}
                  error={masterError}
                />
                {masterError && (
                  <p className="mt-1 text-xs text-red-500">Error loading communications</p>
                )}
              </div>

            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between border-t border-gray-200 p-2">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentStep === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gray-600 text-white hover:bg-gray-700"
                }`}
            >
              Previous
            </button>
            <div className="flex gap-2">
              <button
                type="submit"
                onClick={handleCNASubmission}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                title="Call Not Answered"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-md font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                title="Call Accepted"
              >
                <Phone className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}

export default FormStep1
