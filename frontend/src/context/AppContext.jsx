import React, { createContext, useContext, useReducer, useMemo } from 'react';

// Initial state
const initialState = {
  // UI State
  currentView: 'search',
  currentStep: 1,
  completedSteps: [],
  searchTerm: '',
  hasSearched: false,
  tableSearchQuery: '',
  entriesPerPage: 10,
  isViewModalOpen: false,
  isFeedbackModalOpen: false,
  selectedCandidateForFeedback: null,
  searchPreFillData: null, // Store search term for pre-filling registration form
  needsDataRefresh: false, // Flag to trigger data refresh after form submission

  // Form Data
  formData: {
    profileNumber: '',
    executiveName: '',
    candidateName: '',
    mobile1: '',
    mobile2: '',
    email: '',
    dob: '',
    gender: '',
    country: 'India', // Set India as default country
    state: '',
    city: '',
    pincode: '',
    source: '',
    communication: '',
    skills: [],
    languages: [],
    experience: '',
    education: '',
    resumePreview: null,
    isParsingResume: false,
    parsedResumeData: null,
    clientName: '',
    call_status: '', // Track call status: 'call answered' or 'call not answered'
  },

  // Resume file stored at root level
  resumeFile: null,

  // Candidates State
  searchResults: [],
  submittedCandidates: [],
  selectedCandidate: null,
  existingCandidates: [],

  // Job Posting State
  jobPostingData: {
    jobTitle: '',
    company: '',
    location: '',
    jobType: '',
    salary: '',
    description: '',
    requirements: [],
    contactEmail: '',
    contactPhone: ''
  },

  // Master Data State
  sources: [],
  industries: [],
  remarks: [],
  departments: [],
  designations: [],

  // Loading State
  isLoading: false
};

