import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Phone, Mail, Eye, Trash2, IndianRupee, DraftingCompass, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useAppContext, useAppActions } from '../../../context/AppContext';
import { candidates } from '../../../api/api';
import { useCandidateIntegration } from '../hooks/useCandidateIntegration'
import {
  displayValue,
  getLatestFeedbackData,
  isAssignable,
  mapCandidateToFormData,
  mapClientJobToFormData,
  createPreFillData
} from '../utils'
import FeedbackModal from './FeedbackModal'
import AssignModal from './AssignModal'
import { nfdStatusService } from '../services/api'
import Loading from '../../../components/Loading'

// Utility functions now imported from shared utils

const SearchView = () => {
  const [showNoCandidateModal, setShowNoCandidateModal] = useState(false);
  // Removed: employeeNames state - backend now provides executive_display directly
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCandidateForAssign, setSelectedCandidateForAssign] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [openWhatsappFor, setOpenWhatsappFor] = useState(null);
  const [waMenuPos, setWaMenuPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (openWhatsappFor !== null) {
      const onClick = () => setOpenWhatsappFor(null);
      document.addEventListener('click', onClick);
      return () => document.removeEventListener('click', onClick);
    }
  }, [openWhatsappFor]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { state } = useAppContext()
  const actions = useAppActions()

  // Extract all state variables in one place to avoid duplication
  // MUST be before any useEffect that uses these variables
  const {
    currentView,
    searchResults,
    searchTerm,
    hasSearched,
    needsDataRefresh,
    tableSearchQuery,
    entriesPerPage,
    submittedCandidates,
    isFeedbackModalOpen,
    selectedCandidateForFeedback
  } = state

  // Debug: Log component mount/unmount to detect if component is being recreated
  useEffect(() => {
    console.log('🚀 SearchView: Component MOUNTED');
    return () => {
      console.log('💥 SearchView: Component UNMOUNTED');
    };
  }, []);

  // Listen for candidate updates from other tabs via BroadcastChannel
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('candidate_updates');

      channel.onmessage = (event) => {
        if (event.data.type === 'candidateUpdated') {
          console.log('📡 Received candidate update from another tab:', event.data);

          // Update the search results with the new data
          actions.setSearchResults(prevResults => {
            if (!Array.isArray(prevResults)) return prevResults;

            return prevResults.map(candidate => {
              if (candidate.candidateId === event.data.candidateId || candidate.id === event.data.candidateId) {
                return {
                  ...candidate,
                  ...event.data.updatedData
                };
              }
              return candidate;
            });
          });
          toast.success('Candidate updated in another tab - data refreshed!');
        }
      };

      return () => {
        channel.close();
      };
    } catch (error) {
      console.log('BroadcastChannel not supported:', error);
    }
  }, [actions]);

  // Debug: Monitor searchResults changes
  useEffect(() => {
    console.log('📊 SearchView: searchResults changed:', {
      length: searchResults?.length || 0,
      isArray: Array.isArray(searchResults),
      type: typeof searchResults,
      hasSearched,
      isViewModalOpen: state.isViewModalOpen
    });
  }, [searchResults, hasSearched, state.isViewModalOpen]);

  // Get user information from Redux for executive name functionality
  const user = useSelector((state) => state.auth)
  const executiveDisplayName = user?.firstName || user?.username || 'Loggers'
  const executiveName = user?.employeeCode || user?.username || 'Loggers'

  // Debug: Log user level to check the value
  useEffect(() => {
    console.log('🔍 User Level Check:', {
      userRole: user?.userRole,
      level: user?.level,
      role: user?.role,
      userObject: user
    });
  }, [user?.userRole, user?.level, user?.role])

  // Track current user to detect login changes - use employeeCode as primary identifier
  const [currentUserIdentifier, setCurrentUserIdentifier] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Clear search results when user changes (logout/login with different account)
  useEffect(() => {
    const newUserIdentifier = user?.employeeCode || user?.username || null;

    if (!isInitialized) {
      setCurrentUserIdentifier(newUserIdentifier);
      setIsInitialized(true);
      return;
    }

    // If user identifier changed (different login), clear search data
    if (currentUserIdentifier && newUserIdentifier !== currentUserIdentifier) {
      console.log('User changed, clearing search data');
      actions.setSearchResults([]);
      actions.setHasSearched(false);
      actions.setSearchTerm('');
      actions.setTableSearchQuery('');
      setCurrentUserIdentifier(newUserIdentifier);
    }
  }, [user?.employeeCode, user?.username, user?.isAuthenticated, user?.token, currentUserIdentifier, isInitialized, actions]);

  // Additional effect to handle authentication state changes more directly
  useEffect(() => {
    if (!user?.isAuthenticated && currentUserIdentifier) {
      // User has been logged out, clear search immediately
      actions.setSearchResults([]);
      actions.setHasSearched(false);
      actions.setSearchTerm('');
      actions.setTableSearchQuery('');
      setCurrentUserIdentifier(null);
    }
  }, [user?.isAuthenticated, currentUserIdentifier, actions]);
  const {
    searchCandidates,
    deleteCandidate,
    loadCandidates,
    getCandidate
  } = useCandidateIntegration()

  // Removed: Employee name fetching logic - backend now provides executive_display directly
  // No need for additional API calls to fetch employee names

  // Function to fix corrupted executive names in database
  const fixCorruptedExecutiveNames = async () => {
    try {
      const result = await candidates.fixExecutiveNames();

      if (result.fixed_records && result.fixed_records.length > 0) {
        toast.success(`Fixed ${result.fixed_records.length} corrupted executive name records`);

        // Refresh search results to show corrected names
        if (searchTerm) {
          handleSearch();
        }
      } else {
        toast.info('No corrupted executive name records found');
      }
    } catch (error) {
      console.error('Error fixing executive names:', error);
      toast.error('Failed to fix executive names');
    }
  };


  // Check for URL parameters to auto-open ViewModal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const candidateId = urlParams.get('candidateId');
    const clientJobId = urlParams.get('clientJobId');

    if (candidateId) {

      // Add delay to ensure the newly created client job is available in the database
      setTimeout(() => {
        loadCandidates().then(() => {
          getCandidate(candidateId).then((completeData) => {
            if (completeData && completeData.candidate) {
              const candidate = completeData.candidate;
              const clientJobs = completeData.clientJobs || [];
              const formData = completeData.formData || mapCandidateToFormData(candidate);

              // Filter client jobs by clientJobId if provided
              const filteredClientJobs = clientJobId
                ? clientJobs.filter(job => {
                  return job.id.toString() === clientJobId.toString();
                })
                : clientJobs;


              if (filteredClientJobs.length === 0 && clientJobId) {
                // If specific client job not found, use the most recent one (last in array)
                const mostRecentJob = clientJobs[clientJobs.length - 1];
                if (mostRecentJob) {
                  filteredClientJobs.push(mostRecentJob);
                }
              }

              // Use the specific client job for ViewModal if clientJobId is provided
              const targetClientJob = filteredClientJobs.length > 0 ? filteredClientJobs[0] : null;
              const clientJobData = targetClientJob ? mapClientJobToFormData(targetClientJob) : {};

              const candidateForModal = {
                id: candidate.id,
                candidateId: candidate.id,
                candidateName: formData.candidateName,
                name: formData.candidateName,
                email: formData.email,
                phone: formData.mobile1,
                profileNumber: formData.profileNumber,
                executiveName: formData.executiveName || executiveName,
                executive_display: candidate.executive_display, // Pass through from backend
                clientJobId: targetClientJob ? targetClientJob.id : clientJobId,
                isJobAssignmentContext: true,
                // Add client job data from database
                clientName: clientJobData.clientName,
                designation: clientJobData.designation,
                currentCtc: clientJobData.currentCtc,
                expectedCtc: clientJobData.expectedCtc,
                remarks: clientJobData.remarks,
                profileSubmission: clientJobData.profileSubmission,
                profileSubmissionDate: clientJobData.profileSubmissionDate,
                feedback: clientJobData.feedback,
                nfd: clientJobData.nfd,
                interviewFixedDate: clientJobData.interviewFixedDate,
                expectedJoiningDate: clientJobData.expectedJoiningDate,
                vendorStatus: clientJobData.vendorStatus,
                clientStatus: clientJobData.clientStatus
              };

              actions.setSelectedCandidate(candidateForModal);
              actions.setIsViewModalOpen(true);

              // Transform data for search results table
              const transformedResults = [];
              let rowIndex = 0;

              filteredClientJobs.forEach((clientJob) => {
                const clientJobMappedData = mapClientJobToFormData(clientJob);

                transformedResults.push({
                  id: `${candidate.id}-${clientJob.id}`,
                  candidateId: candidate.id,
                  clientJobId: clientJob.id,
                  serialNo: ++rowIndex,
                  candidateName: formData.candidateName,
                  contactNumber1: formData.mobile1,
                  contactNumber2: formData.mobile2,
                  email: formData.email,
                  education: formData.education,
                  experience: formData.experience,
                  address: `${formData.city}, ${formData.state}, ${formData.country}`,
                  profileNumber: formData.profileNumber,
                  lastUpdated: candidate.updated_at || candidate.created_at || "N/A",
                  source: "existing",
                  backendData: candidate,
                  executiveName: formData.executiveName || executiveName,
                  executive_display: candidate.executive_display, // Pass through from backend

                  // Client job specific data - now comes from dataMapper
                  clientName: clientJobMappedData.clientName,
                  designation: clientJobMappedData.designation,
                  remarks: clientJobMappedData.remarks,
                  nfd: clientJobMappedData.nfd,
                  interviewFixedDate: clientJobMappedData.interviewFixedDate,
                  expectedJoiningDate: clientJobMappedData.expectedJoiningDate,
                  profileSubmission: clientJobMappedData.profileSubmission,
                  profileSubmissionDate: clientJobMappedData.profileSubmissionDate,
                  feedback: clientJobMappedData.feedback,

                  // Vendor/Client status
                  vendorStatus: clientJobMappedData.vendorStatus || "Pending",
                  clientStatus: clientJobMappedData.clientStatus || "Pending"
                });
              });

              actions.setSearchResults(transformedResults);
              actions.setHasSearched(true);


              // Clear URL parameter after processing
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }).catch((error) => {
            console.error('Error loading candidate:', error);
            toast.error('Error loading candidate details');
          });
        });
      }, 1500); // Increased delay to ensure data is saved
    }
  }, [loadCandidates, getCandidate, actions]);

  // Format CTC in Indian number format (1,20,000) and remove .00
  const formatCTC = (value) => {
    if (!value || value === "" || value === "0") return "-";

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "-";

    // Remove .00 if it's a whole number
    const cleanValue = numValue % 1 === 0 ? Math.floor(numValue) : numValue;

    // Format in Indian number system
    return cleanValue.toLocaleString('en-IN');
  }

  // Auto-update expired NFD jobs function
  const autoUpdateExpiredNfd = async () => {
    try {
      console.log('🔄 Auto-updating expired NFD jobs...', {
        hasSearchResults: searchResults?.length > 0,
        hasSearched,
        stackTrace: new Error().stack?.split('\n').slice(0, 5).join('\n')
      });

      // DEFENSIVE: Don't run if we have search results - prevents clearing data
      // The NFD update is cached anyway, so skipping is safe
      if (searchResults?.length > 0 && hasSearched) {
        console.log('⚠️ Skipping NFD update - we have active search results');
        return false;
      }

      const result = await nfdStatusService.autoUpdateExpiredNfd();
      if (result) {
        console.log('✅ Some NFD jobs were updated to open profile status');
        // Show a subtle notification if jobs were updated

      }
      return result;
    } catch (error) {
      console.error('❌ Error auto-updating expired NFD jobs:', error);
      // Don't show error toast to avoid disrupting user experience
      return false;
    }
  };

  // Load candidates on component mount and auto-update expired NFD
  // Use a ref to track if initial load has been done
  const hasInitialized = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      if (!isMounted) return;

      try {
        // Only run auto-update and load candidates if we're in search view and component is visible
        // Add a small delay to prevent running during rapid navigation
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!isMounted || document.hidden || currentView !== 'search') return;

        console.log('🔄 SearchView: Initializing data for search view');
        // Run NFD update in background (async, no await) for instant page load
        // Backend has 30min cache, so this is safe and fast
        autoUpdateExpiredNfd();

        // Load candidates immediately without waiting for NFD update
        if (isMounted && !document.hidden && currentView === 'search' && searchResults.length === 0) {
          await loadCandidates();
        }

        hasInitialized.current = true;
      } catch (error) {
        console.error('Error initializing SearchView data:', error);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    // Only initialize on first mount, not on every currentView change
    // This prevents re-initialization when ViewModal closes
    console.log('🔍 Initialization check:', {
      currentView,
      documentHidden: document.hidden,
      hasInitialized: hasInitialized.current,
      willInitialize: currentView === 'search' && !document.hidden && !hasInitialized.current
    });

    if (currentView === 'search' && !document.hidden && !hasInitialized.current) {
      console.log('✅ Running initializeData()');
      // Set initialized flag IMMEDIATELY to prevent double-calls
      hasInitialized.current = true;
      initializeData();
    }

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run on mount

  // Check for data refresh flag and reload candidates, then trigger search
  useEffect(() => {
    if (needsDataRefresh && !document.hidden && currentView === 'search') {
      const refreshData = async () => {
        try {
          console.log('🔄 SearchView: Refreshing data for search view (needsDataRefresh flag)');
          await loadCandidates();
          actions.setNeedsDataRefresh(false); // Reset the flag after loading completes

          // Only trigger search if we DON'T already have search results
          // If we have results, they're already updated via candidateUpdated event
          if (searchTerm && hasSearched && searchResults.length === 0) {
            setTimeout(() => {
              // For post-registration search, only show results if candidates exist
              checkDuplicatePostRegistration();
            }, 100);
          }
          // Don't re-search if we already have results - the real-time update handles it
        } catch (error) {
          console.error('Error refreshing SearchView data:', error);
          actions.setNeedsDataRefresh(false);
        }
      };

      refreshData();
    }
  }, [needsDataRefresh, searchTerm, hasSearched, currentView]); // Removed searchResults.length to prevent re-triggering on updates

  // Listen for custom event from ViewModal to trigger search
  useEffect(() => {
    const handleTriggerSearch = async (event) => {
      const { searchTerm } = event.detail;

      // Set search term and trigger the actual search
      actions.setSearchTerm(searchTerm);

      // Perform the actual search to reload results with remark and job info
      try {
        // Don't auto-update NFD here - this is triggered for refreshing results
        // NFD update happens in the main checkDuplicate function

        const backendResults = await searchCandidates(searchTerm);

        // Transform backend data to match frontend format using same structure as main search
        const transformedResults = [];
        let rowIndex = 0;

        backendResults.forEach((candidate) => {
          const formData = mapCandidateToFormData(candidate);


          // If candidate has multiple client assignments, create separate rows
          if (candidate.client_jobs && candidate.client_jobs.length > 0) {
            candidate.client_jobs.forEach((clientJob) => {
              const clientJobData = mapClientJobToFormData(clientJob);

              transformedResults.push({
                id: `${candidate.id}-${clientJob.id}`,
                candidateId: candidate.id,
                clientJobId: clientJob.id,
                serialNo: ++rowIndex,
                executiveName: getDisplayExecutiveName(candidate, clientJob), // Use assignment-aware executive name
                candidateName: formData.candidateName,
                contactNumber1: formData.mobile1,
                contactNumber2: formData.mobile2,
                email: formData.email,
                education: formData.education,
                experience: formData.experience,
                address: `${formData.city}, ${formData.state}, ${formData.country}`,
                profileNumber: formData.profileNumber,
                lastUpdated: candidate.updated_at || candidate.created_at || "N/A",
                source: "existing",
                backendData: candidate,
                selectedClientJob: clientJob,

                // Preserve nested object for compatibility
                clientJob: {
                  clientName: clientJobData.clientName || "",
                  designation: clientJobData.designation || "",
                  currentCtc: clientJob.current_ctc || "",
                  expectedCtc: clientJob.expected_ctc || "",
                  industry: clientJobData.industry || "",
                  remarks: clientJobData.remarks || "",
                  next_follow_up_date: clientJob.next_follow_up_date || "",
                  interview_date: clientJob.interview_date || "",
                  expected_joining_date: clientJob.expected_joining_date || "",
                },
              });
            });
          } else {
            // No client assignments, create single row
            // Find original result to preserve executiveName
            const originalResult = searchResults.find(result =>
              result.candidateId === candidate.id && result.clientJobId === null
            );

            transformedResults.push({
              id: candidate.id,
              candidateId: candidate.id,
              clientJobId: null,
              serialNo: ++rowIndex,
              executiveName: originalResult?.executiveName || formData.executiveName || executiveName,
              executive_display: candidate.executive_display, // Pass through from backend
              candidateName: formData.candidateName,
              contactNumber1: formData.mobile1,
              contactNumber2: formData.mobile2,
              email: formData.email,
              education: formData.education,
              experience: formData.experience,
              address: `${formData.city}, ${formData.state}, ${formData.country}`,
              profileNumber: formData.profileNumber,
              lastUpdated: candidate.updated_at || candidate.created_at || "N/A",
              source: "existing",
              backendData: candidate,
              selectedClientJob: null,

              // Preserve nested object for compatibility
              clientJob: {
                clientName: "",
                designation: "",
                currentCtc: "",
                expectedCtc: "",
                industry: "",
                remarks: "",
              },
            });
          }
        });

        // CRITICAL: Merge with submitted candidates data (same logic as main search)
        const mergedMap = new Map();
        const candidateIdMap = new Map();

        // Add backend results first
        transformedResults.forEach(c => {
          mergedMap.set(c.id, c);
          candidateIdMap.set(c.candidateId, c.id);
        });

        // Only add submitted candidates if their candidateId is not already in backend results
        submittedCandidates.forEach(c => {
          const backendEntryId = candidateIdMap.get(c.id);
          if (!backendEntryId) {
            // This candidate is not in backend results, add it
            mergedMap.set(c.id, c);
          }
          // If candidate exists in backend, skip the submitted version (prefer backend data)
        });

        const mergedCandidates = Array.from(mergedMap.values()).map((c, index) => ({
          ...c,
          serialNo: index + 1,
        }));

        actions.setSearchResults(mergedCandidates);
        actions.setExistingCandidates(mergedCandidates);
        actions.setHasSearched(true);

      } catch (error) {
        console.error('Error in triggered search:', error);
        toast.error("Error refreshing search results");
      }
    };

    window.addEventListener('triggerDuplicateSearch', handleTriggerSearch);

    return () => {
      window.removeEventListener('triggerDuplicateSearch', handleTriggerSearch);
    };
  }, [searchCandidates, actions]);

  // Clear search results when user changes search term (to prevent showing stale data)
  useEffect(() => {
    // Only clear if we have previous search results and user is typing a new search
    if (hasSearched && searchResults.length > 0 && searchTerm.trim()) {
      // Clear results immediately when search term changes
      // This prevents showing old results while user types new search
      const timeoutId = setTimeout(() => {
        // Only clear if search term is different from what produced current results
        // This prevents clearing results when user just clicks in the search box
        actions.setSearchResults([]);
        actions.setHasSearched(false);
      }, 500); // Small delay to avoid clearing while user is still typing the same search

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm]);

  // Listen for candidate updates from ViewModal to update SearchView in real-time
  useEffect(() => {
    let highlightTimeoutId = null;

    const handleCandidateUpdate = (event) => {
      const { candidateId, clientJobId, updatedData } = event.detail;

      console.log('🔄 SearchView: Received candidateUpdated event', {
        candidateId,
        clientJobId,
        updatedData,
        currentSearchResultsLength: searchResults?.length || 0
      });

      // Update the search results with the new data and mark as updated
      actions.setSearchResults(prevResults => {
        // Defensive check: ensure prevResults is an array
        if (!Array.isArray(prevResults)) {
          console.error('❌ SearchView: prevResults is not an array:', typeof prevResults);
          return [];
        }

        // Don't update if there are no search results
        if (prevResults.length === 0) {
          console.log('⚠️ SearchView: No search results to update');
          return prevResults;
        }

        let updateCount = 0;
        const updatedResults = prevResults.map(result => {
          // Match by both candidateId and clientJobId for precise updates
          // This handles cases where a candidate has multiple client jobs
          const isMatch = result.candidateId === candidateId &&
            (clientJobId ? result.clientJobId === clientJobId : true);

          if (isMatch) {
            updateCount++;
            console.log('✅ SearchView: Updating result', {
              resultId: result.id,
              candidateId: result.candidateId,
              clientJobId: result.clientJobId,
              oldData: {
                profileSubmission: result.profileSubmission,
                remarks: result.remarks
              },
              newData: {
                profileSubmission: updatedData.profileSubmission,
                remarks: updatedData.remarks
              }
            });

            return {
              ...result,
              ...updatedData,
              // Update address if city/state changed
              address: updatedData.city && updatedData.state
                ? `${updatedData.city}, ${updatedData.state}, ${result.address?.split(', ')[2] || 'India'}`
                : result.address,
              // Mark as recently updated for visual indication
              isRecentlyUpdated: true,
              lastUpdateTime: Date.now()
            };
          }
          return result;
        });

        console.log(`✅ SearchView: Updated ${updateCount} result(s), total results: ${updatedResults.length}`);
        return updatedResults;
      });

      // Clear any existing highlight timeout
      if (highlightTimeoutId) {
        clearTimeout(highlightTimeoutId);
      }

      // Clear the "updated" indicator after 5 seconds
      highlightTimeoutId = setTimeout(() => {
        actions.setSearchResults(prevResults => {
          if (!Array.isArray(prevResults)) return prevResults;

          return prevResults.map(result => {
            const isMatch = result.candidateId === candidateId &&
              (clientJobId ? result.clientJobId === clientJobId : true);

            if (isMatch && result.isRecentlyUpdated) {
              return {
                ...result,
                isRecentlyUpdated: false,
                lastUpdateTime: null
              };
            }
            return result;
          });
        });
      }, 5000); // Clear after 5 seconds
    };

    window.addEventListener('candidateUpdated', handleCandidateUpdate);

    return () => {
      window.removeEventListener('candidateUpdated', handleCandidateUpdate);
      // Clear timeout on cleanup
      if (highlightTimeoutId) {
        clearTimeout(highlightTimeoutId);
      }
    };
  }, [actions]);

  // Handle ViewModal close to ensure SearchView refreshes properly
  useEffect(() => {
    // When ViewModal closes, preserve search results and table search state
    // Only clear table search if it was used for filtering within search results
    if (!state.isViewModalOpen && hasSearched) {
      // Keep search results visible and maintain any table filtering
      // This ensures search results remain after ViewModal closes
      console.log('🔍 SearchView: ViewModal closed, verifying search results:', {
        hasSearched,
        searchResultsCount: searchResults?.length || 0,
        searchResultsType: typeof searchResults,
        isArray: Array.isArray(searchResults)
      });
    }
  }, [state.isViewModalOpen, hasSearched]);  // Removed searchResults, searchTerm, currentView to prevent loops

  // Validation functions
  const validateSearchInput = (input) => {
    const trimmedInput = input.trim()

    // If input is empty, it's invalid
    if (!trimmedInput) {
      return { isValid: false, type: null }
    }

    // Split input by spaces to handle multiple search terms
    const searchTerms = trimmedInput.split(/\s+/)

    // Phone number validation: starts with 6-9, exactly 10 digits
    const phoneRegex = /^[6-9]\d{9}$/

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

    // Name validation: only letters and spaces, at least 2 characters
    const nameRegex = /^[a-zA-Z\s]{2,}$/

    // Check if any term is valid
    let hasValidTerm = false
    let types = []

    searchTerms.forEach(term => {
      if (phoneRegex.test(term)) {
        hasValidTerm = true
        types.push('mobile')
      } else if (emailRegex.test(term)) {
        hasValidTerm = true
        types.push('email')
      }
    })

    // For names, check the entire input (may contain spaces)
    // Allow name search for normal search scenarios
    if (nameRegex.test(trimmedInput)) {
      hasValidTerm = true
      types.push('name')
    }

    // For multi-term searches (like post-submission), be more flexible
    if (searchTerms.length > 1) {
      hasValidTerm = true
      types.push('multi-field')
    }

    return {
      isValid: hasValidTerm,
      type: types.length > 0 ? types.join(',') : null
    }
  }

  // Handle input change with real-time validation
  const handleSearchInputChange = (e) => {
    const value = e.target.value

    // If input is empty, clear search results and reset search state
    if (value === '') {
      actions.setSearchTerm(value)
      actions.setSearchResults([])
      actions.setHasSearched(false)
      return
    }

    // Allow more flexible input for multiple search terms
    const phoneRegex = /^[6-9]?\d{0,9}$/  // Allow partial phone numbers
    const emailRegex = /^[a-zA-Z0-9@._-]*$/  // Allow email characters
    const nameRegex = /^[a-zA-Z\s]*$/  // Allow letters and spaces
    const multiTermRegex = /^[a-zA-Z0-9@._\s-]*$/  // Allow mixed characters for multiple terms

    // Allow input if it matches any valid pattern or is a combination of valid terms
    if (phoneRegex.test(value) || emailRegex.test(value) || nameRegex.test(value) || multiTermRegex.test(value)) {
      actions.setSearchTerm(value)
    }
    // If it doesn't match any pattern, don't update the input (prevents typing)
  }

  // Post-registration search - only show results if candidates exist
  const checkDuplicatePostRegistration = async () => {
    console.log('⚠️ checkDuplicatePostRegistration called!', {
      searchTerm,
      hasSearched,
      currentSearchResultsLength: searchResults?.length || 0,
      stackTrace: new Error().stack
    });

    if (!searchTerm.trim()) return;

    try {
      // Don't auto-update NFD here - this is just a refresh, not a new search
      // NFD update happens in the main checkDuplicate function

      const backendResults = await searchCandidates(searchTerm)

      // Transform backend data to match frontend format using same structure as main search
      const transformedResults = [];
      let rowIndex = 0;

      backendResults.forEach((candidate) => {
        const formData = mapCandidateToFormData(candidate);

        // If candidate has multiple client assignments, create separate rows
        if (candidate.client_jobs && candidate.client_jobs.length > 0) {
          candidate.client_jobs.forEach((clientJob) => {
            const clientJobData = mapClientJobToFormData(clientJob);

            transformedResults.push({
              id: `${candidate.id}-${clientJob.id}`, // Unique ID for each candidate-client pair
              candidateId: candidate.id, // Original candidate ID
              clientJobId: clientJob.id, // Client job ID for filtering
              serialNo: ++rowIndex,
              executiveName: executiveName,
              executive_display: candidate.executive_display, // Pass through from backend
              candidateName: formData.candidateName,
              contactNumber1: formData.mobile1,
              contactNumber2: formData.mobile2,
              email: formData.email,
              education: formData.education,
              experience: formData.experience,
              address: `${formData.city}, ${formData.state}, ${formData.country}`,
              profileNumber: formData.profileNumber,
              lastUpdated: candidate.updated_at || candidate.created_at || "N/A",
              source: "existing",
              backendData: candidate,
              selectedClientJob: clientJob,

              // Client job specific data - now comes from dataMapper
              clientName: clientJobData.clientName,
              designation: clientJobData.designation,
              remarks: clientJobData.remarks,
              nfd: clientJobData.nfd,
              interviewFixedDate: clientJobData.interviewFixedDate,
              expectedJoiningDate: clientJobData.expectedJoiningDate,
              profileSubmission: clientJobData.profileSubmission,
              profileSubmissionDate: clientJobData.profileSubmissionDate,
              feedback: clientJobData.feedback,

              // Vendor/Client status
              vendorStatus: clientJobData.vendorStatus || "Pending",
              clientStatus: clientJobData.clientStatus || "Pending",

              // Preserve nested object for compatibility
              clientJob: {
                clientName: clientJobData.clientName || "",
                designation: clientJobData.designation || "",
                currentCtc: clientJob.current_ctc || "",
                expectedCtc: clientJob.expected_ctc || "",
                industry: clientJobData.industry || "",
                remarks: clientJobData.remarks || "",
              },
            });
          });
        } else {
          // Candidate with no client assignments
          transformedResults.push({
            id: candidate.id,
            candidateId: candidate.id,
            clientJobId: null,
            serialNo: ++rowIndex,
            executiveName: formData.executiveName || executiveName,
            executive_display: candidate.executive_display, // Pass through from backend
            candidateName: formData.candidateName,
            contactNumber1: formData.mobile1,
            contactNumber2: formData.mobile2,
            email: formData.email,
            education: formData.education,
            experience: formData.experience,
            address: `${formData.city}, ${formData.state}, ${formData.country}`,
            profileNumber: formData.profileNumber,
            lastUpdated: candidate.updated_at || candidate.created_at || "N/A",
            source: "existing",
            backendData: candidate,
            selectedClientJob: null,

            // Preserve nested object for compatibility
            clientJob: {
              clientName: "",
              designation: "",
              currentCtc: "",
              expectedCtc: "",
              industry: "",
              remarks: "",
            },
          });
        }
      });

      // Merge with submitted candidates - use candidateId for proper deduplication
      const mergedMap = new Map()
      const candidateIdMap = new Map()

      // Add backend results first
      transformedResults.forEach(c => {
        mergedMap.set(c.id, c)
        candidateIdMap.set(c.candidateId, c.id)
      })

      // Only add submitted candidates if their candidateId is not already in backend results
      submittedCandidates.forEach(c => {
        const backendEntryId = candidateIdMap.get(c.id)
        if (!backendEntryId) {
          // This candidate is not in backend results, add it
          mergedMap.set(c.id, c)
        }
        // If candidate exists in backend, skip the submitted version (prefer backend data)
      })
      const mergedCandidates = Array.from(mergedMap.values()).map((c, index) => ({
        ...c,
        serialNo: index + 1,
      }))

      // Only show search results if candidates found
      if (mergedCandidates.length > 0) {
        actions.setSearchResults(mergedCandidates)
        actions.setExistingCandidates(mergedCandidates)
        // Use toast ID to prevent duplicates in post-registration search
        toast.success(`Found ${mergedCandidates.length} candidates`, {
          id: 'post-registration-search',
          duration: 3000
        })
      } else {
        // No candidates found - stay on search view with empty results
        actions.setSearchResults([])
        toast.info("Registration successful! No duplicates found.", {
          id: 'post-registration-empty',
          duration: 3000
        })
      }
    } catch (error) {
      actions.setSearchResults([])
      toast.error("Search failed. Please try again.")
    }
  }

  const checkDuplicate = async (e) => {
    e.preventDefault()
    if (!searchTerm.trim()) {
      toast.error("Enter search term")
      return
    }

    // Validate search input
    const validation = validateSearchInput(searchTerm)
    if (!validation.isValid) {
      // Provide more specific error messages
      if (/^\d+$/.test(searchTerm.trim())) {
        if (searchTerm.trim().length < 10) {
          toast.error("Mobile number must be 10 digits")
        } else if (searchTerm.trim().length > 10) {
          toast.error("Mobile number cannot exceed 10 digits")
        } else if (!/^[6-9]/.test(searchTerm.trim())) {
          toast.error("Mobile number must start with 6, 7, 8, or 9")
        } else {
          toast.error("Enter valid mobile number")
        }
      } else if (searchTerm.includes('@')) {
        toast.error("Enter valid email address")
      } else {
        toast.error("Enter valid mobile/email/name")
      }
      return
    }

    // Clear previous search results and submitted candidates before starting new search
    actions.setSearchResults([])
    actions.setSubmittedCandidates([])

    // Determine search type for flow logic
    const isStrictSearch = validation.type.includes('mobile') || validation.type.includes('email')
    const isNormalSearch = validation.type.includes('name') || validation.type.includes('multi-field')

    actions.setHasSearched(true)
    setIsSearching(true) // Start loading

    try {
      // STEP 0: Auto-update expired NFD jobs in background (cached for 15min)
      // Run async without await for instant search UX
      autoUpdateExpiredNfd();

      // STEP 1: Search candidates from database first
      const backendResults = await searchCandidates(searchTerm)

      // Transform backend data to match frontend format using new data mapper
      // Create separate rows for each client assignment
      const transformedResults = [];
      let rowIndex = 0;

      backendResults.forEach((candidate) => {
        const formData = mapCandidateToFormData(candidate);

        // If candidate has multiple client assignments, create separate rows
        if (candidate.client_jobs && candidate.client_jobs.length > 0) {
          candidate.client_jobs.forEach((clientJob) => {
            const clientJobData = mapClientJobToFormData(clientJob);

            transformedResults.push({
              id: `${candidate.id}-${clientJob.id}`, // Unique ID for each candidate-client pair
              candidateId: candidate.id, // Original candidate ID
              clientJobId: clientJob.id, // Client job ID for filtering
              serialNo: ++rowIndex,
              executiveName: formData.executiveName || executiveName,
              executive_display: candidate.executive_display, // Pass through from backend
              candidateName: formData.candidateName,
              contactNumber1: formData.mobile1,
              contactNumber2: formData.mobile2,
              email: formData.email,
              education: formData.education,
              experience: formData.experience,
              address: `${formData.city}, ${formData.state}, ${formData.country}`,
              profileNumber: formData.profileNumber,
              lastUpdated: candidate.updated_at || candidate.created_at || "N/A",
              source: "existing",
              backendData: candidate,
              selectedClientJob: clientJob, // Store the specific client job for this row

              // Preserve nested object for compatibility
              clientJob: {
                clientName: clientJobData.clientName || "",
                designation: clientJobData.designation || "",
                currentCtc: clientJob.current_ctc || "",
                expectedCtc: clientJob.expected_ctc || "",
                industry: clientJobData.industry || "",
                remarks: clientJobData.remarks || "",
              },
            });
          });
        } else {
          // Candidate with no client assignments
          transformedResults.push({
            id: candidate.id,
            candidateId: candidate.id,
            clientJobId: null,
            serialNo: ++rowIndex,
            executiveName: formData.executiveName || executiveName,
            executive_display: candidate.executive_display, // Pass through from backend
            candidateName: formData.candidateName,
            contactNumber1: formData.mobile1,
            contactNumber2: formData.mobile2,
            email: formData.email,
            education: formData.education,
            experience: formData.experience,
            address: `${formData.city}, ${formData.state}, ${formData.country}`,
            profileNumber: formData.profileNumber,
            lastUpdated: candidate.updated_at || candidate.created_at || "N/A",
            source: "existing",
            backendData: candidate,
            selectedClientJob: null,

            // Preserve nested object for compatibility
            clientJob: {
              clientName: "",
              designation: "",
              currentCtc: "",
              expectedCtc: "",
              industry: "",
              remarks: "",
            },
          });
        }
      });


      // Combine with submitted candidates and de-duplicate by id (prefer backend)
      const mergedMap = new Map()
      transformedResults.forEach(c => mergedMap.set(c.id, c))
      submittedCandidates.forEach(c => {
        if (!mergedMap.has(c.id)) mergedMap.set(c.id, c)
      })
      const mergedCandidates = Array.from(mergedMap.values()).map((c, index) => ({
        ...c,
        serialNo: index + 1,
      }))

      // STEP 2: Show results table first (for both normal and strict search)
      actions.setSearchResults(mergedCandidates)
      actions.setExistingCandidates(mergedCandidates)

      if (mergedCandidates.length > 0) {
        // Results found - show table
        toast.success(`Found ${mergedCandidates.length} matching candidate(s)`, {
          id: 'search-results',
          duration: 3000
        })
      } else {
        // No results found - redirect to registration based on search type
        if (isStrictSearch) {
          // Strict search (mobile/email) - redirect immediately
          const preFillData = createPreFillData(searchTerm);
          actions.resetForm();
          actions.setSearchPreFillData(preFillData);
          actions.setSearchTerm("");
          actions.setCurrentView("registration");
          toast.success("Redirecting to registration form...", {
            id: 'redirect-registration',
            duration: 2000
          });
        } else if (isNormalSearch) {
          // Normal search (name) - show popup modal for registration
          setShowNoCandidateModal(true);
        }
      }
    } catch (error) {
      toast.error("Search failed. Please try again.")
    } finally {
      setIsSearching(false) // Stop loading
    }
  }

  const handleView = (candidate) => {
    actions.setSelectedCandidate(candidate)
    actions.setIsViewModalOpen(true)
  }

  const handleCandidateNameClick = (candidate) => {
    actions.setSelectedCandidateForFeedback(candidate)
    actions.setIsFeedbackModalOpen(true)
  }

  const handleCloseFeedbackModal = () => {
    actions.setIsFeedbackModalOpen(false)
    actions.setSelectedCandidateForFeedback(null)
  }

  const handleRevenueUpdate = (candidate) => {
    // Open revenue status in a new tab
    window.open(`/revenue-status/${candidate.id}`, '_blank');
  };

  // Function to mask phone number based on pattern (shows digits at indexes 0,4,6,9)
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
    if (!joiningDate) {
      return false; // No joining date, don't mask
    }

    try {
      const today = new Date();
      const joinDate = new Date(joiningDate);
      const daysDifference = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24));

      // If today - joining_date >= 100 days: show full number
      // Else: mask the number
      return daysDifference < 100;
    } catch (error) {
      console.error('Error calculating date difference:', error);
      return false; // On error, don't mask
    }
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
      maskingReason = "taken globally (no valid old joining date)";
    } else {
      // Not taken globally and no restrictions - show full
      shouldMask = false;
      maskingReason = "not taken globally";
    }

    // Debug logging
    console.log('📱 Mobile Display Logic (Global 100-day Priority):', {
      phoneNumber,
      shouldMaskByDate,
      hasGlobalOldJoiningDate,
      isTakenGlobally,
      shouldMask,
      maskingReason,
      joinedMobiles: Array.from(joinedMobiles || []),
      candidaterevenue,
      globalJoiningDates: globalJoiningDates.get(phoneNumber) || [],
      displayNumber: shouldMask ? maskPhoneNumber(phoneNumber) : phoneNumber
    });

    if (shouldMask) {
      return maskPhoneNumber(phoneNumber);
    }

    // Show full number
    return phoneNumber;
  };

  // Global functions for cross-vendor mobile number tracking (excludes Abscond)
  const getJoinedOrSelectedMobileNumbers = (searchResults) => {
    const joinedMobiles = new Set();

    if (!Array.isArray(searchResults)) return joinedMobiles;

    searchResults.forEach(candidate => {
      // Access mobile numbers from processed candidate object
      const mobile1 = candidate.contactNumber1;
      const mobile2 = candidate.contactNumber2;

      // Access profilestatus from selectedClientJob (processed data structure)
      const profileStatus = candidate.selectedClientJob?.profilestatus;

      console.log('🔍 Checking candidate for joined/selected status:', {
        candidateName: candidate.candidateName,
        mobile1,
        mobile2,
        profileStatus,
        selectedClientJob: candidate.selectedClientJob
      });

      // If this candidate is Joined or Selected, add their mobile numbers to the set
      // SPECIAL RULE: Abscond is NOT included in masking/assignment restrictions
      if (profileStatus === 'Joined' || profileStatus === 'Selected') {
        if (mobile1 && mobile1 !== '-' && mobile1.toLowerCase() !== 'null' && mobile1.toLowerCase() !== 'nil' && mobile1.trim() !== '') {
          joinedMobiles.add(mobile1);
          console.log(`✅ Added mobile ${mobile1} to joined/selected list (status: ${profileStatus})`);
        }
        if (mobile2 && mobile2 !== '-' && mobile2.toLowerCase() !== 'null' && mobile2.toLowerCase() !== 'nil' && mobile2.trim() !== '') {
          joinedMobiles.add(mobile2);
          console.log(`✅ Added mobile ${mobile2} to joined/selected list (status: ${profileStatus})`);
        }
      } else if (profileStatus === 'Abscond') {
        console.log(`🔓 Abscond candidate ${candidate.candidateName} - mobile NOT masked, assign button VISIBLE (special rule)`);
      }
    });

    console.log('📱 Joined/Selected Mobile Numbers (Abscond excluded):', Array.from(joinedMobiles));
    return joinedMobiles;
  };

  // Global function to collect all joining dates for each mobile number
  const getGlobalJoiningDates = (searchResults) => {
    const mobileJoiningDates = new Map();

    if (!Array.isArray(searchResults)) return mobileJoiningDates;

    console.log('🔍 Raw searchResults for global joining dates:', searchResults);

    searchResults.forEach((candidate, index) => {
      // Access mobile numbers from multiple possible locations
      const mobile1 = candidate.mobile1 || candidate.contactNumber1;
      const mobile2 = candidate.mobile2 || candidate.contactNumber2;

      // Try to access candidaterevenue from multiple possible locations
      let candidaterevenue = null;

      // Check direct property
      if (candidate.candidaterevenue) {
        candidaterevenue = candidate.candidaterevenue;
      }
      // Check if it's nested in backendData
      else if (candidate.backendData?.candidaterevenue) {
        candidaterevenue = candidate.backendData.candidaterevenue;
      }
      // Check if it's in originalCandidate
      else if (candidate.originalCandidate?.candidaterevenue) {
        candidaterevenue = candidate.originalCandidate.candidaterevenue;
      }

      // Get joining date for this candidate
      let joiningDate = null;
      if (candidaterevenue && Array.isArray(candidaterevenue) && candidaterevenue.length > 0) {
        const joinDate = candidaterevenue[0]?.joining_date;
        if (joinDate && joinDate !== "0000-00-00" && joinDate !== null && joinDate.trim() !== '') {
          joiningDate = joinDate;
        }
      }

      // Enhanced debug logging for each candidate
      console.log(`🔍 Processing candidate ${index + 1} for global joining dates:`, {
        candidateName: candidate.candidate_name || candidate.candidateName,
        mobile1,
        mobile2,
        'candidate.candidaterevenue': candidate.candidaterevenue,
        'candidate.backendData?.candidaterevenue': candidate.backendData?.candidaterevenue,
        'candidate.originalCandidate?.candidaterevenue': candidate.originalCandidate?.candidaterevenue,
        'found candidaterevenue': candidaterevenue,
        joiningDate,
        'full candidate keys': Object.keys(candidate)
      });

      // Store joining dates for each mobile number
      [mobile1, mobile2].forEach(mobile => {
        if (mobile && mobile !== '-' && mobile.toLowerCase() !== 'null' && mobile.toLowerCase() !== 'nil' && mobile.toLowerCase() !== 'nill' && mobile.trim() !== '') {
          if (!mobileJoiningDates.has(mobile)) {
            mobileJoiningDates.set(mobile, []);
          }
          if (joiningDate) {
            mobileJoiningDates.get(mobile).push(joiningDate);
            console.log(`✅ Added joining date ${joiningDate} for mobile ${mobile}`);
          }
        }
      });
    });

    console.log('📅 Global Joining Dates by Mobile:', Object.fromEntries(mobileJoiningDates));
    return mobileJoiningDates;
  };

  // Check if any joining date for this mobile number is > 100 days old
  const hasValidOldJoiningDate = (mobileNumber, globalJoiningDates) => {
    if (!mobileNumber || !globalJoiningDates.has(mobileNumber)) {
      console.log(`❌ Mobile ${mobileNumber} not found in global joining dates`);
      return false;
    }

    const joiningDates = globalJoiningDates.get(mobileNumber);
    console.log(`🔍 Checking joining dates for mobile ${mobileNumber}:`, joiningDates);

    for (const joiningDate of joiningDates) {
      try {
        const today = new Date();
        const joinDate = new Date(joiningDate);
        const daysDifference = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24));

        console.log(`📅 Date check for ${mobileNumber}: ${joiningDate} → ${daysDifference} days ago`);

        if (daysDifference >= 100) {
          console.log(`✅ Mobile ${mobileNumber} has valid old joining date: ${joiningDate} (${daysDifference} days ago)`);
          return true;
        } else {
          console.log(`⏰ Mobile ${mobileNumber} joining date too recent: ${joiningDate} (${daysDifference} days ago, need 100+)`);
        }
      } catch (error) {
        console.error('Error calculating date difference:', error);
      }
    }

    console.log(`❌ Mobile ${mobileNumber} has no joining dates > 100 days old`);
    return false;
  };

  const isMobileNumberTaken = (mobileNumber, joinedMobiles) => {
    if (!mobileNumber || !joinedMobiles) return false;
    return joinedMobiles.has(mobileNumber);
  };

  // Check if a candidate is assignable (matches backend logic)
  const isAssignable = (candidate) => {
    const clientJob = candidate?.selectedClientJob;
    if (!clientJob) return false; // No client job means not assignable

    const latestRemarks = getLatestFeedbackData(clientJob, 'remarks');
    const nfdDate = clientJob.next_follow_up_date;

    // Check if remarks are explicitly 'open profile'
    if (latestRemarks && latestRemarks.toLowerCase() === 'open profile') {
      return true;
    }

    // Check if NFD is null/empty/undefined (no follow-up date means assignable)
    if (!nfdDate || nfdDate === null || nfdDate === undefined || nfdDate.toString().trim() === '') {
      return true; // No NFD means assignable
    }

    // NFD expiry check - matches backend logic (NFD + 1 day)
    try {
      const currentDate = new Date();
      const nfdDateObj = new Date(nfdDate);

      // Backend logic: NFD expires at NFD date + 1 day (next day at 00:00)
      const expiryDate = new Date(nfdDateObj);
      expiryDate.setDate(expiryDate.getDate() + 1); // Add 1 day
      expiryDate.setHours(0, 0, 0, 0); // Set to start of day

      // NFD is expired if current time >= expiry date
      if (currentDate >= expiryDate) {
        return true;
      }
    } catch (error) {
      console.log('Error parsing NFD date:', error);
    }

    // If NFD is not expired, it's not assignable
    return false;
  };

  const handleAssign = (candidate) => {
    console.log('🎯 handleAssign called with candidate:', candidate);

    // Get latest remarks from feedback and NFD from database field
    const clientJob = candidate?.selectedClientJob;
    if (!clientJob) {
      console.log('❌ No client job found for candidate');
      toast.error('Cannot assign candidate - No client job information found');
      return;
    }

    const latestRemarks = getLatestFeedbackData(clientJob, 'remarks');
    const nfdDate = clientJob.next_follow_up_date;

    console.log('🎯 Latest remarks:', latestRemarks);
    console.log('🎯 NFD Date (from DB):', nfdDate);
    console.log('🎯 Client job:', clientJob);

    // Check if candidate profile is open for assignment
    if (!isAssignable(candidate)) {
      console.log('❌ Assignment blocked - profile not assignable');
      toast.error('Cannot assign candidate - Profile must be "open profile" status or have expired NFD');
      return;
    }

    console.log('✅ Opening assignment modal...');
    // Open assignment modal
    setSelectedCandidateForAssign(candidate);
    setIsAssignModalOpen(true);
    console.log('✅ Modal state set to open');
  };

  const handleDelete = async (candidate) => {
    if (candidate.source === "submitted") {
      // Remove candidate from submittedCandidates and search results table
      const updatedSubmitted = submittedCandidates.filter(c => c.id !== candidate.id)
      actions.setSubmittedCandidates(updatedSubmitted)
      const updatedResults = searchResults.filter(c => c.id !== candidate.id)
      actions.setSearchResults(updatedResults)
      toast.success(`${candidate.candidateName} deleted successfully`)
    } else {
      // Delete from backend using new integration service
      try {
        await deleteCandidate(candidate.id)
        // Remove from search results
        const updatedResults = searchResults.filter(c => c.id !== candidate.id)
        actions.setSearchResults(updatedResults)
        toast.success(`${candidate.candidateName} deleted successfully`)
      } catch (error) {
        console.error("Error deleting candidate:", error)
        toast.error("Error deleting candidate. Please try again.")
      }
    }
  }

  // const handleTestConnection = async () => {
  //   try {
  //     const results = await runAllTests();
  //     if (results.connection.success && results.search.success) {
  //       toast.success('Backend connection test successful!');
  //     } else {
  //       toast.error('Backend connection test failed. Check console for details.');
  //     }
  //   } catch (error) {
  //     console.error('Test failed:', error);
  //     toast.error('Test failed. Check console for details.');
  //   }
  // };

  const startRegistration = () => {
    // Create pre-fill data from search term if available
    const preFillData = searchTerm ? createPreFillData(searchTerm) : null;

    // Start registration with pre-fill data from search
    actions.resetForm();
    actions.setSearchPreFillData(preFillData);
    actions.setSearchTerm("");
    actions.setCurrentView("registration");
    toast.success("Redirecting to registration form...");
  };

  // Filter results based on table search - ensure searchResults is always an array
  const safeSearchResults = Array.isArray(searchResults) ? searchResults : [];

  // Get global list of joined/selected mobile numbers for cross-vendor rules (excludes Abscond)
  const joinedMobiles = getJoinedOrSelectedMobileNumbers(safeSearchResults);

  // Get global joining dates for each mobile number
  const globalJoiningDates = getGlobalJoiningDates(safeSearchResults);

  // Sort candidates by remarks priority: Joined first, then Abscond, then others
  const sortedByRemarks = [...safeSearchResults].sort((a, b) => {
    const remarksA = (a.selectedClientJob?.effective_remark || a.selectedClientJob?.remarks || a.remarks || '').toLowerCase();
    const remarksB = (b.selectedClientJob?.effective_remark || b.selectedClientJob?.remarks || b.remarks || '').toLowerCase();

    // Priority order: Joined (1), Abscond (2), Others (3)
    const getPriority = (remarks) => {
      if (remarks === 'joined') return 1;
      if (remarks === 'abscond') return 2;
      return 3;
    };

    return getPriority(remarksA) - getPriority(remarksB);
  }).map((candidate, index) => ({
    ...candidate,
    serialNo: index + 1  // Reassign serial numbers after sorting
  }));

  const finalDisplayedCandidates = sortedByRemarks.filter((candidate) => {
    // If no table search query, show all search results
    if (!tableSearchQuery.trim()) return true

    const searchLower = tableSearchQuery.toLowerCase()

    // Get client job data
    const clientJob = candidate?.selectedClientJob || candidate?.clientJob || {};

    return (
      // Basic candidate info
      candidate.candidateName?.toLowerCase().includes(searchLower) ||
      candidate.email?.toLowerCase().includes(searchLower) ||
      candidate.contactNumber1?.includes(searchLower) ||
      candidate.contactNumber2?.includes(searchLower) ||
      candidate.executiveName?.toLowerCase().includes(searchLower) ||
      candidate.executive_display?.toLowerCase().includes(searchLower) ||

      // Location
      candidate.city?.toLowerCase().includes(searchLower) ||
      candidate.state?.toLowerCase().includes(searchLower) ||
      candidate.address?.toLowerCase().includes(searchLower) ||

      // Education & Experience
      candidate.education?.toLowerCase().includes(searchLower) ||
      candidate.experience?.toLowerCase().includes(searchLower) ||

      // Skills & Languages
      candidate.skills?.toLowerCase().includes(searchLower) ||
      candidate.languages?.toLowerCase().includes(searchLower) ||

      // Client Job info
      clientJob.clientName?.toLowerCase().includes(searchLower) ||
      clientJob.designation?.toLowerCase().includes(searchLower) ||
      clientJob.effective_remark?.toLowerCase().includes(searchLower) ||
      clientJob.remarks?.toLowerCase().includes(searchLower) ||
      clientJob.feedback?.toLowerCase().includes(searchLower) ||

      // CTC & Salary
      candidate.currentCtc?.toString().includes(searchLower) ||
      candidate.expectedCtc?.toString().includes(searchLower) ||
      clientJob.current_ctc?.toString().includes(searchLower) ||
      clientJob.expected_ctc?.toString().includes(searchLower)
    )
  })

  // Pagination calculations
  const totalPages = Math.ceil(finalDisplayedCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, finalDisplayedCandidates.length);
  const paginatedCandidates = finalDisplayedCandidates.slice(startIndex, endIndex);

  // Reset to page 1 when search results change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchResults, tableSearchQuery]);

  // Show loading state during initial data fetch
  if (isInitialLoading) {
    return null;
  }

  return (
    <motion.div
      key="search-view"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col"
        style={hasSearched && paginatedCandidates.length > 5 ? { height: 'calc(100vh - 100px)' } : {}}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h2 className="text-lg font-medium text-gray-900">Duplicate Check Details</h2>
          </div>
        </div>

        {/* Main Search Form */}
        <div className="px-6 py-4">
          <form onSubmit={checkDuplicate} className="flex items-center space-x-4">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchInputChange}
              className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter candidate name, phone, or email..."
            />
            <button
              type="submit"
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:ring-offset-2 font-medium"
            >
              Submit
            </button>
            {/* <button
              type="button"
              onClick={handleTestConnection}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-2 font-medium"
            >
              Test Connection
            </button> */}
          </form>
        </div>


        {/* Sticky Header - Table Controls */}
        <div className="px-3 py-2 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left: Show dropdown */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-gray-700">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page
                }}
                className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value={10}>10 entries</option>
                <option value={25}>25 entries</option>
                <option value={50}>50 entries</option>
                <option value={100}>100 entries</option>
              </select>
            </div>

            {/* Center: Showing entries */}
            <div className="text-xs text-gray-700 font-medium text-center">
              {!hasSearched
                ? "Enter search term to find candidates"
                : `Showing ${finalDisplayedCandidates.length ? `${startIndex + 1}-${endIndex}` : '0-0'} of ${finalDisplayedCandidates.length} entries`
              }
            </div>

            {/* Right: Search box */}
            <div className="flex items-center space-x-2">
              <label htmlFor="table-search" className="text-xs font-medium text-gray-700">Search:</label>
              <input
                id="table-search"
                type="text"
                value={tableSearchQuery}
                onChange={(e) => actions.setTableSearchQuery(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs w-48"
                placeholder="Search..."
              />
            </div>
          </div>
        </div>

        {/* Scrollable Table Body */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* Table head */}
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-1.5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  S.No
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Executive Info
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate Info
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personal Info
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Info
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remarks
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            {/* Table body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {hasSearched && paginatedCandidates.length > 0 ? (
                paginatedCandidates.map((candidate) => (
                  <tr key={`${candidate.id}-${candidate.selectedClientJob?.id || 'no-job'}`} className={`hover:bg-gray-50 mb-2 transition-all duration-300 ${candidate.isRecentlyUpdated
                    ? 'bg-green-50 border-l-4 border-l-green-500 shadow-sm'
                    : ''
                    }`}>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-gray-200">
                      <div className="flex items-center space-x-2">
                        <span>{candidate.serialNo}</span>
                        {candidate.isRecentlyUpdated && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                            UPDATED
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Executive Info */}
                    <td className="px-2 py-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <div className="rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shadow-md border-2 border-gray-200">
                            <User className="w-6 h-6" />
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {/* Display executive name from backend - now returns full name only */}
                            {candidate.executive_display || candidate.executiveName || "-"}
                          </div>
                          {/* Created Date from candidate table */}
                          <div className="text-xs text-gray-500">
                            <span className="font-medium">Created:</span> {(() => {
                              const createdDate = candidate.candidateCreatedDate ||
                                candidate.created_at ||
                                candidate.createdAt ||
                                candidate.dateCreated ||
                                candidate.candidateData?.created_at ||
                                candidate.backendData?.created_at;

                              return createdDate ? new Date(createdDate).toLocaleDateString('en-IN') : "-";
                            })()}
                          </div>

                          {/* Updated Date from client jobs table */}
                          <div className="text-xs">
                            <span className="font-medium text-gray-500">Updated:</span> {(() => {
                              // Get updated_at directly from the client job record
                              const clientJob = candidate?.selectedClientJob;
                              const updatedDate = clientJob?.updated_at;

                              // Get the latest call status from feedback
                              const feedback = clientJob?.feedback || '';
                              let callStatus = '';

                              // Parse the feedback to get the latest call status
                              if (feedback) {
                                const feedbackEntries = feedback.split(';;;;;;;');
                                if (feedbackEntries.length > 0) {
                                  const latestEntry = feedbackEntries[feedbackEntries.length - 1];
                                  const callStatusMatch = latestEntry.match(/CallStatus-([^:]+)/);
                                  if (callStatusMatch) {
                                    callStatus = callStatusMatch[1].trim();
                                  }
                                }
                              }

                              // Determine color based on call status
                              const dateColor = callStatus === 'call answered'
                                ? 'text-green-600 font-semibold'
                                : callStatus === 'call not answered'
                                  ? 'text-red-600 font-semibold'
                                  : 'text-gray-500';

                              return (
                                <span className={dateColor}>
                                  {updatedDate ? new Date(updatedDate).toLocaleDateString('en-IN') : "-"}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Candidate Info */}
                    <td className="px-4 py-1">
                      <div className="space-y-1 text-xs text-gray-700">
                        <div
                          className={`font-medium text-sm cursor-pointer hover:underline ${(() => {
                            const remarks = (candidate.selectedClientJob?.effective_remark || candidate.selectedClientJob?.remarks || candidate.remarks || '').toLowerCase();
                            const remarkSource = candidate.selectedClientJob?.remark_source;

                            // Only apply special colors if remark comes from profilestatus
                            if (remarkSource === 'profilestatus') {
                              if (remarks === 'joined') return 'text-green-600 hover:text-green-800';
                              if (remarks === 'abscond') return 'text-red-600 hover:text-red-800';
                            }

                            // Default blue for all other cases (remarks field or no special status)
                            return 'text-blue-600 hover:text-blue-800';
                          })()
                            }`}
                          onClick={() => handleCandidateNameClick(candidate)}
                          title={(() => {
                            const remarks = (candidate.selectedClientJob?.effective_remark || candidate.selectedClientJob?.remarks || candidate.remarks || '').toLowerCase();
                            const remarkSource = candidate.selectedClientJob?.remark_source;
                            const hasClaimedRevenue = candidate.backendData?.candidaterevenue?.some(rev => {
                              return rev.revenue_status?.toLowerCase() === 'claimed';
                            });

                            // Show no title if conditions for $$$ are met, otherwise show default tooltip
                            return (remarkSource === 'profilestatus' && remarks === 'joined' && hasClaimedRevenue)
                              ? 'Cleared'
                              : 'Click to view feedback and details';
                          })()}
                        >
                          {displayValue(candidate.candidateName)}
                          {(() => {
                            const remarks = (candidate.selectedClientJob?.effective_remark || candidate.selectedClientJob?.remarks || candidate.remarks || '').toLowerCase();
                            const remarkSource = candidate.selectedClientJob?.remark_source;

                            // Check if status is 'joined' and revenue status is 'claimed'
                            const hasClaimedRevenue = candidate.backendData?.candidaterevenue?.some(rev => {
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
                            return '';
                          })()}
                        </div>
                        <div className="flex items-center gap-1 relative">
                          {(() => {
                            const id = candidate.candidateId || candidate.id;
                            const open = openWhatsappFor === id;
                            return (
                              <button
                                className="inline-flex items-center justify-center w-5 h-5 mr-1 rounded hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (open) {
                                    setOpenWhatsappFor(null);
                                    return;
                                  }
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setWaMenuPos({ x: rect.left, y: rect.bottom });
                                  setOpenWhatsappFor(id);
                                }}
                                title="WhatsApp options"
                              >
                                <Phone className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                            );
                          })()}
                          {(() => {
                            const phone1 = candidate.contactNumber1;

                            // Get candidaterevenue for 100-day rule
                            const candidaterevenue = candidate.candidaterevenue ||
                              candidate.backendData?.candidaterevenue ||
                              candidate.originalCandidate?.candidaterevenue;

                            const displayPhone1 = getDisplayMobileNumber(phone1, joinedMobiles, candidaterevenue, globalJoiningDates);
                            const isValid1 = phone1 &&
                              phone1 !== '-' &&
                              phone1.toLowerCase() !== 'null' &&
                              phone1.toLowerCase() !== 'nill' &&
                              phone1.toLowerCase() !== 'nil' &&
                              phone1.trim() !== '';
                            // Create hover tooltip when 100 days are NOT over (mobile is masked) OR for Abscond status
                            const profileStatus = candidate.selectedClientJob?.profilestatus;
                            const joiningDate = candidaterevenue?.[0]?.joining_date;

                            // Check if mobile is masked (100 days not over) OR if it's Abscond status
                            const isMasked = displayPhone1?.includes('x') || false; // If phone contains 'x', it's masked
                            const isAbscond = profileStatus === 'Abscond';

                            let hoverTitle = "Phone number";

                            // Check if this mobile number is taken globally (Joined/Selected anywhere)
                            const isTakenGlobally = isMobileNumberTaken(phone1, joinedMobiles);

                            // Check if this mobile number has Abscond status anywhere
                            const hasAbscondGlobally = safeSearchResults.some(c =>
                              (c.contactNumber1 === phone1 || c.contactNumber2 === phone1) &&
                              c.selectedClientJob?.profilestatus === 'Abscond'
                            );

                            // Show warning hover if mobile is masked OR Abscond OR taken globally OR has Abscond globally
                            if (isMasked || isAbscond || isTakenGlobally || hasAbscondGlobally) {
                              const clientName = candidate.clientJob?.clientName || candidate.selectedClientJob?.clientName || 'Unknown Client';

                              if (profileStatus === 'Joined' && joiningDate && joiningDate !== "0000-00-00") {
                                const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
                                hoverTitle = isMasked ?
                                  `${candidate.candidateName} joined on ${formattedDate} in ${clientName}, Don't contact ` :
                                  `${candidate.candidateName} joined on ${formattedDate} in ${clientName}`;
                              } else if (profileStatus === 'Abscond' && joiningDate && joiningDate !== "0000-00-00") {
                                const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
                                hoverTitle = `${candidate.candidateName} joined on ${formattedDate} in ${clientName} but absconded`;
                              } else if (profileStatus === 'Selected') {
                                hoverTitle = `${candidate.candidateName} is selected in ${clientName}, Don't contact `;
                              } else if (isTakenGlobally || hasAbscondGlobally) {
                                // Find the joining details from other rows with same mobile number (Joined or Abscond)
                                const joinedCandidate = safeSearchResults.find(c =>
                                  (c.contactNumber1 === phone1 || c.contactNumber2 === phone1) &&
                                  c.selectedClientJob?.profilestatus === 'Joined'
                                );

                                const abscondCandidate = safeSearchResults.find(c =>
                                  (c.contactNumber1 === phone1 || c.contactNumber2 === phone1) &&
                                  c.selectedClientJob?.profilestatus === 'Abscond'
                                );

                                if (joinedCandidate) {
                                  const joinedCandidateRevenue = joinedCandidate.candidaterevenue ||
                                    joinedCandidate.backendData?.candidaterevenue ||
                                    joinedCandidate.originalCandidate?.candidaterevenue;
                                  const joinedDate = joinedCandidateRevenue?.[0]?.joining_date;
                                  const joinedClientName = joinedCandidate.clientJob?.clientName || joinedCandidate.selectedClientJob?.clientName || 'Unknown Client';

                                  if (joinedDate && joinedDate !== "0000-00-00") {
                                    const formattedDate = new Date(joinedDate).toLocaleDateString('en-IN');
                                    hoverTitle = `${candidate.candidateName} joined on ${formattedDate} in ${joinedClientName}, Don't contact `;
                                  } else {
                                    hoverTitle = `${candidate.candidateName} is joined, Don't contact `;
                                  }
                                } else if (abscondCandidate) {
                                  const abscondCandidateRevenue = abscondCandidate.candidaterevenue ||
                                    abscondCandidate.backendData?.candidaterevenue ||
                                    abscondCandidate.originalCandidate?.candidaterevenue;
                                  const abscondDate = abscondCandidateRevenue?.[0]?.joining_date;
                                  const abscondClientName = abscondCandidate.clientJob?.clientName || abscondCandidate.selectedClientJob?.clientName || 'Unknown Client';

                                  if (abscondDate && abscondDate !== "0000-00-00") {
                                    const formattedDate = new Date(abscondDate).toLocaleDateString('en-IN');
                                    hoverTitle = `${candidate.candidateName} joined on ${formattedDate} in ${abscondClientName} but absconded`;
                                  } else {
                                    hoverTitle = `${candidate.candidateName} absconded`;
                                  }
                                } else {
                                  hoverTitle = `${candidate.candidateName} is joined/selected elsewhere`;
                                }
                              }
                            }

                            return isValid1 ? (
                              <span
                                className={`${isMasked ? 'text-gray-400' : ''}`}
                                title={hoverTitle}
                              >
                                {displayValue(displayPhone1)}
                              </span>
                            ) : (
                              <span className="text-black" title={hoverTitle}>{displayValue(displayPhone1)}</span>
                            );
                          })()}
                          {(() => {
                            const phone2 = candidate.contactNumber2;

                            // Get candidaterevenue for 100-day rule
                            const candidaterevenue = candidate.candidaterevenue ||
                              candidate.backendData?.candidaterevenue ||
                              candidate.originalCandidate?.candidaterevenue;

                            const displayPhone2 = getDisplayMobileNumber(phone2, joinedMobiles, candidaterevenue, globalJoiningDates);
                            const isValid2 = phone2 &&
                              phone2 !== '-' &&
                              phone2.toLowerCase() !== 'null' &&
                              phone2.toLowerCase() !== 'nill' &&
                              phone2.toLowerCase() !== 'nil' &&
                              phone2.trim() !== '';
                            // Create hover tooltip for phone2 when 100 days are NOT over (mobile is masked) OR for Abscond status
                            const profileStatus2 = candidate.selectedClientJob?.profilestatus;
                            const joiningDate2 = candidaterevenue?.[0]?.joining_date;

                            // Check if mobile is masked (100 days not over) OR if it's Abscond status
                            const isMasked2 = displayPhone2?.includes('x') || false; // If phone contains 'x', it's masked
                            const isAbscond2 = profileStatus2 === 'Abscond';

                            let hoverTitle2 = "Phone number";

                            // Check if this mobile number is taken globally (Joined/Selected anywhere)
                            const isTakenGlobally2 = isMobileNumberTaken(phone2, joinedMobiles);

                            // Check if this mobile number has Abscond status anywhere
                            const hasAbscondGlobally2 = safeSearchResults.some(c =>
                              (c.contactNumber1 === phone2 || c.contactNumber2 === phone2) &&
                              c.selectedClientJob?.profilestatus === 'Abscond'
                            );

                            // Show warning hover if mobile is masked OR Abscond OR taken globally OR has Abscond globally
                            if (isMasked2 || isAbscond2 || isTakenGlobally2 || hasAbscondGlobally2) {
                              const clientName2 = candidate.clientJob?.clientName || candidate.selectedClientJob?.clientName || 'Unknown Client';

                              if (profileStatus2 === 'Joined' && joiningDate2 && joiningDate2 !== "0000-00-00") {
                                const formattedDate2 = new Date(joiningDate2).toLocaleDateString('en-IN');
                                hoverTitle2 = isMasked2 ?
                                  `${candidate.candidateName} joined on ${formattedDate2} in ${clientName2}, Don't contact ` :
                                  `${candidate.candidateName} joined on ${formattedDate2} in ${clientName2}`;
                              } else if (profileStatus2 === 'Abscond' && joiningDate2 && joiningDate2 !== "0000-00-00") {
                                const formattedDate2 = new Date(joiningDate2).toLocaleDateString('en-IN');
                                hoverTitle2 = `${candidate.candidateName} joined on ${formattedDate2} in ${clientName2} but absconded`;
                              } else if (profileStatus2 === 'Selected') {
                                hoverTitle2 = `${candidate.candidateName} is selected in ${clientName2}, Don't contact `;
                              } else if (isTakenGlobally2 || hasAbscondGlobally2) {
                                // Find the joining details from other rows with same mobile number (Joined or Abscond)
                                const joinedCandidate2 = safeSearchResults.find(c =>
                                  (c.contactNumber1 === phone2 || c.contactNumber2 === phone2) &&
                                  c.selectedClientJob?.profilestatus === 'Joined'
                                );

                                const abscondCandidate2 = safeSearchResults.find(c =>
                                  (c.contactNumber1 === phone2 || c.contactNumber2 === phone2) &&
                                  c.selectedClientJob?.profilestatus === 'Abscond'
                                );

                                if (joinedCandidate2) {
                                  const joinedCandidateRevenue2 = joinedCandidate2.candidaterevenue ||
                                    joinedCandidate2.backendData?.candidaterevenue ||
                                    joinedCandidate2.originalCandidate?.candidaterevenue;
                                  const joinedDate2 = joinedCandidateRevenue2?.[0]?.joining_date;
                                  const joinedClientName2 = joinedCandidate2.clientJob?.clientName || joinedCandidate2.selectedClientJob?.clientName || 'Unknown Client';

                                  if (joinedDate2 && joinedDate2 !== "0000-00-00") {
                                    const formattedDate2 = new Date(joinedDate2).toLocaleDateString('en-IN');
                                    hoverTitle2 = `${candidate.candidateName} joined on ${formattedDate2} in ${joinedClientName2}, Don't contact `;
                                  } else {
                                    hoverTitle2 = `${candidate.candidateName} is joined/selected elsewhere, Don't contact `;
                                  }
                                } else if (abscondCandidate2) {
                                  const abscondCandidateRevenue2 = abscondCandidate2.candidaterevenue ||
                                    abscondCandidate2.backendData?.candidaterevenue ||
                                    abscondCandidate2.originalCandidate?.candidaterevenue;
                                  const abscondDate2 = abscondCandidateRevenue2?.[0]?.joining_date;
                                  const abscondClientName2 = abscondCandidate2.clientJob?.clientName || abscondCandidate2.selectedClientJob?.clientName || 'Unknown Client';

                                  if (abscondDate2 && abscondDate2 !== "0000-00-00") {
                                    const formattedDate2 = new Date(abscondDate2).toLocaleDateString('en-IN');
                                    hoverTitle2 = `${candidate.candidateName} joined on ${formattedDate2} in ${abscondClientName2} but absconded`;
                                  } else {
                                    hoverTitle2 = `${candidate.candidateName} absconded`;
                                  }
                                } else {
                                  hoverTitle2 = `${candidate.candidateName} is joined/selected elsewhere, Don't contact `;
                                }
                              }
                            }

                            return isValid2 ? (
                              <>
                                <span> / </span>
                                <span
                                  className={`${isMasked2 ? 'text-gray-400' : ''}`}
                                  title={hoverTitle2}
                                >
                                  {displayValue(displayPhone2)}
                                </span>
                              </>
                            ) : null;
                          })()}
                          {(() => {
                            const id = candidate.candidateId || candidate.id;
                            const phone1 = candidate.contactNumber1;
                            const phone2 = candidate.contactNumber2;
                            const candidaterevenue = candidate.candidaterevenue ||
                              candidate.backendData?.candidaterevenue ||
                              candidate.originalCandidate?.candidaterevenue;
                            const displayPhone1 = getDisplayMobileNumber(phone1, joinedMobiles, candidaterevenue, globalJoiningDates);
                            const displayPhone2 = getDisplayMobileNumber(phone2, joinedMobiles, candidaterevenue, globalJoiningDates);
                            const isValid1 = phone1 && phone1 !== '-' && phone1.toLowerCase() !== 'null' && phone1.toLowerCase() !== 'nill' && phone1.toLowerCase() !== 'nil' && phone1.trim() !== '';
                            const isValid2 = phone2 && phone2 !== '-' && phone2.toLowerCase() !== 'null' && phone2.toLowerCase() !== 'nill' && phone2.toLowerCase() !== 'nil' && phone2.trim() !== '';
                            const isMasked1 = displayPhone1?.includes('x') || false;
                            const isMasked2 = displayPhone2?.includes('x') || false;
                            const open = openWhatsappFor === id;
                            if (!open) return null;
                            return (
                              <div className="fixed z-50 bg-white border border-gray-200 rounded shadow-md py-1 text-xs" style={{ left: waMenuPos.x, top: waMenuPos.y }}>
                                {isValid1 ? (
                                  <div
                                    className={`${isMasked1 ? 'text-gray-400 cursor-not-allowed px-3 py-1' : 'px-3 py-1 hover:bg-gray-50 cursor-pointer text-green-600'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isMasked1) {
                                        const clientName = candidate.clientJob?.clientName || candidate.selectedClientJob?.clientName || 'Unknown Client';
                                        const profileStatus = candidate.selectedClientJob?.profilestatus || '';
                                        const joiningDate = (candidate.candidaterevenue || candidate.backendData?.candidaterevenue || candidate.originalCandidate?.candidaterevenue)?.[0]?.joining_date;
                                        
                                        let errorMessage = `${candidate.candidateName || 'This candidate'}'s number is not available`;
                                        
                                        if (profileStatus === 'Joined' && joiningDate && joiningDate !== "0000-00-00") {
                                          const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
                                          errorMessage = `${candidate.candidateName} joined on ${formattedDate} in ${clientName}. Don't call.`;
                                        } else if (profileStatus === 'Abscond' && joiningDate && joiningDate !== "0000-00-00") {
                                          const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
                                          errorMessage = `${candidate.candidateName} absconded from ${clientName} on ${formattedDate}.Don't call.`;
                                        } else if (profileStatus === 'Selected') {
                                          errorMessage = `${candidate.candidateName} is selected in ${clientName}. Don't call.`;
                                        }
                                        
                                        toast.error(errorMessage);
                                        return;
                                      }
                                      const num = (phone1 || '').replace(/\D/g, '');
                                      if (!num) {
                                        toast.error('Invalid number');
                                        return;
                                      }
                                      window.open(`https://wa.me/91${num}`, '_blank');
                                      setOpenWhatsappFor(null);
                                    }}
                                  >
                                    {`P1:${isMasked1 ? displayPhone1 : (phone1 || '').replace(/\D/g, '')}`}
                                  </div>
                                ) : null}
                                {isValid2 ? (
                                  <div
                                    className={`${isMasked2 ? 'text-gray-400 cursor-not-allowed px-3 py-1' : 'px-3 py-1 hover:bg-gray-50 cursor-pointer text-green-600'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isMasked2) {
                                        const clientName = candidate.clientJob?.clientName || candidate.selectedClientJob?.clientName || 'Unknown Client';
                                        const profileStatus = candidate.selectedClientJob?.profilestatus || '';
                                        const joiningDate = (candidate.candidaterevenue || candidate.backendData?.candidaterevenue || candidate.originalCandidate?.candidaterevenue)?.[0]?.joining_date;
                                        
                                        let errorMessage = `${candidate.candidateName || 'This candidate'}'s number is not available`;
                                        
                                        if (profileStatus === 'Joined' && joiningDate && joiningDate !== "0000-00-00") {
                                          const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
                                          errorMessage = `${candidate.candidateName} joined on ${formattedDate} in ${clientName}. Cannot open WhatsApp.`;
                                        } else if (profileStatus === 'Abscond' && joiningDate && joiningDate !== "0000-00-00") {
                                          const formattedDate = new Date(joiningDate).toLocaleDateString('en-IN');
                                          errorMessage = `${candidate.candidateName} absconded from ${clientName} on ${formattedDate}. Cannot open WhatsApp.`;
                                        } else if (profileStatus === 'Selected') {
                                          errorMessage = `${candidate.candidateName} is selected in ${clientName}. Cannot open WhatsApp.`;
                                        }
                                        
                                        toast.error(errorMessage);
                                        return;
                                      }
                                      const num = (phone2 || '').replace(/\D/g, '');
                                      if (!num) {
                                        toast.error('Invalid number');
                                        return;
                                      }
                                      window.open(`https://wa.me/91${num}`, '_blank');
                                      setOpenWhatsappFor(null);
                                    }}
                                  >
                                    {`P2: ${isMasked2 ? displayPhone2 : (phone2 || '').replace(/\D/g, '')}`}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="truncate max-w-[180px] flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {displayValue(candidate.email)}
                        </div>
                      </div>
                    </td>
                    {/* Personal Info */}
                    <td className="px-4 py-1 text-xs text-gray-700">
                      <div className="space-y-1">
                        <div>
                          <strong>Education:</strong> {displayValue(candidate.education)}
                        </div>
                        <div>
                          <strong>Experience:</strong> {displayValue(candidate.experience)}
                        </div>
                        <div>
                          <strong>Location:</strong> {displayValue(candidate.address)}
                        </div>
                      </div>
                    </td>

                    {/* Job Info */}
                    <td className="px-4 py-1 text-xs text-gray-700">
                      <div className="space-y-1">
                        <div>
                          <strong>Client:</strong> {displayValue(candidate.clientJob?.clientName)}
                        </div>
                        <div>
                          <strong>Designation:</strong> {displayValue(candidate.clientJob?.designation)}
                        </div>
                        <div>
                          <strong>C-CTC:</strong> {formatCTC(candidate.selectedClientJob?.current_ctc || candidate.clientJob?.currentCtc)} &nbsp;&nbsp;
                          <strong>E-CTC:</strong> {formatCTC(candidate.selectedClientJob?.expected_ctc || candidate.clientJob?.expectedCtc)}
                        </div>

                      </div>
                    </td>

                    {/* Remarks - Current Status */}
                    <td className="px-4 py-1 text-xs text-gray-700">
                      <div className="space-y-1">
                        {(() => {
                          // Get client job for this row
                          const clientJob = candidate.selectedClientJob;

                          // Extract latest feedback data from client job
                          const latestRemarks = getLatestFeedbackData(clientJob, 'remarks');
                          const latestNfdDate = getLatestFeedbackData(clientJob, 'nfd');
                          // Use actual database fields for dates instead of feedback parsing
                          const latestEjdDate = clientJob?.expected_joining_date || getLatestFeedbackData(clientJob, 'ejd');
                          const latestIfdDate = clientJob?.interview_date || getLatestFeedbackData(clientJob, 'ifd');

                          return (
                            <>
                              {/* Current Status from Remarks Field */}
                              <div className="flex items-center gap-2">
                                <strong>Remarks:</strong>
                                <span className={(() => {
                                  const remarks = (clientJob?.effective_remark || clientJob?.remarks || '').toLowerCase();
                                  const remarkSource = clientJob?.remark_source;

                                  // Only apply colors if remark comes from profilestatus
                                  if (remarkSource === 'profilestatus') {
                                    if (remarks === 'joined') return 'text-green-600 font-semibold';
                                    if (remarks === 'selected') return 'text-green-600 font-semibold';
                                    if (remarks === 'abscond') return 'text-red-600 font-semibold';
                                    if (isAssignable(candidate)) return 'text-green-600 font-semibold';
                                  }

                                  // Plain text for remarks from 'remarks' field or no source
                                  return 'text-gray-700';
                                })()}>
                                  {clientJob?.effective_remark || clientJob?.remarks || 'No remarks'}
                                </span>

                              </div>
                              {/* Conditional Date Display Based on Profile Status */}
                              {(() => {
                                const profileStatus = clientJob?.profilestatus;
                                const isSelectedOrJoined = profileStatus === 'Selected' || profileStatus === 'Joined';
                                const isAbscond = profileStatus === 'Abscond';
                                const isProfileStatusEmpty = !profileStatus || profileStatus.trim() === '';

                                // SCENARIO 1: profilestatus = "Abscond" (SPECIAL HANDLING)
                                if (isAbscond) {
                                  // Show BOTH Joining Date (DOJ) and Abscond Date
                                  const joiningDate = candidate.candidaterevenue?.[0]?.joining_date ||
                                    candidate.backendData?.candidaterevenue?.[0]?.joining_date ||
                                    candidate.originalCandidate?.candidaterevenue?.[0]?.joining_date;

                                  // Show abscond date as N/A (not available in database)
                                  const abscondDate = "N/A";

                                  console.log('🔴 Abscond Status - Special Display:', {
                                    candidateName: candidate.candidateName,
                                    profileStatus,
                                    joiningDate,
                                    abscondDate,
                                    message: 'Hiding NFD/IFD/EJD, showing DOJ and Abscond Date in red'
                                  });

                                  return (
                                    <div className="space-y-1">
                                      {/* DOJ (Date of Joining) */}
                                      {joiningDate && joiningDate !== "0000-00-00" && (
                                        <div>
                                          <strong>DOJ:</strong>
                                          <span className="text-red-600 hover:text-red-800 font-semibold">
                                            {new Date(joiningDate).toLocaleDateString('en-IN')}
                                          </span>
                                        </div>
                                      )}

                                      {/* Abscond Date */}
                                      <div>
                                        <strong>Abscond Date:</strong>
                                        <span className="text-red-600 hover:text-red-800 font-semibold">
                                          {abscondDate}
                                        </span>
                                      </div>

                                      {/* If no DOJ available, show status message */}
                                      {(!joiningDate || joiningDate === "0000-00-00") && (
                                        <div>
                                          <span className="text-red-600 hover:text-red-800 font-semibold">
                                            (No DOJ Available)
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                // SCENARIO 2: profilestatus = "Selected" OR "Joined"
                                if (isSelectedOrJoined) {
                                  // Show Joining Date from candidaterevenue if available
                                  // Try multiple possible paths for the revenue data
                                  const joiningDate = candidate.candidaterevenue?.[0]?.joining_date ||
                                    candidate.backendData?.candidaterevenue?.[0]?.joining_date ||
                                    candidate.originalCandidate?.candidaterevenue?.[0]?.joining_date;

                                  // Debug logging
                                  console.log('🔍 Debug Joining Date:', {
                                    profileStatus,
                                    'candidate.candidaterevenue': candidate.candidaterevenue,
                                    'candidate.backendData': candidate.backendData,
                                    'candidate.originalCandidate': candidate.originalCandidate,
                                    joiningDate,
                                    candidateName: candidate.candidateName,
                                    fullCandidate: candidate
                                  });

                                  if (joiningDate) {
                                    return (
                                      <div>
                                        <strong>Joining Date:</strong>
                                        <span className="text-green-600 font-semibold">
                                          {new Date(joiningDate).toLocaleDateString('en-IN')}
                                        </span>
                                      </div>
                                    );
                                  }
                                  // If no joining date, hide this section completely
                                  return null;
                                }

                                // SCENARIO 2: profilestatus is NULL or EMPTY STRING
                                // SCENARIO: profilestatus is NULL or EMPTY STRING → Only show NFD, IFD, EJD



                                // Default case: Show all dates (for other profilestatus values)
                                return (
                                  <>
                                    {/* NFD Display */}
                                    {(() => {
                                      const nfdDate = clientJob?.next_follow_up_date;

                                      if (!nfdDate || nfdDate === '-' || nfdDate.trim() === '') {
                                        return (
                                          <div>
                                            <strong>NFD:</strong>
                                            <span className="text-orange-600 font-semibold">
                                              Open Profile
                                            </span>
                                          </div>
                                        );
                                      }

                                      const isNfdExpired = (() => {
                                        try {
                                          const currentDate = new Date();
                                          const nfdDateObj = new Date(nfdDate);
                                          const nfdExpiryDate = new Date(nfdDateObj);
                                          nfdExpiryDate.setDate(nfdExpiryDate.getDate() + 1);
                                          return currentDate > nfdExpiryDate;
                                        } catch {
                                          return false;
                                        }
                                      })();

                                      return (
                                        <div>
                                          <strong>NFD:</strong>
                                          <span className={isNfdExpired ? 'text-orange-600 font-semibold' : 'text-blue-600 font-semibold'}>
                                            {(() => {
                                              try {
                                                const formattedDate = new Date(nfdDate).toLocaleDateString('en-IN');
                                                return isNfdExpired ? `${formattedDate} (Open Profile)` : formattedDate;
                                              } catch {
                                                return nfdDate;
                                              }
                                            })()}
                                          </span>
                                        </div>
                                      );
                                    })()}

                                    {/* IFD Display */}
                                    {latestIfdDate && latestIfdDate !== '-' && (
                                      <div>
                                        <strong>IFD:</strong> {new Date(latestIfdDate).toLocaleDateString('en-IN')}
                                      </div>
                                    )}

                                    {/* EJD Display */}
                                    {latestEjdDate && latestEjdDate !== '-' && (
                                      <div>
                                        <strong>EJD:</strong> {new Date(latestEjdDate).toLocaleDateString('en-IN')}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}

                              {/* Source of Candidate */}
                              <div>
                                <strong>Source:</strong>
                                <span className="text-gray-700">
                                  {(() => {
                                    const source = candidate.originalCandidate?.source ||
                                      candidate.originalCandidate?.source_of_candidate ||
                                      candidate.backendData?.source_of_candidate ||
                                      candidate.backendData?.source ||
                                      candidate.selectedClientJob?.source_of_candidate ||
                                      candidate.source;

                                    if (source && source !== '-' && source.trim() !== '' && source !== 'Unknown Source') {
                                      return source;
                                    }
                                    return 'N/A';
                                  })()}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-2 py-1 text-center">
                      <div className="flex justify-center space-x-1">
                        {/* Assign Button - Only show when NFD has expired or profile is open, and mobile number not taken globally (except for CEO) */}
                        {(() => {
                          // Check if candidate is assignable (open profile or expired NFD)
                          const canAssign = isAssignable(candidate);

                          // For CEO users, skip the mobile number check
                          const isCEO = user?.userRole === 'ceo';

                          // For non-CEO users, check if mobile numbers are taken
                          if (!isCEO) {
                            const mobile1 = candidate.contactNumber1;
                            const mobile2 = candidate.contactNumber2;
                            const isMobile1Taken = isMobileNumberTaken(mobile1, joinedMobiles);
                            const isMobile2Taken = isMobileNumberTaken(mobile2, joinedMobiles);

                            if (isMobile1Taken || isMobile2Taken) {
                              console.log('🚫 Assign button hidden - Mobile number taken globally:', {
                                candidateName: candidate.candidateName,
                                mobile1,
                                mobile2,
                                isMobile1Taken,
                                isMobile2Taken
                              });
                              return null; // Don't show assign button if mobile is taken anywhere for non-CEO users
                            }
                          }

                          // Only render the assign button if candidate is assignable
                          if (!canAssign) {
                            return null;
                          }

                          return (
                            <button
                              onClick={() => handleAssign(candidate)}
                              className="p-1 rounded-full hover:bg-red-100/50 group transition-all duration-300"
                              title={isCEO ? "Assign Candidate (CEO Override)" : "Assign Candidate"}
                            >
                              <DraftingCompass
                                className="w-4 h-4 group-hover:scale-110 text-red-500 group-hover:text-red-600"
                              />
                            </button>
                          );
                        })()}
                        {/* Revenue Update Button - Only show for L5-CEO */}
                        {(user?.userRole === 'L5' || user?.userRole === 'ceo') && (
                          <button
                            onClick={() => handleRevenueUpdate(candidate)}
                            className="p-1 rounded-full hover:bg-green-100/50 group transition-all duration-300"
                            title="Revenue Update"
                          >
                            <IndianRupee className="w-4 h-4 text-green-500 group-hover:text-green-600 group-hover:scale-110" />
                          </button>
                        )}

                        {/* View Button - Opens in new tab */}
                        <Link
                          to={`/view-candidate/${candidate.candidateId || candidate.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-full hover:bg-blue-100/50 group transition-all duration-300 inline-flex items-center"
                          title="View Details (Opens in new tab)"
                        >
                          <Eye className="w-4 h-4 text-blue-600 group-hover:text-blue-700 group-hover:scale-110" />
                        </Link>


                      </div>

                    </td>
                  </tr>
                ))
              ) : isSearching ? (
                <tr>
                  <td colSpan="6" className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-600 border-b-blue-600 border-l-transparent border-r-transparent mb-4"></div>
                      <p className="text-lg text-gray-600 font-medium">Searching candidates...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">
                    No candidates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-3 py-2">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-600">
                  Showing{' '}
                  <span className="font-medium text-gray-900">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium text-gray-900">
                    {Math.min(currentPage * itemsPerPage, finalDisplayedCandidates.length)}
                  </span>{' '}
                  of <span className="font-medium text-gray-900">{finalDisplayedCandidates.length}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <ChevronLeft className="h-3.5 w-3.5 -ml-1.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>

                  {(() => {
                    const pages = [];
                    const siblings = 1;
                    const showLeftEllipsis = currentPage > siblings + 2;
                    const showRightEllipsis = currentPage < totalPages - (siblings + 1);
                    const startPage = Math.max(2, currentPage - siblings);
                    const endPage = Math.min(totalPages - 1, currentPage + siblings);

                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className={`relative inline-flex items-center px-3 py-1.5 text-xs font-medium ${currentPage === 1
                          ? 'z-10 bg-blue-600 text-white'
                          : 'text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                          }`}
                      >
                        1
                      </button>
                    );

                    if (showLeftEllipsis) {
                      pages.push(
                        <span key="ellipsis-left" className="relative inline-flex items-center px-3 py-1.5 text-xs text-gray-700 ring-1 ring-gray-300 ring-inset">
                          ...
                        </span>
                      );
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`relative inline-flex items-center px-3 py-1.5 text-xs font-medium ${i === currentPage
                            ? 'z-10 bg-blue-600 text-white'
                            : 'text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                            }`}
                        >
                          {i}
                        </button>
                      );
                    }

                    if (showRightEllipsis) {
                      pages.push(
                        <span key="ellipsis-right" className="relative inline-flex items-center px-3 py-1.5 text-xs text-gray-700 ring-1 ring-gray-300 ring-inset">
                          ...
                        </span>
                      );
                    }

                    if (totalPages > 1) {
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className={`relative inline-flex items-center px-3 py-1.5 text-xs font-medium ${currentPage === totalPages
                            ? 'z-10 bg-blue-600 text-white'
                            : 'text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                            }`}
                        >
                          {totalPages}
                        </button>
                      );
                    }

                    return pages;
                  })()}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    <ChevronRight className="h-3.5 w-3.5 -ml-1.5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-orange-500 transition-all duration-300"
            style={{ width: hasSearched && finalDisplayedCandidates.length > 0 ? "100%" : "0%" }}
          ></div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={handleCloseFeedbackModal}
        candidate={selectedCandidateForFeedback}
        clientJobId={selectedCandidateForFeedback?.clientJobId}
      />

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <AssignModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedCandidateForAssign(null);
          }}
          candidate={selectedCandidateForAssign}
          onAssignmentSuccess={async (result) => {
            console.log('🔄 Assignment successful, refreshing search results...');

            // Lightweight refresh without NFD auto-update (assignment already handled NFD)
            if (searchTerm.trim()) {
              // Re-run only the search to get updated data (skip NFD auto-update)
              const backendResults = await searchCandidates(searchTerm);

              // Transform and update results (same logic as checkDuplicate but without NFD update)
              const transformedResults = [];
              let rowIndex = 0;

              backendResults.forEach((candidate) => {
                const formData = mapCandidateToFormData(candidate);

                if (candidate.client_jobs && candidate.client_jobs.length > 0) {
                  candidate.client_jobs.forEach((clientJob) => {
                    const clientJobData = mapClientJobToFormData(clientJob);
                    transformedResults.push({
                      ...formData,
                      ...clientJobData,
                      selectedClientJob: clientJob,
                      backendData: candidate,
                      rowIndex: rowIndex++,
                      uniqueKey: `${candidate.id}-${clientJob.id}-${rowIndex}`
                    });
                  });
                } else {
                  transformedResults.push({
                    ...formData,
                    selectedClientJob: null,
                    backendData: candidate,
                    rowIndex: rowIndex++,
                    uniqueKey: `${candidate.id}-no-job-${rowIndex}`
                  });
                }
              });

              actions.setSearchResults(transformedResults);
            } else {
              // Load all candidates if no search term
              await loadCandidates();
            }

            console.log('✅ Search results refreshed after assignment (lightweight)');
          }}
        />
      )}


      {/* No Candidate Found Modal */}
      {showNoCandidateModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <svg className="h-12 w-12 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Candidates Found</h3>
              <p className="text-gray-600 mb-4">
                We searched our database for "<strong>{searchTerm}</strong>" but couldn't find any matching candidates.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Would you like to register this as a new candidate?
              </p>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={() => setShowNoCandidateModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowNoCandidateModal(false);
                    const preFillData = createPreFillData(searchTerm);
                    actions.resetForm();
                    actions.setSearchPreFillData(preFillData);
                    actions.setSearchTerm("");
                    actions.setCurrentView("registration");
                    toast.success("Redirecting to registration form...", {
                      duration: 2000
                    });
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium transition-colors"
                >
                  Register New Candidate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SearchView;