// Action types
const actionTypes = {
  SET_CURRENT_VIEW: 'SET_CURRENT_VIEW',
  SET_CURRENT_STEP: 'SET_CURRENT_STEP',
  ADD_COMPLETED_STEP: 'ADD_COMPLETED_STEP',
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',
  SET_HAS_SEARCHED: 'SET_HAS_SEARCHED',
  SET_TABLE_SEARCH_QUERY: 'SET_TABLE_SEARCH_QUERY',
  SET_ENTRIES_PER_PAGE: 'SET_ENTRIES_PER_PAGE',
  SET_VIEW_MODAL_OPEN: 'SET_VIEW_MODAL_OPEN',
  SET_FEEDBACK_MODAL_OPEN: 'SET_FEEDBACK_MODAL_OPEN',
  SET_SELECTED_CANDIDATE_FOR_FEEDBACK: 'SET_SELECTED_CANDIDATE_FOR_FEEDBACK',
  SET_SEARCH_PREFILL_DATA: 'SET_SEARCH_PREFILL_DATA',
  SET_NEEDS_DATA_REFRESH: 'SET_NEEDS_DATA_REFRESH',
  UPDATE_FORM_FIELD: 'UPDATE_FORM_FIELD',
  SET_RESUME_FILE: 'SET_RESUME_FILE',
  SET_RESUME_PREVIEW: 'SET_RESUME_PREVIEW',
  SET_PARSING_RESUME: 'SET_PARSING_RESUME',
  SET_PARSED_RESUME_DATA: 'SET_PARSED_RESUME_DATA',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_SUBMITTED_CANDIDATES: 'SET_SUBMITTED_CANDIDATES',
  SET_SELECTED_CANDIDATE: 'SET_SELECTED_CANDIDATE',
  SET_EXISTING_CANDIDATES: 'SET_EXISTING_CANDIDATES',
  UPDATE_JOB_POSTING_FIELD: 'UPDATE_JOB_POSTING_FIELD',
  SET_MASTER_DATA: 'SET_MASTER_DATA',
  SET_LOADING: 'SET_LOADING',
  RESET_FORM: 'RESET_FORM',
  RESET_UI: 'RESET_UI'
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_CURRENT_VIEW:
      return { ...state, currentView: action.payload };

    case actionTypes.SET_CURRENT_STEP:
      return { ...state, currentStep: action.payload };

    case actionTypes.ADD_COMPLETED_STEP:
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.payload]
      };

    case actionTypes.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload };

    case actionTypes.SET_HAS_SEARCHED:
      return { ...state, hasSearched: action.payload };

    case actionTypes.SET_TABLE_SEARCH_QUERY:
      return { ...state, tableSearchQuery: action.payload };

    case actionTypes.SET_ENTRIES_PER_PAGE:
      return { ...state, entriesPerPage: action.payload };

    case actionTypes.SET_VIEW_MODAL_OPEN:
      return { ...state, isViewModalOpen: action.payload };

    case actionTypes.SET_FEEDBACK_MODAL_OPEN:
      return { ...state, isFeedbackModalOpen: action.payload };

    case actionTypes.SET_SELECTED_CANDIDATE_FOR_FEEDBACK:
      return { ...state, selectedCandidateForFeedback: action.payload };

    case actionTypes.SET_SEARCH_PREFILL_DATA:
      return { ...state, searchPreFillData: action.payload };

    case actionTypes.SET_NEEDS_DATA_REFRESH:
      return { ...state, needsDataRefresh: action.payload };

    case actionTypes.UPDATE_FORM_FIELD:
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.payload.field]: action.payload.value
        }
      };

    case actionTypes.SET_RESUME_FILE:
      return { ...state, resumeFile: action.payload };

    case actionTypes.SET_RESUME_PREVIEW:
      return { ...state, formData: { ...state.formData, resumePreview: action.payload } };

    case actionTypes.SET_PARSING_RESUME:
      return { ...state, formData: { ...state.formData, isParsingResume: action.payload } };

    case actionTypes.SET_PARSED_RESUME_DATA:
      return { ...state, formData: { ...state.formData, parsedResumeData: action.payload } };

    case actionTypes.SET_SEARCH_RESULTS:
      // Support functional updates: setSearchResults(prev => newValue)
      // This is CRITICAL for real-time updates from ViewModal
      const newSearchResults = typeof action.payload === 'function'
        ? action.payload(state.searchResults)
        : action.payload;
      return { ...state, searchResults: newSearchResults };

    case actionTypes.SET_SUBMITTED_CANDIDATES:
      return { ...state, submittedCandidates: action.payload };

    case actionTypes.SET_SELECTED_CANDIDATE:
      return { ...state, selectedCandidate: action.payload };

    case actionTypes.SET_EXISTING_CANDIDATES:
      return { ...state, existingCandidates: action.payload };

    case actionTypes.UPDATE_JOB_POSTING_FIELD:
      return {
        ...state,
        jobPostingData: {
          ...state.jobPostingData,
          [action.payload.field]: action.payload.value
        }
      };

    case actionTypes.SET_MASTER_DATA:
      return {
        ...state,
        [action.payload.type]: action.payload.data
      };

    case actionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case actionTypes.RESET_FORM:
      return { 
        ...state, 
        formData: initialState.formData,
        resumeFile: null,
        currentStep: 1,
        completedSteps: []
      };

    case actionTypes.RESET_UI:
      return {
        ...state,
        currentView: initialState.currentView,
        currentStep: initialState.currentStep,
        completedSteps: initialState.completedSteps,
        searchTerm: initialState.searchTerm,
        hasSearched: initialState.hasSearched,
        tableSearchQuery: initialState.tableSearchQuery,
        entriesPerPage: initialState.entriesPerPage,
        isViewModalOpen: initialState.isViewModalOpen
      };

    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const value = {
    state,
    dispatch,
    actionTypes
  };

  // Memoize the context value to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => value, [state, dispatch, actionTypes]);

  return (
    <AppContext.Provider value={memoizedValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Helper functions to replace Redux actions
export const useAppActions = () => {
  const { dispatch, actionTypes } = useAppContext();

  return {
    setCurrentView: (view) => dispatch({ type: actionTypes.SET_CURRENT_VIEW, payload: view }),
    setCurrentStep: (step) => dispatch({ type: actionTypes.SET_CURRENT_STEP, payload: step }),
    addCompletedStep: (step) => dispatch({ type: actionTypes.ADD_COMPLETED_STEP, payload: step }),
    setSearchTerm: (term) => dispatch({ type: actionTypes.SET_SEARCH_TERM, payload: term }),
    setHasSearched: (searched) => dispatch({ type: actionTypes.SET_HAS_SEARCHED, payload: searched }),
    setTableSearchQuery: (query) => dispatch({ type: actionTypes.SET_TABLE_SEARCH_QUERY, payload: query }),
    setEntriesPerPage: (entries) => dispatch({ type: actionTypes.SET_ENTRIES_PER_PAGE, payload: entries }),
    setIsViewModalOpen: (open) => dispatch({ type: actionTypes.SET_VIEW_MODAL_OPEN, payload: open }),
    closeViewModal: () => dispatch({ type: actionTypes.SET_VIEW_MODAL_OPEN, payload: false }),
    setIsFeedbackModalOpen: (open) => dispatch({ type: actionTypes.SET_FEEDBACK_MODAL_OPEN, payload: open }),
    setSelectedCandidateForFeedback: (candidate) => dispatch({ type: actionTypes.SET_SELECTED_CANDIDATE_FOR_FEEDBACK, payload: candidate }),
    setSearchPreFillData: (data) => dispatch({ type: actionTypes.SET_SEARCH_PREFILL_DATA, payload: data }),
    setNeedsDataRefresh: (refresh) => dispatch({ type: actionTypes.SET_NEEDS_DATA_REFRESH, payload: refresh }),
    updateFormField: (field, value) => dispatch({ type: actionTypes.UPDATE_FORM_FIELD, payload: { field, value } }),
    setResumeFile: (file) => dispatch({ type: actionTypes.SET_RESUME_FILE, payload: file }),
    setResumePreview: (preview) => dispatch({ type: actionTypes.SET_RESUME_PREVIEW, payload: preview }),
    setParsingResume: (parsing) => dispatch({ type: actionTypes.SET_PARSING_RESUME, payload: parsing }),
    setParsedResumeData: (data) => dispatch({ type: actionTypes.SET_PARSED_RESUME_DATA, payload: data }),
    setSearchResults: (results) => dispatch({ type: actionTypes.SET_SEARCH_RESULTS, payload: results }),
    setSubmittedCandidates: (candidates) => dispatch({ type: actionTypes.SET_SUBMITTED_CANDIDATES, payload: candidates }),
    setSelectedCandidate: (candidate) => dispatch({ type: actionTypes.SET_SELECTED_CANDIDATE, payload: candidate }),
    setExistingCandidates: (candidates) => dispatch({ type: actionTypes.SET_EXISTING_CANDIDATES, payload: candidates }),
    updateJobPostingField: (field, value) => dispatch({ type: actionTypes.UPDATE_JOB_POSTING_FIELD, payload: { field, value } }),
    setMasterData: (type, data) => dispatch({ type: actionTypes.SET_MASTER_DATA, payload: { type, data } }),
    setLoading: (loading) => dispatch({ type: actionTypes.SET_LOADING, payload: loading }),
    resetForm: () => dispatch({ type: actionTypes.RESET_FORM }),
    resetUI: () => dispatch({ type: actionTypes.RESET_UI })
  };
};

